import type {
  GameState,
  ProductionKind,
  ResourceKey,
  ResourceSet,
  ScoutQualityTier,
  UnitDef,
} from "../types/game";
import {
  ALL_FACILITY_DEFS_BY_ID,
  ALL_UNIT_DEFS_BY_ID,
  facilitiesForClub,
  isUniqueItemId,
  unitsForClub,
} from "../data/clubUniques";
import { RESEARCH_BY_ID } from "../data/research";
import { RESOURCE_LABELS } from "./resources";
import { hasClubRink } from "./rinkSystem";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";
import { spawnProducedScout } from "./scoutSystem";
import { spawnProducedBuilder } from "./builderSystem";
import { scoutTierCost } from "./scoutStaff";

// Club HQ produces one thing at a time — a facility OR a unit — from the same
// slot. The FULL cost (Funds + any hockeyKnowledge) is charged upfront when
// production starts (Polytopia-style, DECISIONS D30); the slot then works the
// item for its buildMonths.

export function productionItemName(kind: ProductionKind, itemId: string): string {
  return kind === "facility"
    ? ALL_FACILITY_DEFS_BY_ID[itemId]?.name ?? itemId
    : ALL_UNIT_DEFS_BY_ID[itemId]?.name ?? itemId;
}

// The item's full Funds price (charged upfront at start).
export function productionFundsCost(kind: ProductionKind, itemId: string): number {
  const cost =
    kind === "facility" ? ALL_FACILITY_DEFS_BY_ID[itemId]?.cost : ALL_UNIT_DEFS_BY_ID[itemId]?.cost;
  return cost?.funds ?? 0;
}

// The full cost charged when production starts (reputation is a standing stat
// and should never appear as a cost). A scout quality tier scales the funds
// price (D29 hybrid acquisition).
export function productionUpfrontCost(
  kind: ProductionKind,
  itemId: string,
  scoutTier?: ScoutQualityTier,
): Partial<ResourceSet> {
  const cost =
    kind === "facility" ? ALL_FACILITY_DEFS_BY_ID[itemId]?.cost : ALL_UNIT_DEFS_BY_ID[itemId]?.cost;
  if (!cost) return {};
  const upfront: Partial<ResourceSet> = {};
  if (cost.funds) {
    upfront.funds = scoutTier ? scoutTierCost(cost.funds, scoutTier) : cost.funds;
  }
  if (cost.hockeyKnowledge) upfront.hockeyKnowledge = cost.hockeyKnowledge;
  return upfront;
}

export function canAffordUpfront(
  state: GameState,
  kind: ProductionKind,
  itemId: string,
  scoutTier?: ScoutQualityTier,
): boolean {
  const upfront = productionUpfrontCost(kind, itemId, scoutTier);
  return (Object.entries(upfront) as [ResourceKey, number][]).every(
    ([res, amt]) => state.resources[res] >= amt,
  );
}

// A requiredAnyOf entry can be a tech id, a facility id, or the pseudo-id
// "club-rink" (>=1 Level-1 rink inside the club's HQ radius).
function anyOfEntryMet(state: GameState, id: string): boolean {
  if (id === "club-rink") return hasClubRink(state.world);
  return state.completedResearch.includes(id) || state.facilities.includes(id);
}

// Whether a unit's tech/facility requirements are satisfied.
export function unitRequirementsMet(state: GameState, def: UnitDef): boolean {
  const techOk = (def.requiredTechIds ?? []).every((id) =>
    state.completedResearch.includes(id),
  );
  const facOk = (def.requiredFacilityIds ?? []).every((id) =>
    state.facilities.includes(id),
  );
  const anyOk =
    !def.requiredAnyOf ||
    def.requiredAnyOf.length === 0 ||
    def.requiredAnyOf.some((id) => anyOfEntryMet(state, id));
  return techOk && facOk && anyOk;
}

// Can the player start this item right now? (slot free, prereqs met, affordable,
// and — for facilities — not already built.)
export function canStartProduction(
  state: GameState,
  kind: ProductionKind,
  itemId: string,
): boolean {
  if (state.activeProduction) return false;
  if (!canAffordUpfront(state, kind, itemId)) return false;
  if (kind === "facility") {
    const def = ALL_FACILITY_DEFS_BY_ID[itemId];
    return !!def && !state.facilities.includes(itemId);
  }
  const def = ALL_UNIT_DEFS_BY_ID[itemId];
  return !!def && unitRequirementsMet(state, def);
}

// Start producing an item: validate, charge the full cost, open the slot.
// `scoutTier` only applies to scout-spawning units (ignored otherwise).
export function startProduction(
  state: GameState,
  kind: ProductionKind,
  itemId: string,
  scoutTier?: ScoutQualityTier,
): GameState {
  const def =
    kind === "facility" ? ALL_FACILITY_DEFS_BY_ID[itemId] : ALL_UNIT_DEFS_BY_ID[itemId];
  const isScoutUnit = kind === "unit" && (def as UnitDef | undefined)?.spawnsMapUnit === "scout";
  const tier = isScoutUnit ? (scoutTier ?? "volunteer") : undefined;

  if (!canStartProduction(state, kind, itemId)) return state;
  if (tier && !canAffordUpfront(state, kind, itemId, tier)) return state;

  const upfront = productionUpfrontCost(kind, itemId, tier);
  const resources = { ...state.resources };
  for (const [res, amt] of Object.entries(upfront) as [ResourceKey, number][]) {
    resources[res] = Math.max(0, resources[res] - amt);
  }

  const months = Math.max(1, def?.buildMonths ?? 1);

  return {
    ...state,
    resources,
    activeProduction: {
      kind,
      itemId,
      monthsRemaining: months,
      totalMonths: months,
      ...(tier ? { scoutTier: tier } : {}),
    },
  };
}

// A production pick can be taken back until the first End Turn starts the
// work. The full cost charged on start is refunded.
export function canCancelProduction(state: GameState): boolean {
  return (
    !!state.activeProduction &&
    state.activeProduction.monthsRemaining === state.activeProduction.totalMonths
  );
}

export function cancelProduction(state: GameState): GameState {
  if (!canCancelProduction(state)) return state;
  const prod = state.activeProduction!;
  const upfront = productionUpfrontCost(prod.kind, prod.itemId, prod.scoutTier);
  const resources = { ...state.resources };
  for (const [res, amt] of Object.entries(upfront) as [ResourceKey, number][]) {
    resources[res] += amt;
  }
  return { ...state, resources, activeProduction: null };
}

// Advance the active item by one month of work (the cost was paid on start).
export function progressProduction(draft: GameState, push: PushLog): void {
  const prod = draft.activeProduction;
  if (!prod) return;

  const name = productionItemName(prod.kind, prod.itemId);
  prod.monthsRemaining -= 1;

  if (prod.monthsRemaining > 0) {
    push(
      "build",
      `${name} underway`,
      `${name} is ${prod.monthsRemaining} month${
        prod.monthsRemaining === 1 ? "" : "s"
      } from completion.`,
    );
    return;
  }

  // Completed.
  draft.activeProduction = null;
  if (prod.kind === "facility") {
    completeFacility(draft, prod.itemId, push);
  } else {
    completeUnit(draft, prod.itemId, push, prod.scoutTier);
  }
}

function completeFacility(draft: GameState, facilityId: string, push: PushLog): void {
  const def = ALL_FACILITY_DEFS_BY_ID[facilityId];
  if (!def) return;
  draft.facilities.push(def.id);
  push("build", `${def.name} completed`, def.flavor);
  for (const unlock of def.unlocks) {
    if (unlock.type === "card") grantCard(draft, unlock.cardId, push);
    // cardPool / other unlocks are handled by discovery & event systems later.
  }
}

function completeUnit(
  draft: GameState,
  unitId: string,
  push: PushLog,
  scoutTier?: ScoutQualityTier,
): void {
  const def = ALL_UNIT_DEFS_BY_ID[unitId];
  if (!def) return;
  const instanceId = `${def.id}-${draft.month}-${draft.units.length}`;
  draft.units.push({
    id: instanceId,
    unitDefId: def.id,
    name: def.name,
    status: "available",
    locationId: draft.world?.hqTile ? "hq" : undefined,
    createdMonth: draft.month,
  });
  if (def.spawnsMapUnit === "scout") {
    spawnProducedScout(draft, instanceId, def.name, scoutTier ?? "volunteer");
  } else if (def.spawnsMapUnit === "builder") {
    spawnProducedBuilder(draft, instanceId, def.name, def.id);
  }
  push("build", `${def.name} ready`, def.flavor);
  for (const unlock of def.unlocks ?? []) {
    if (unlock.type === "card") grantCard(draft, unlock.cardId, push);
  }
}

// ---------------------------------------------------------------------------
// Production-chooser data (drives the ProductionPanel UI).
// ---------------------------------------------------------------------------

export type ProductionStatus = "available" | "locked" | "active" | "built";

export type ProductionOption = {
  kind: ProductionKind;
  id: string;
  name: string;
  categoryLabel: string;
  description: string;
  fundsCost: number;
  upfrontCost: Partial<ResourceSet>;
  buildMonths: number;
  flavor: string;
  effectSummary: string;
  requirementText: string;
  status: ProductionStatus;
  lockReason?: string;
  affordable: boolean;
  // Club-unique unit/facility (replaces or extends the base list).
  isUnique: boolean;
  // Unit spawns a map scout — offers the quality-tier picker (D29).
  spawnsScout?: boolean;
};

export type ProductionOptions = {
  facilities: ProductionOption[];
  units: ProductionOption[];
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Friendly name for a tech-or-facility requirement id (handles not-yet-built
// future techs by humanizing the id).
function prettyReqLabel(id: string): string {
  return (
    RESEARCH_BY_ID[id]?.name ??
    ALL_FACILITY_DEFS_BY_ID[id]?.name ??
    id.split("-").map(titleCase).join(" ")
  );
}

function facilityEffectSummary(facilityId: string): string {
  const def = ALL_FACILITY_DEFS_BY_ID[facilityId];
  if (!def) return "";
  const parts = def.effects.map((e) => {
    if (e.type === "monthlyIncome")
      return `+${e.amount} ${RESOURCE_LABELS[e.resource]}/mo`;
    if (e.type === "equipmentPerMonth") return `+${e.amount} Equipment/mo`;
    if (e.type === "unlockRecruitment") return "Unlocks basic recruitment";
    return "Improves local recruitment events";
  });
  return parts.length ? parts.join(" · ") : "New club capability";
}

function unitRequirementText(def: UnitDef): string {
  const all = [
    ...(def.requiredTechIds ?? []),
    ...(def.requiredFacilityIds ?? []),
  ].map(prettyReqLabel);
  const any = (def.requiredAnyOf ?? []).map(prettyReqLabel);
  const clauses: string[] = [];
  if (all.length) clauses.push(all.join(" + "));
  if (any.length) clauses.push(any.join(" or "));
  return clauses.length ? `Requires ${clauses.join(", ")}` : "No requirements";
}

function unitLockReason(state: GameState, def: UnitDef): string | undefined {
  const missing: string[] = [];
  for (const id of def.requiredTechIds ?? []) {
    if (!state.completedResearch.includes(id)) missing.push(prettyReqLabel(id));
  }
  for (const id of def.requiredFacilityIds ?? []) {
    if (!state.facilities.includes(id)) missing.push(prettyReqLabel(id));
  }
  if (
    def.requiredAnyOf &&
    def.requiredAnyOf.length > 0 &&
    !def.requiredAnyOf.some(
      (id) => state.completedResearch.includes(id) || state.facilities.includes(id),
    )
  ) {
    missing.push(def.requiredAnyOf.map(prettyReqLabel).join(" or "));
  }
  return missing.length ? `Needs ${missing.join(", ")}` : undefined;
}

function facilityOption(state: GameState, facilityId: string): ProductionOption {
  const def = ALL_FACILITY_DEFS_BY_ID[facilityId];
  const active =
    state.activeProduction?.kind === "facility" &&
    state.activeProduction.itemId === facilityId;
  const built = state.facilities.includes(facilityId);
  const status: ProductionStatus = built ? "built" : active ? "active" : "available";
  return {
    kind: "facility",
    id: facilityId,
    name: def.name,
    categoryLabel: "Facility",
    description: def.description,
    fundsCost: productionFundsCost("facility", facilityId),
    upfrontCost: productionUpfrontCost("facility", facilityId),
    buildMonths: def.buildMonths,
    flavor: def.flavor,
    effectSummary: facilityEffectSummary(facilityId),
    requirementText: "No requirements",
    status,
    affordable: canAffordUpfront(state, "facility", facilityId),
    isUnique: isUniqueItemId(facilityId),
  };
}

function unitOption(state: GameState, unitId: string): ProductionOption {
  const def = ALL_UNIT_DEFS_BY_ID[unitId];
  const active =
    state.activeProduction?.kind === "unit" &&
    state.activeProduction.itemId === unitId;
  const met = unitRequirementsMet(state, def);
  const status: ProductionStatus = active ? "active" : met ? "available" : "locked";
  return {
    kind: "unit",
    id: unitId,
    name: def.name,
    categoryLabel: `${titleCase(def.category)} · ${
      def.spawnsMapUnit ? "Map unit" : "HQ staff"
    }`,
    description: def.description,
    fundsCost: productionFundsCost("unit", unitId),
    upfrontCost: productionUpfrontCost("unit", unitId),
    buildMonths: def.buildMonths,
    flavor: def.flavor,
    effectSummary: def.abilitySummary,
    requirementText: unitRequirementText(def),
    status,
    lockReason: met ? undefined : unitLockReason(state, def),
    affordable: canAffordUpfront(state, "unit", unitId),
    isUnique: isUniqueItemId(unitId),
    spawnsScout: def.spawnsMapUnit === "scout",
  };
}

export function getProductionOptions(state: GameState): ProductionOptions {
  const clubId = state.club?.id ?? state.selectedClubId;
  return {
    facilities: facilitiesForClub(clubId).map((f) => facilityOption(state, f.id)),
    units: unitsForClub(clubId).map((u) => unitOption(state, u.id)),
  };
}

// Count of items the player could start right now (slot free, prereqs met,
// affordable, not built). Drives the "Choose production" task prompt.
export function startableProductionCount(state: GameState): number {
  const { facilities, units } = getProductionOptions(state);
  return [...facilities, ...units].filter(
    (o) => o.status === "available" && o.affordable,
  ).length;
}

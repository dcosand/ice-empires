import type {
  GameState,
  ProductionKind,
  ResourceKey,
  ResourceSet,
  UnitDef,
} from "../types/game";
import { FACILITIES, FACILITIES_BY_ID } from "../data/facilities";
import { UNITS, UNITS_BY_ID } from "../data/units";
import { RESEARCH_BY_ID } from "../data/research";
import { RESOURCE_LABELS } from "./resources";
import { getMonthlyIncome } from "./selectors";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";

// Club HQ produces one thing at a time — a facility OR a unit — from the same
// slot. Operations production each month funds the item (see DECISIONS.md D2);
// any non-Operations cost (Budget/Reputation) is charged upfront on start.

const OPERATIONS: ResourceKey = "operations";

export function productionItemName(kind: ProductionKind, itemId: string): string {
  return kind === "facility"
    ? FACILITIES_BY_ID[itemId]?.name ?? itemId
    : UNITS_BY_ID[itemId]?.name ?? itemId;
}

// The Operations production total needed to complete the item.
export function productionOpsCost(kind: ProductionKind, itemId: string): number {
  const cost =
    kind === "facility" ? FACILITIES_BY_ID[itemId]?.cost : UNITS_BY_ID[itemId]?.cost;
  return cost?.operations ?? 0;
}

// Non-Operations cost paid upfront when production starts (units only, today).
export function productionUpfrontCost(
  kind: ProductionKind,
  itemId: string,
): Partial<ResourceSet> {
  const cost =
    kind === "facility" ? FACILITIES_BY_ID[itemId]?.cost : UNITS_BY_ID[itemId]?.cost;
  if (!cost) return {};
  const upfront: Partial<ResourceSet> = {};
  if (cost.budget) upfront.budget = cost.budget;
  if (cost.reputation) upfront.reputation = cost.reputation;
  if (cost.hockeyKnowledge) upfront.hockeyKnowledge = cost.hockeyKnowledge;
  return upfront;
}

export function canAffordUpfront(
  state: GameState,
  kind: ProductionKind,
  itemId: string,
): boolean {
  const upfront = productionUpfrontCost(kind, itemId);
  return (Object.entries(upfront) as [ResourceKey, number][]).every(
    ([res, amt]) => state.resources[res] >= amt,
  );
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
    def.requiredAnyOf.some(
      (id) => state.completedResearch.includes(id) || state.facilities.includes(id),
    );
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
    const def = FACILITIES_BY_ID[itemId];
    return !!def && !state.facilities.includes(itemId);
  }
  const def = UNITS_BY_ID[itemId];
  return !!def && unitRequirementsMet(state, def);
}

// Start producing an item: validate, charge upfront resources, open the slot.
export function startProduction(
  state: GameState,
  kind: ProductionKind,
  itemId: string,
): GameState {
  if (!canStartProduction(state, kind, itemId)) return state;

  const upfront = productionUpfrontCost(kind, itemId);
  const resources = { ...state.resources };
  for (const [res, amt] of Object.entries(upfront) as [ResourceKey, number][]) {
    resources[res] = Math.max(0, resources[res] - amt);
  }

  return {
    ...state,
    resources,
    activeProduction: {
      kind,
      itemId,
      operationsRemaining: productionOpsCost(kind, itemId),
      progressOperations: 0,
    },
  };
}

// Apply this month's Operations production toward the active item.
export function progressProduction(draft: GameState, push: PushLog): void {
  const prod = draft.activeProduction;
  if (!prod) return;

  const name = productionItemName(prod.kind, prod.itemId);
  const cost = productionOpsCost(prod.kind, prod.itemId);
  if (cost <= 0) {
    // Malformed item — drop it rather than loop forever.
    draft.activeProduction = null;
    return;
  }

  const opsPerMonth = getMonthlyIncome(draft)[OPERATIONS];
  prod.progressOperations += opsPerMonth;
  prod.operationsRemaining = Math.max(0, cost - prod.progressOperations);

  if (prod.progressOperations < cost) {
    push(
      "build",
      `${name} underway`,
      `${name} is ${Math.round(
        (prod.progressOperations / cost) * 100,
      )}% complete (${prod.progressOperations}/${cost} Operations).`,
    );
    return;
  }

  // Completed.
  draft.activeProduction = null;
  if (prod.kind === "facility") {
    completeFacility(draft, prod.itemId, push);
  } else {
    completeUnit(draft, prod.itemId, push);
  }
}

function completeFacility(draft: GameState, facilityId: string, push: PushLog): void {
  const def = FACILITIES_BY_ID[facilityId];
  if (!def) return;
  draft.facilities.push(def.id);
  push("build", `${def.name} completed`, def.flavor);
  for (const unlock of def.unlocks) {
    if (unlock.type === "card") grantCard(draft, unlock.cardId, push);
    // cardPool / other unlocks are handled by discovery & event systems later.
  }
}

function completeUnit(draft: GameState, unitId: string, push: PushLog): void {
  const def = UNITS_BY_ID[unitId];
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
  opsCost: number;
  upfrontCost: Partial<ResourceSet>;
  buildMonths: number;
  flavor: string;
  effectSummary: string;
  requirementText: string;
  status: ProductionStatus;
  lockReason?: string;
  affordable: boolean;
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
    FACILITIES_BY_ID[id]?.name ??
    id.split("-").map(titleCase).join(" ")
  );
}

function facilityEffectSummary(facilityId: string): string {
  const def = FACILITIES_BY_ID[facilityId];
  if (!def) return "";
  const parts = def.effects.map((e) => {
    if (e.type === "monthlyIncome")
      return `+${e.amount} ${RESOURCE_LABELS[e.resource]}/mo`;
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
  const def = FACILITIES_BY_ID[facilityId];
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
    opsCost: productionOpsCost("facility", facilityId),
    upfrontCost: productionUpfrontCost("facility", facilityId),
    buildMonths: def.buildMonths,
    flavor: def.flavor,
    effectSummary: facilityEffectSummary(facilityId),
    requirementText: "No requirements",
    status,
    affordable: canAffordUpfront(state, "facility", facilityId),
  };
}

function unitOption(state: GameState, unitId: string): ProductionOption {
  const def = UNITS_BY_ID[unitId];
  const active =
    state.activeProduction?.kind === "unit" &&
    state.activeProduction.itemId === unitId;
  const met = unitRequirementsMet(state, def);
  const status: ProductionStatus = active ? "active" : met ? "available" : "locked";
  return {
    kind: "unit",
    id: unitId,
    name: def.name,
    categoryLabel: titleCase(def.category),
    description: def.description,
    opsCost: productionOpsCost("unit", unitId),
    upfrontCost: productionUpfrontCost("unit", unitId),
    buildMonths: def.buildMonths,
    flavor: def.flavor,
    effectSummary: def.abilitySummary,
    requirementText: unitRequirementText(def),
    status,
    lockReason: met ? undefined : unitLockReason(state, def),
    affordable: canAffordUpfront(state, "unit", unitId),
  };
}

export function getProductionOptions(state: GameState): ProductionOptions {
  return {
    facilities: FACILITIES.map((f) => facilityOption(state, f.id)),
    units: UNITS.map((u) => unitOption(state, u.id)),
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

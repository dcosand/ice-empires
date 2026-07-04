import type {
  EraRequirementId,
  FacilityDef,
  GameState,
  ResearchDef,
  ResourceSet,
} from "../types/game";
import { FACILITIES } from "../data/facilities";
import {
  ALL_FACILITY_DEFS_BY_ID,
  ALL_UNIT_DEFS_BY_ID,
} from "../data/clubUniques";
import { RESEARCH, RESEARCH_BY_ID } from "../data/research";
import { REGIONS } from "../data/regions";
import { CARDS_BY_ID } from "../data/cards";
import { ERA_REQUIREMENTS } from "../data/eras";
import { addResources, EMPTY_RESOURCES } from "./resources";
import { getClubRinks } from "./rinkSystem";
import { startableProductionCount } from "./productionSystem";
import { DISCOVERY_BY_ID } from "../data/discovery";

// Monthly income = club base + completed-facility effects + acquired-card effects.
export function getMonthlyIncome(state: GameState): ResourceSet {
  if (!state.club) return { ...EMPTY_RESOURCES };
  let income = { ...state.club.monthlyBaseIncome };

  for (const facilityId of state.facilities) {
    const facility = ALL_FACILITY_DEFS_BY_ID[facilityId];
    if (!facility) continue;
    for (const effect of facility.effects) {
      if (effect.type === "monthlyIncome") {
        income = addResources(income, { [effect.resource]: effect.amount });
      }
    }
  }

  for (const card of state.cards) {
    for (const effect of card.effects) {
      if (effect.type === "monthlyIncome") {
        income = addResources(income, { [effect.resource]: effect.amount });
      }
    }
  }

  // Owned organizational units with passive monthly-income effects.
  for (const owned of state.units) {
    const def = ALL_UNIT_DEFS_BY_ID[owned.unitDefId];
    for (const effect of def?.effects ?? []) {
      if (effect.type === "monthlyIncome") {
        income = addResources(income, { [effect.resource]: effect.amount });
      }
    }
  }

  // Influenced regions each grant Reputation/month (Exploit phase).
  const influenced = Object.values(state.discovery.regionStates).filter(
    (s) => s === "influenced",
  ).length;
  if (influenced > 0) {
    income = addResources(income, { reputation: influenced });
  }

  // Each club rink (Level >=1, inside HQ radius) yields +1 Funds/month —
  // replaces the retired Outdoor Rink facility's income.
  if (state.world) {
    const rinkCount = getClubRinks(state.world).length;
    if (rinkCount > 0) income = addResources(income, { funds: rinkCount });
  }

  // Upkeep nets against Funds income (free in the pond era; see
  // getMonthlyUpkeep). Income CAN go negative — the treasury drains.
  const upkeep = getMonthlyUpkeep(state);
  if (upkeep.total > 0) {
    income = addResources(income, { funds: -upkeep.total });
  }

  return income;
}

// Monthly upkeep in Funds. The pond era is free — everyone's a volunteer and
// the rinks are shoveled by love. From Club Formation on, the club is a real
// organization: field units beyond the first cost 1/turn (travel, sandwiches)
// and every 2 club rinks cost 1/turn (boards, water, patching).
export type UpkeepBreakdown = {
  total: number;
  units: number;
  rinks: number;
};

export function getMonthlyUpkeep(state: GameState): UpkeepBreakdown {
  if (state.eraId === "pond-hockey" || !state.world) {
    return { total: 0, units: 0, rinks: 0 };
  }
  const fieldUnits = state.world.scouts?.length
    ? state.world.scouts.length
    : state.world.scout
      ? 1
      : 0;
  const units = Math.max(0, fieldUnits - 1);
  const rinks = Math.floor(getClubRinks(state.world).length / 2);
  return { total: units + rinks, units, rinks };
}

// Equipment inventory gained each month (shed stock; not a ResourceSet key).
export function getMonthlyEquipment(state: GameState): number {
  let total = 0;
  for (const facilityId of state.facilities) {
    const facility = ALL_FACILITY_DEFS_BY_ID[facilityId];
    for (const effect of facility?.effects ?? []) {
      if (effect.type === "equipmentPerMonth") total += effect.amount;
    }
  }
  return total;
}

// Facilities that are not built and not currently building.
export function getAvailableFacilities(state: GameState): FacilityDef[] {
  return FACILITIES.filter(
    (f) =>
      !state.facilities.includes(f.id) &&
      !(
        state.activeProduction?.kind === "facility" &&
        state.activeProduction.itemId === f.id
      ),
  );
}

// Research not yet completed, not active, and with prerequisites met.
export function getAvailableResearch(state: GameState): ResearchDef[] {
  return RESEARCH.filter(
    (r) =>
      !state.completedResearch.includes(r.id) &&
      state.activeResearch?.techId !== r.id &&
      r.requiredTechIds.every((id) => state.completedResearch.includes(id)),
  );
}

// Whether the "End Turn" button is enabled: production, research, and a
// discovery priority are all chosen (or unavailable). Mirrors the gate the
// CommandRail uses so the keyboard shortcut behaves like clicking the button.
export function canEndMonth(state: GameState): boolean {
  const buildReady =
    !!state.activeProduction || startableProductionCount(state) === 0;
  const researchReady =
    !!state.activeResearch || getAvailableResearch(state).length === 0;
  const discoveryReady =
    !!DISCOVERY_BY_ID[state.discovery.activePriorityId];
  return buildReady && researchReady && discoveryReady;
}

export function getDiscoveredRegionIds(state: GameState): string[] {
  return Object.entries(state.discovery.regionStates)
    .filter(
      ([, s]) => s === "discovered" || s === "surveyed" || s === "influenced",
    )
    .map(([id]) => id);
}

export function getDiscoveredCount(state: GameState): number {
  return getDiscoveredRegionIds(state).length;
}

export function getHiddenRegionCount(state: GameState): number {
  return REGIONS.filter((r) => {
    const s = state.discovery.regionStates[r.id];
    return !s || s === "hidden";
  }).length;
}

// Era-progress requirement checklist for the CURRENT era's exit criteria.
export type EraReqStatus = {
  id: EraRequirementId;
  label: string;
  met: boolean;
};

export function getEraProgress(state: GameState): EraReqStatus[] {
  const reqs = ERA_REQUIREMENTS[state.eraId] ?? [];
  return reqs.map((req) => ({
    id: req.id,
    label: req.label,
    met: isRequirementMet(state, req.id),
  }));
}

// The "full line" check: 6+ players including a goalie, everyone geared.
export function hasFullLine(state: GameState): boolean {
  const geared = state.roster.filter((p) => p.hasEquipment);
  return geared.length >= 6 && geared.some((p) => p.position === "G");
}

export function isRequirementMet(
  state: GameState,
  id: EraRequirementId,
): boolean {
  switch (id) {
    case "rival-contact":
      return !!state.world?.rivals.some((r) => r.contacted);
    case "independent-contact":
      return !!state.world?.hockeyOrgs.some((o) => o.playerContacted);
    case "rink-built":
      return (
        !!state.world &&
        state.world.rinks.some((r) => r.level >= 1 && !r.ownerClubId)
      );
    case "rules-of-the-game":
      return state.completedResearch.includes("rules-of-the-game");
    case "full-roster":
      return hasFullLine(state);
  }
}

// An era with no requirement list defined never advances (Dynasty, and any
// later era whose exit criteria aren't designed yet).
export function allEraRequirementsMet(state: GameState): boolean {
  const reqs = ERA_REQUIREMENTS[state.eraId] ?? [];
  if (reqs.length === 0) return false;
  return reqs.every((req) => isRequirementMet(state, req.id));
}

// Production progress as a 0..1 fraction for the active item (Funds produced).
export function getActiveProductionProgress(state: GameState): number {
  const prod = state.activeProduction;
  if (!prod) return 0;
  const def =
    prod.kind === "facility"
      ? ALL_FACILITY_DEFS_BY_ID[prod.itemId]
      : ALL_UNIT_DEFS_BY_ID[prod.itemId];
  const cost = def?.cost.funds ?? 0;
  if (cost === 0) return 0;
  return prod.progressFunds / cost;
}

export function getActiveResearchProgress(state: GameState): number {
  const research = state.activeResearch;
  if (!research) return 0;
  const def = RESEARCH_BY_ID[research.techId];
  if (!def || def.cost === 0) return 0;
  return research.progressKnowledge / def.cost;
}

export const lookups = {
  facility: (id: string) => ALL_FACILITY_DEFS_BY_ID[id],
  research: (id: string) => RESEARCH_BY_ID[id],
  card: (id: string) => CARDS_BY_ID[id],
};

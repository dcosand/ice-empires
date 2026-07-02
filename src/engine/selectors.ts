import type {
  EraRequirementId,
  FacilityDef,
  GameState,
  ResearchDef,
  ResourceSet,
} from "../types/game";
import { FACILITIES, FACILITIES_BY_ID } from "../data/facilities";
import { UNITS_BY_ID } from "../data/units";
import { RESEARCH, RESEARCH_BY_ID } from "../data/research";
import { REGIONS } from "../data/regions";
import { CARDS_BY_ID } from "../data/cards";
import { ERA_REQUIREMENTS } from "../data/eras";
import { addResources, EMPTY_RESOURCES } from "./resources";
import { getClubRinks } from "./rinkSystem";

// Monthly income = club base + completed-facility effects + acquired-card effects.
export function getMonthlyIncome(state: GameState): ResourceSet {
  if (!state.club) return { ...EMPTY_RESOURCES };
  let income = { ...state.club.monthlyBaseIncome };

  for (const facilityId of state.facilities) {
    const facility = FACILITIES_BY_ID[facilityId];
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
    const def = UNITS_BY_ID[owned.unitDefId];
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

  return income;
}

// Equipment inventory gained each month (shed stock; not a ResourceSet key).
export function getMonthlyEquipment(state: GameState): number {
  let total = 0;
  for (const facilityId of state.facilities) {
    const facility = FACILITIES_BY_ID[facilityId];
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
      return !!state.world && state.world.rinks.some((r) => r.level >= 1);
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
      ? FACILITIES_BY_ID[prod.itemId]
      : UNITS_BY_ID[prod.itemId];
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
  facility: (id: string) => FACILITIES_BY_ID[id],
  research: (id: string) => RESEARCH_BY_ID[id],
  card: (id: string) => CARDS_BY_ID[id],
};

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
import { CLUB_FORMATION_REQUIREMENTS } from "../data/eras";
import { addResources, EMPTY_RESOURCES } from "./resources";

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

  return income;
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

// Era-progress requirement checklist for the Club Formation Era.
export type EraReqStatus = {
  id: EraRequirementId;
  label: string;
  met: boolean;
};

export function getEraProgress(state: GameState): EraReqStatus[] {
  return CLUB_FORMATION_REQUIREMENTS.map((req) => ({
    id: req.id,
    label: req.label,
    met: isRequirementMet(state, req.id),
  }));
}

export function isRequirementMet(
  state: GameState,
  id: EraRequirementId,
): boolean {
  switch (id) {
    case "club-founded":
      return state.club !== null;
    case "outdoor-rink-complete":
      return state.facilities.includes("outdoor-rink");
    case "research-complete":
      return state.completedResearch.length >= 1;
    case "two-regions-discovered":
      return getDiscoveredCount(state) >= 2;
    case "first-card-acquired":
      return state.cards.length >= 1;
  }
}

export function allEraRequirementsMet(state: GameState): boolean {
  return CLUB_FORMATION_REQUIREMENTS.every((req) =>
    isRequirementMet(state, req.id),
  );
}

// Production progress as a 0..1 fraction for the active item (Operations made).
export function getActiveProductionProgress(state: GameState): number {
  const prod = state.activeProduction;
  if (!prod) return 0;
  const def =
    prod.kind === "facility"
      ? FACILITIES_BY_ID[prod.itemId]
      : UNITS_BY_ID[prod.itemId];
  const cost = def?.cost.operations ?? 0;
  if (cost === 0) return 0;
  return prod.progressOperations / cost;
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

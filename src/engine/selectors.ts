import type {
  EraRequirementId,
  GameState,
  ResearchDef,
  ResourceSet,
} from "../types/game";
import {
  ALL_FACILITY_DEFS_BY_ID,
  ALL_UNIT_DEFS_BY_ID,
} from "../data/clubUniques";
import { RESEARCH } from "../data/research";
import { ERA_REQUIREMENTS } from "../data/eras";
import { addResources, EMPTY_RESOURCES } from "./resources";
import { getClubRinks } from "./rinkSystem";

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

// Research not yet completed, not active, and with prerequisites met.
export function getAvailableResearch(state: GameState): ResearchDef[] {
  return RESEARCH.filter(
    (r) =>
      !state.completedResearch.includes(r.id) &&
      state.activeResearch?.techId !== r.id &&
      r.requiredTechIds.every((id) => state.completedResearch.includes(id)),
  );
}

// Whether the "End Turn" button is enabled. Production never blocks End Turn:
// with pay-upfront costs (D30), saving funds for a bigger purchase is a
// legitimate play. Research still gates — an empty tech slot just wastes HK
// income. Shared by the CommandRail button and the Enter-key shortcut so both
// behave identically.
export function canEndMonth(state: GameState): boolean {
  const researchReady =
    !!state.activeResearch || getAvailableResearch(state).length === 0;
  return researchReady;
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

import type { GameState, ResearchBranch, ResearchDef, Unlock } from "../types/game";
import { RESEARCH, RESEARCH_BY_ID } from "../data/research";
import { ERAS, ERA_ORDER as ERA_PROGRESSION } from "../data/eras";
import { getAvailableResearch } from "./selectors";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";

// Can the club afford to research this tech right now? (Upfront HK purchase.)
export function canAffordResearch(state: GameState, techId: string): boolean {
  const def = RESEARCH_BY_ID[techId];
  return !!def && state.resources.hockeyKnowledge >= def.cost;
}

// Buy a tech: pay its full Hockey Knowledge cost up front (D56), opening the
// research slot for one turn — it unlocks NEXT turn, like a production item.
// Nothing to research while a purchase is pending (one slot at a time).
export function selectResearch(state: GameState, techId: string): GameState {
  const def = RESEARCH_BY_ID[techId];
  if (!def) return state;
  if (state.activeResearch) return state;
  if (!getAvailableResearch(state).some((r) => r.id === techId)) return state;
  if (!canAffordResearch(state, techId)) return state;

  return {
    ...state,
    resources: {
      ...state.resources,
      hockeyKnowledge: Math.max(0, state.resources.hockeyKnowledge - def.cost),
    },
    activeResearch: { techId, monthsRemaining: 1, totalMonths: 1 },
  };
}

// A research purchase can be taken back until the first End Turn starts the
// work — the HK paid on purchase is refunded.
export function canCancelResearch(state: GameState): boolean {
  return (
    !!state.activeResearch &&
    state.activeResearch.monthsRemaining === state.activeResearch.totalMonths
  );
}

export function cancelResearch(state: GameState): GameState {
  if (!canCancelResearch(state)) return state;
  const def = RESEARCH_BY_ID[state.activeResearch!.techId];
  const refund = def?.cost ?? 0;
  return {
    ...state,
    resources: {
      ...state.resources,
      hockeyKnowledge: state.resources.hockeyKnowledge + refund,
    },
    activeResearch: null,
  };
}

// Advance the pending tech one turn; unlock it when the timer runs out. The HK
// cost was already paid at purchase (no per-turn accrual anymore).
export function progressResearch(draft: GameState, push: PushLog): void {
  const research = draft.activeResearch;
  if (!research) return;
  const def = RESEARCH_BY_ID[research.techId];
  if (!def) {
    draft.activeResearch = null;
    return;
  }

  research.monthsRemaining -= 1;
  if (research.monthsRemaining > 0) return;

  // Unlocked.
  draft.completedResearch.push(def.id);
  draft.activeResearch = null;
  push("research", `${def.name} complete`, def.flavor);

  for (const unlock of def.unlocks) {
    if (unlock.type === "card") {
      grantCard(draft, unlock.cardId, push);
    }
    // deeperDiscovery / prospectGeneration / goalieEvents tune later systems.
  }
}

// ---------------------------------------------------------------------------
// Research-chooser data (drives the era-tiered ResearchPanel UI).
// ---------------------------------------------------------------------------

export type ResearchStatus = "available" | "active" | "completed" | "locked";

export type ResearchOption = {
  id: string;
  name: string;
  description: string;
  flavor: string;
  cost: number;
  eraId: string;
  branch: ResearchBranch;
  // Prerequisite chips for the tech-tree screen: each prereq with its met state.
  prereqs: { id: string; name: string; met: boolean }[];
  status: ResearchStatus;
  unlockSummary: string;
  requirementText: string;
  lockReason?: string;
};

export type ResearchEraGroup = {
  eraId: string;
  eraName: string;
  options: ResearchOption[];
};

// Era display order = the five-era progression; unknown eras fall to the end.
const ERA_ORDER = ERA_PROGRESSION;

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function humanizeId(id: string): string {
  return id.split("-").map(titleCase).join(" ");
}

function eraName(eraId: string): string {
  return ERAS[eraId]?.name ?? humanizeId(eraId);
}

// Player-facing payoff line: exactly what completing this tech lets you DO
// (or, for prereq-only techs, what it opens the path to). Hand-written for
// every tech wired to a real gate; derived from unlocks/dependents otherwise.
const TECH_PAYOFFS: Record<string, string> = {
  "basic-skating":
    "Your locals can move on ice — required for Local Tryouts and Rules of the Game",
  "stick-gear-basics":
    "Rink Rats can Harvest Branches into Equipment · required for Local Tryouts",
  "ice-surveying": "Unlocks the Rink Rats work crew (build it in Production)",
  "outdoor-rinkcraft": "Rink Rats can Build Level 1 Rinks on cleared ponds",
  "local-tryouts": "Unlocks Hold Tryouts at your club rinks — recruit your first players",
  "scouting-rumors": "Opens the path to First Contact",
  "first-contact": "Unlocks Send Introduction in the Independents ledger",
  "rules-of-the-game":
    "Your players can actually play — checks off a Pond Hockey era requirement",
  "scouting-reports": "Unlocks the map Scout and the Basic Scout unit",
  "local-recruitment": "Unlocks the Recruiter unit",
  "regional-scouting": "Unlocks the Regional Scout unit",
  "development-partnership": "Unlocks the Development Envoy unit",
};

export function techPayoff(def: ResearchDef): string {
  const wired = TECH_PAYOFFS[def.id];
  if (wired) return wired;
  if (def.unlocks.length > 0) return unlockSummary(def.unlocks);
  const dependents = RESEARCH.filter((r) =>
    r.requiredTechIds.includes(def.id),
  ).map((r) => r.name);
  if (dependents.length > 0) {
    return `Opens the path to ${dependents.join(" + ")}`;
  }
  return "Advances your hockey knowledge";
}

function unlockSummary(unlocks: Unlock[]): string {
  if (unlocks.length === 0) return "Advances your hockey knowledge";
  const parts = unlocks.map((u) => {
    switch (u.type) {
      case "card":
        return `Unlocks ${humanizeId(u.cardId)}`;
      case "cardPool":
        return "Unlocks new recruits";
      case "deeperDiscovery":
        return "Deeper region discovery";
      case "prospectGeneration":
        return "Generates prospects";
      case "goalieEvents":
        return "Unlocks goalie events";
      default:
        return "New capability";
    }
  });
  return parts.join(" · ");
}

function requirementText(def: ResearchDef): string {
  if (def.requiredTechIds.length === 0) return "No prerequisites";
  return `Requires ${def.requiredTechIds.map((id) => RESEARCH_BY_ID[id]?.name ?? humanizeId(id)).join(" + ")}`;
}

function lockReason(state: GameState, def: ResearchDef): string | undefined {
  const missing = def.requiredTechIds.filter(
    (id) => !state.completedResearch.includes(id),
  );
  if (missing.length === 0) return undefined;
  return `Needs ${missing.map((id) => RESEARCH_BY_ID[id]?.name ?? humanizeId(id)).join(", ")}`;
}

function researchOption(state: GameState, def: ResearchDef): ResearchOption {
  const completed = state.completedResearch.includes(def.id);
  const active = state.activeResearch?.techId === def.id;
  const prereqsMet = def.requiredTechIds.every((id) =>
    state.completedResearch.includes(id),
  );
  const status: ResearchStatus = completed
    ? "completed"
    : active
      ? "active"
      : prereqsMet
        ? "available"
        : "locked";
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    flavor: def.flavor,
    cost: def.cost,
    eraId: def.eraId,
    branch: def.branch,
    prereqs: def.requiredTechIds.map((id) => ({
      id,
      name: RESEARCH_BY_ID[id]?.name ?? humanizeId(id),
      met: state.completedResearch.includes(id),
    })),
    status,
    unlockSummary: techPayoff(def),
    requirementText: requirementText(def),
    lockReason: lockReason(state, def),
  };
}

// All techs, grouped into era tiers in progression order.
export function getResearchOptions(state: GameState): ResearchEraGroup[] {
  const byEra = new Map<string, ResearchOption[]>();
  for (const def of RESEARCH) {
    const opt = researchOption(state, def);
    const list = byEra.get(def.eraId) ?? [];
    list.push(opt);
    byEra.set(def.eraId, list);
  }
  const orderedIds = [
    ...ERA_ORDER.filter((id) => byEra.has(id)),
    ...[...byEra.keys()].filter((id) => !ERA_ORDER.includes(id)),
  ];
  return orderedIds.map((eraId) => ({
    eraId,
    eraName: eraName(eraId),
    options: byEra.get(eraId)!,
  }));
}

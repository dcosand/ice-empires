import type { GameState, ResearchDef, Unlock } from "../types/game";
import { RESEARCH, RESEARCH_BY_ID } from "../data/research";
import { ERAS } from "../data/eras";
import { getAvailableResearch, getMonthlyIncome } from "./selectors";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";

// Select a tech to research. Science-per-turn: no upfront cost; Hockey Knowledge
// income funds progress each month (see DECISIONS.md).
export function selectResearch(state: GameState, techId: string): GameState {
  const def = RESEARCH_BY_ID[techId];
  if (!def) return state;
  if (!getAvailableResearch(state).some((r) => r.id === techId)) return state;

  return {
    ...state,
    activeResearch: {
      techId,
      knowledgeRemaining: def.cost,
      progressKnowledge: 0,
    },
  };
}

// Apply this month's Hockey Knowledge income toward the active tech.
export function progressResearch(draft: GameState, push: PushLog): void {
  const research = draft.activeResearch;
  if (!research) return;
  const def = RESEARCH_BY_ID[research.techId];
  if (!def) {
    draft.activeResearch = null;
    return;
  }

  const hkPerMonth = getMonthlyIncome(draft).hockeyKnowledge;
  research.progressKnowledge += hkPerMonth;
  research.knowledgeRemaining = Math.max(
    0,
    def.cost - research.progressKnowledge,
  );

  if (research.progressKnowledge < def.cost) {
    push(
      "research",
      `${def.name} progressing`,
      `${def.name} research is ${Math.round(
        (research.progressKnowledge / def.cost) * 100,
      )}% complete.`,
    );
    return;
  }

  // Completed.
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

// Does the club have a research unlock active? (used by discovery tuning)
export function hasUnlock(
  state: GameState,
  unlock: "deeperDiscovery" | "prospectGeneration" | "goalieEvents",
): boolean {
  return state.completedResearch.some((id) => {
    const def = RESEARCH_BY_ID[id];
    return def?.unlocks.some((u) => u.type === unlock);
  });
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

// Era display order; eras not listed fall to the end in first-seen order.
const ERA_ORDER = ["pond-hockey", "club-formation", "scouting-network"];

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function humanizeId(id: string): string {
  return id.split("-").map(titleCase).join(" ");
}

function eraName(eraId: string): string {
  return ERAS[eraId]?.name ?? humanizeId(eraId);
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
    status,
    unlockSummary: unlockSummary(def.unlocks),
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

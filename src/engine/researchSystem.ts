import type { GameState } from "../types/game";
import { RESEARCH_BY_ID } from "../data/research";
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

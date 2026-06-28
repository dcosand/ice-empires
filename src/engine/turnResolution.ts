import type { EventLogEntry, GameState, LogType } from "../types/game";
import { getMonthlyIncome } from "./selectors";
import { addResources } from "./resources";
import { RESOURCE_LABELS } from "./resources";
import { progressProduction } from "./productionSystem";
import { progressResearch } from "./researchSystem";
import { resolveDiscovery } from "./discoverySystem";
import { progressConnection } from "./regionDevelopment";
import { maybeRivalRumor } from "./rivalSystem";
import { refreshScoutMoves } from "./scoutSystem";
import { triggerMonthlyEvent } from "./eventSystem";
import { checkEraProgress } from "./eraSystem";
import { makeLog } from "./log";

// Pure-ish end-of-month resolver. Clones state, advances one month, then runs
// each system in order. Each system appends readable log lines.
export function endMonth(state: GameState): GameState {
  if (state.phase !== "playing" || !state.club) return state;

  const draft: GameState = structuredClone(state);
  draft.month += 1;

  const logs: EventLogEntry[] = [];
  let seq = 0;
  const push = (type: LogType, title: string, message: string) => {
    logs.push(makeLog(draft.month, seq++, type, title, message));
  };

  // 1. Income.
  const income = getMonthlyIncome(draft);
  draft.resources = addResources(draft.resources, income);
  push(
    "resource",
    `Month ${draft.month} income`,
    incomeSummary(income),
  );

  // 2+. Systems — each contributes a readable world/club update.
  progressProduction(draft, push);
  progressResearch(draft, push);
  resolveDiscovery(draft, push); // Local Hockey Search creates leads; units reveal map fog.
  progressConnection(draft, push); // Establish Local Connection -> influenced
  maybeRivalRumor(draft, push); // rival pressure as rumors / contested regions
  refreshScoutMoves(draft); // scout gets fresh movement points (silent)
  triggerMonthlyEvent(draft, push);
  checkEraProgress(draft, push);

  // Newest entries first in the log.
  draft.eventLog = [...logs.reverse(), ...draft.eventLog];
  return draft;
}

function incomeSummary(income: ReturnType<typeof getMonthlyIncome>): string {
  const parts = (Object.keys(income) as (keyof typeof income)[])
    .filter((k) => income[k] !== 0)
    .map((k) => `+${income[k]} ${RESOURCE_LABELS[k]}`);
  return parts.length ? parts.join(", ") : "No income this month.";
}

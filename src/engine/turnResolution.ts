import type { EventLogEntry, GameState, LogType } from "../types/game";
import { getMonthlyIncome } from "./selectors";
import { addResources } from "./resources";
import { RESOURCE_LABELS } from "./resources";
import { progressProduction } from "./productionSystem";
import { progressBuilderWork } from "./builderSystem";
import { autoEquipRoster } from "./tryoutSystem";
import {
  accrueRinkPresence,
  checkIndependentContact,
  trackRivalOrgContacts,
} from "./independentsSystem";
import { progressResearch } from "./researchSystem";
import { runRivalTurns } from "./rivalAI";
import { rivalSigningPressure } from "./signingSystem";
import { progressScoutMissions, refreshScoutMoves } from "./scoutSystem";
import { advanceWanderers } from "./wandererSystem";
import { applyScoutPromotions } from "./scoutStaff";
import { triggerMonthlyEvent } from "./eventSystem";
import { checkEraProgress, progressRivalEras } from "./eraSystem";
import { getMonthlyEquipment, getMonthlyUpkeep } from "./selectors";
import { makeLog } from "./log";
import { turnDateLabel } from "./calendar";

// Pure-ish end-of-month resolver. Clones state, advances one month, then runs
// each system in order. Each system appends readable log lines.
export function endMonth(state: GameState): GameState {
  if (state.phase !== "playing" || !state.club) return state;
  // The founding turn can't be ended until the club's HQ is planted.
  if (state.world && !state.world.hqTile) return state;

  const draft: GameState = structuredClone(state);
  draft.month += 1;

  const logs: EventLogEntry[] = [];
  let seq = 0;
  const push = (type: LogType, title: string, message: string, from?: string) => {
    logs.push(makeLog(draft.month, seq++, type, title, message, from));
  };

  // 1. Income (plus equipment shed stock — inventory, not a currency).
  const income = getMonthlyIncome(draft);
  draft.resources = addResources(draft.resources, income);
  // A drained treasury bottoms out at zero — no debt spiral (yet).
  draft.resources.funds = Math.max(0, draft.resources.funds);
  const equipmentGain = getMonthlyEquipment(draft);
  draft.equipment += equipmentGain;
  const upkeep = getMonthlyUpkeep(draft);
  push(
    "resource",
    `${turnDateLabel(draft.month)} income`,
    incomeSummary(income) +
      (upkeep.total > 0
        ? ` (after ${upkeep.total} Funds upkeep: ${upkeep.units} units, ${upkeep.rinks} rink maintenance)`
        : "") +
      (equipmentGain > 0 ? ` +${equipmentGain} Equipment (shed).` : ""),
  );
  autoEquipRoster(draft, push); // hand shed stock to ungeared players FIFO

  // 2+. Systems — each contributes a readable world/club update.
  progressProduction(draft, push);
  progressBuilderWork(draft, push); // map crews: rink builds advance/finish
  progressScoutMissions(draft, push); // assigned scouts file reports on a cadence
  progressResearch(draft, push);
  refreshScoutMoves(draft); // scout gets fresh movement points (silent)
  advanceWanderers(draft); // neutral roamers drift, retire, and occasionally spawn
  runRivalTurns(draft, push); // rival clubs produce + move units; may make contact
  trackRivalOrgContacts(draft); // rivals quietly meet independents (ledger crests)
  accrueRinkPresence(draft, push); // rinks near an indie court them monthly (D35)
  rivalSigningPressure(draft, push); // hard-courting rivals may sign prospects away
  checkIndependentContact(draft, push); // a unit parked beside an org meets them
  progressRivalEras(draft, push); // rivals advance eras on their own clock
  applyScoutPromotions(draft, push); // banked fieldwork XP becomes promotions
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
  return parts.length ? parts.join(", ") : "No income this turn.";
}

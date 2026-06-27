import type { GameState } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { getAvailableFacilities, getMonthlyIncome } from "./selectors";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";

// Operations cost of a facility (the production needed to complete it).
export function facilityCost(facilityId: string): number {
  return FACILITIES_BY_ID[facilityId]?.cost.operations ?? 0;
}

// Player selects a facility to build. No upfront payment — Operations production
// flows into it each month (see DECISIONS.md D2).
export function selectBuild(state: GameState, facilityId: string): GameState {
  const def = FACILITIES_BY_ID[facilityId];
  if (!def) return state;
  if (!getAvailableFacilities(state).some((f) => f.id === facilityId)) {
    return state;
  }

  return {
    ...state,
    activeBuild: {
      facilityId,
      operationsRemaining: facilityCost(facilityId),
      progressOperations: 0,
    },
  };
}

// Apply this month's Operations production toward the active build.
export function progressBuild(draft: GameState, push: PushLog): void {
  const build = draft.activeBuild;
  if (!build) return;
  const def = FACILITIES_BY_ID[build.facilityId];
  if (!def) {
    draft.activeBuild = null;
    return;
  }

  const cost = facilityCost(build.facilityId);
  const opsPerMonth = getMonthlyIncome(draft).operations;
  build.progressOperations += opsPerMonth;
  build.operationsRemaining = Math.max(0, cost - build.progressOperations);

  if (build.progressOperations < cost) {
    push(
      "build",
      `${def.name} underway`,
      `${def.name} is ${Math.round(
        (build.progressOperations / cost) * 100,
      )}% built (${build.progressOperations}/${cost} Operations).`,
    );
    return;
  }

  // Completed.
  draft.facilities.push(def.id);
  draft.activeBuild = null;
  push("build", `${def.name} completed`, def.flavor);

  for (const unlock of def.unlocks) {
    if (unlock.type === "card") {
      grantCard(draft, unlock.cardId, push);
    }
    // cardPool / other unlocks are handled by discovery & event systems later.
  }
}

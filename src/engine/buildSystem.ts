import type { GameState } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { canAfford, subtractResources } from "./resources";
import { getAvailableFacilities } from "./selectors";
import type { PushLog } from "./turnContext";
import { grantCard } from "./cardSystem";

// Player selects a facility to build. Cost is paid upfront (see DECISIONS.md).
// Returns the new state, or the unchanged state if invalid/unaffordable.
export function selectBuild(state: GameState, facilityId: string): GameState {
  const def = FACILITIES_BY_ID[facilityId];
  if (!def) return state;
  if (!getAvailableFacilities(state).some((f) => f.id === facilityId)) {
    return state;
  }
  if (!canAfford(state.resources, def.cost)) return state;

  return {
    ...state,
    resources: subtractResources(state.resources, def.cost),
    activeBuild: {
      facilityId,
      monthsRemaining: def.buildMonths,
      progressMonths: 0,
    },
  };
}

// Advance the active build one month; complete it when months run out.
export function progressBuild(draft: GameState, push: PushLog): void {
  const build = draft.activeBuild;
  if (!build) return;

  build.progressMonths += 1;
  build.monthsRemaining -= 1;

  const def = FACILITIES_BY_ID[build.facilityId];
  if (!def) {
    draft.activeBuild = null;
    return;
  }

  if (build.monthsRemaining > 0) {
    push(
      "build",
      `${def.name} underway`,
      `${def.name} construction is ${Math.round(
        (build.progressMonths / def.buildMonths) * 100,
      )}% complete.`,
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

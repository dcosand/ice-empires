import type { GameState } from "../types/game";
import {
  CLUB_FORMATION_ERA_ID,
  CLUB_FORMATION_UNLOCK_MESSAGE,
} from "../data/eras";
import { allEraRequirementsMet } from "./selectors";
import type { PushLog } from "./turnContext";

// Once every Club Formation requirement is met, advance the era (one time) and
// log the unlock message. The full next era is intentionally not implemented.
export function checkEraProgress(draft: GameState, push: PushLog): void {
  if (draft.nextEraUnlocked) return;
  if (!allEraRequirementsMet(draft)) return;

  draft.eraId = CLUB_FORMATION_ERA_ID;
  draft.nextEraUnlocked = true;
  push("era", "Club Formation Era reached", CLUB_FORMATION_UNLOCK_MESSAGE);
}

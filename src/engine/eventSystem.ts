import type { GameState } from "../types/game";
import { FLAVOR_EVENTS } from "../data/events";
import type { PushLog } from "./turnContext";
import { nextRandom } from "./rng";

// Trigger one low-stakes flavor beat so every month has a story line, even quiet
// ones. Mechanical outcomes are logged by their own systems.
export function triggerMonthlyEvent(draft: GameState, push: PushLog): void {
  const roll = nextRandom(draft.rngSeed);
  draft.rngSeed = roll.seed;
  const event = FLAVOR_EVENTS[Math.floor(roll.value * FLAVOR_EVENTS.length)];
  push("flavor", "Around the club", event.message);
}

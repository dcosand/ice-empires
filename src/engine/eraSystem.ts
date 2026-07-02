import type { GameState } from "../types/game";
import { CLUBS } from "../data/clubs";
import { ERA_ORDER, ERA_UNLOCK_MESSAGES, ERAS } from "../data/eras";
import { allEraRequirementsMet } from "./selectors";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// Advance the club to the next era once the CURRENT era's full requirement
// checklist is met (per-club milestone progression — see docs/13_ERA_ARC.md).
export function checkEraProgress(draft: GameState, push: PushLog): void {
  if (!allEraRequirementsMet(draft)) return;

  const idx = ERA_ORDER.indexOf(draft.eraId);
  const nextEraId = ERA_ORDER[idx + 1];
  if (!nextEraId) return;

  draft.eraId = nextEraId;
  draft.nextEraUnlocked = true;
  const era = ERAS[nextEraId];
  push(
    "era",
    `${era?.name ?? nextEraId} reached`,
    `${draft.club?.name ?? "Your club"} ${
      ERA_UNLOCK_MESSAGES[nextEraId] ?? "has entered a new era."
    }`,
  );
}

// Rivals advance eras on their own seeded schedule — a month threshold with
// jitter, no real requirements (they're pressure, not simulation). Transitions
// are only broadcast for rivals the player has met, so the log never spoils an
// unknown club's existence.
const RIVAL_ERA_BASE_MONTHS = 10; // ~when a rival exits Pond Hockey
const RIVAL_ERA_JITTER = 5;

export function progressRivalEras(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const rival of world.rivals) {
    const idx = ERA_ORDER.indexOf(rival.eraId);
    const nextEraId = ERA_ORDER[idx + 1];
    if (!nextEraId) continue;
    // Each rival needs base + jitter months per era step.
    const threshold = (idx + 1) * RIVAL_ERA_BASE_MONTHS;
    if (draft.month < threshold) continue;
    const roll = nextRandom(draft.rngSeed);
    draft.rngSeed = roll.seed;
    if (roll.value > (draft.month - threshold + 1) / RIVAL_ERA_JITTER) continue;

    rival.eraId = nextEraId;
    if (rival.contacted) {
      const club = CLUBS[rival.clubId];
      const era = ERAS[nextEraId];
      push(
        "rival",
        `${club?.name ?? "A rival"} advances`,
        `${club?.name ?? "A rival club"} has entered the ${era?.name ?? nextEraId}.`,
      );
    }
  }
}

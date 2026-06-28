import type { GameState } from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import { CLUB_LIST } from "../data/clubs";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// Lightweight rival PRESSURE only — no rival units, AI, or diplomacy. From
// Month 6, once the player has discovered some of the world, a rival club may be
// rumored to be sniffing around one of your known regions, marking it contested.
const RUMOR_START_MONTH = 6;
const RUMOR_CHANCE = 0.5;

const RUMOR_TEMPLATES = [
  (club: string, region: string) =>
    `A ${club} scout was seen near ${region}.`,
  (club: string, region: string) =>
    `${club} has been asking questions around ${region}.`,
  (club: string, region: string) =>
    `Word is ${club} has its eye on ${region}.`,
];

export function maybeRivalRumor(draft: GameState, push: PushLog): void {
  if (draft.month < RUMOR_START_MONTH) return;

  // Known, not-yet-contested regions the rumor can land on.
  const eligible = Object.entries(draft.discovery.regionStates)
    .filter(
      ([id, s]) =>
        (s === "discovered" || s === "surveyed" || s === "influenced") &&
        !draft.discovery.contested.includes(id),
    )
    .map(([id]) => id);

  if (eligible.length < 1) return;
  // Require at least 2 regions discovered overall before rivals take notice.
  const discoveredTotal = Object.values(draft.discovery.regionStates).filter(
    (s) => s !== "hidden" && s !== "rumored",
  ).length;
  if (discoveredTotal < 2) return;

  const roll = nextRandom(draft.rngSeed);
  draft.rngSeed = roll.seed;
  if (roll.value > RUMOR_CHANCE) return;

  const roll2 = nextRandom(draft.rngSeed);
  draft.rngSeed = roll2.seed;
  const regionId = eligible[Math.floor(roll2.value * eligible.length)];
  const region = REGIONS_BY_ID[regionId];

  // Pick a rival club (not the player's).
  const rivals = CLUB_LIST.filter((c) => c.id !== draft.club?.id);
  const roll3 = nextRandom(draft.rngSeed);
  draft.rngSeed = roll3.seed;
  const rival = rivals[Math.floor(roll3.value * rivals.length)];

  const roll4 = nextRandom(draft.rngSeed);
  draft.rngSeed = roll4.seed;
  const template =
    RUMOR_TEMPLATES[Math.floor(roll4.value * RUMOR_TEMPLATES.length)];

  draft.discovery.contested.push(regionId);
  push(
    "rival",
    "Rival interest",
    `${template(rival.name, region?.name ?? "one of your regions")} The region is now contested.`,
  );
}

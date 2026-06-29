import type { GameState } from "../types/game";
import { CLUBS } from "../data/clubs";
import { PUND_HOCKEY_ERA_ID } from "../data/eras";
import { DEFAULT_DISCOVERY_PRIORITY } from "../data/discovery";
import { EMPTY_RESOURCES } from "./resources";

export const MAX_MONTHS = 12;

// Pre-founding state: landing screen, no club yet.
export function createInitialState(): GameState {
  return {
    phase: "landing",
    month: 0,
    maxMonths: MAX_MONTHS,
    eraId: PUND_HOCKEY_ERA_ID,
    nextEraUnlocked: false,
    selectedClubId: null,
    world: null,
    club: null,
    resources: { ...EMPTY_RESOURCES },
    facilities: [],
    units: [],
    completedResearch: [],
    activeProduction: null,
    activeResearch: null,
    discovery: {
      activePriorityId: DEFAULT_DISCOVERY_PRIORITY,
      regionStates: {},
      contested: [],
      connection: null,
    },
    cards: [],
    eventLog: [],
    rngSeed: 0,
    pendingEncounter: null,
    devRevealAll: false,
  };
}

// Seed the chosen club at the START of the founding expedition: starting
// resources, month 1, a stable RNG seed, and an opening log line. The club now
// exists from turn 1 even though its HQ isn't planted yet, so the founding turn
// is a real Month 1 — the player can choose research and act immediately, and
// only plants the HQ (which unlocks production) when they're ready.
export function beginFounding(state: GameState, clubId: string): GameState {
  const club = CLUBS[clubId];
  if (!club) return state;

  return {
    ...state,
    month: 1,
    club,
    resources: { ...club.startingResources },
    // Seed derived from club id length + a constant; stable across reloads.
    rngSeed: 1337 + club.id.length * 17,
    eventLog: [
      {
        id: "founding-expedition",
        month: 1,
        title: `${club.name} founding expedition`,
        message: club.foundingFlavor ?? club.identityText,
        type: "era",
      },
    ],
  };
}

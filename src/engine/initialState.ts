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
    club: null,
    resources: { ...EMPTY_RESOURCES },
    facilities: [],
    completedResearch: [],
    activeBuild: null,
    activeResearch: null,
    discovery: {
      activePriorityId: DEFAULT_DISCOVERY_PRIORITY,
      regionStates: {},
    },
    cards: [],
    eventLog: [],
    rngSeed: 0,
  };
}

// Apply club founding: seed resources, month 1, opening log entry.
export function foundClub(state: GameState, clubId: string): GameState {
  const club = CLUBS[clubId];
  if (!club) return state;

  return {
    ...state,
    phase: "playing",
    month: 1,
    club,
    resources: { ...club.startingResources },
    // Seed derived from club id length + a constant; stable across reloads.
    rngSeed: 1337 + club.id.length * 17,
    eventLog: [
      {
        id: "founding",
        month: 1,
        title: `${club.name} founded`,
        message: club.identityText,
        type: "era",
      },
    ],
  };
}

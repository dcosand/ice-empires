import type { GameState } from "../types/game";
import { DEFAULT_DISCOVERY_PRIORITY } from "../data/discovery";
import { createWorld } from "./world";
import { nearestRivalClubId } from "./rivalAI";

// Dev tools — reachable only from the in-app dev panel, never from normal play.
// They mutate state directly (bypassing costs / prerequisites) so a developer
// can jump the game into any configuration for testing.

// Reset the calendar to month 1 while keeping the founded club + generated world.
// Clears all progress (facilities, research, active jobs, discovery) and reseeds
// the club's starting resources, so it's a clean "turn 1" of the same game.
export function devResetTurn1(state: GameState): GameState {
  if (!state.club) return state;
  return {
    ...state,
    month: 1,
    resources: { ...state.club.startingResources },
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
  };
}

export function devToggleFacility(state: GameState, facilityId: string): GameState {
  const done = state.facilities.includes(facilityId);
  return {
    ...state,
    facilities: done
      ? state.facilities.filter((id) => id !== facilityId)
      : [...state.facilities, facilityId],
  };
}

export function devToggleResearch(state: GameState, techId: string): GameState {
  const done = state.completedResearch.includes(techId);
  return {
    ...state,
    completedResearch: done
      ? state.completedResearch.filter((id) => id !== techId)
      : [...state.completedResearch, techId],
  };
}

export function devSetRevealAll(state: GameState, value: boolean): GameState {
  return { ...state, devRevealAll: value };
}

// Generate a brand-new world with a fresh random seed so each click produces a
// different map. Resets the founder/fog/scout/HQ that live on the world (a new
// landmass needs a new starting position); other game state is left untouched.
export function devRegenMap(state: GameState): GameState {
  const seed = (Math.random() * 0x7fffffff) | 0;
  return { ...state, world: createWorld(seed, state.club?.id ?? state.selectedClubId) };
}

// Open the leader meeting screen for the nearest rival on demand. Because rivals
// are fog-gated and evenly spread, natural first contact is unlikely inside a
// 12-month game — this lets a developer exercise the meeting flow immediately.
export function devMeetRival(state: GameState): GameState {
  const world = state.world;
  const clubId = nearestRivalClubId(state);
  if (!world || !clubId) return state;
  return {
    ...state,
    world: {
      ...world,
      rivals: world.rivals.map((r) =>
        r.clubId === clubId ? { ...r, contacted: true } : r,
      ),
    },
    pendingMeeting: { clubId },
  };
}

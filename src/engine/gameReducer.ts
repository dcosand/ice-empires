import type { GameAction, GameState } from "../types/game";
import { createInitialState, foundClub } from "./initialState";
import { selectBuild } from "./buildSystem";
import { selectResearch } from "./researchSystem";
import { selectDiscoveryPriority } from "./discoverySystem";
import { endMonth } from "./turnResolution";

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return { ...state, phase: "founding" };

    case "FOUND_CLUB":
      return foundClub(state, action.clubId);

    case "SELECT_BUILD":
      return selectBuild(state, action.facilityId);

    case "SELECT_RESEARCH":
      return selectResearch(state, action.techId);

    case "SELECT_DISCOVERY_PRIORITY":
      return selectDiscoveryPriority(state, action.priorityId);

    case "END_MONTH":
      return endMonth(state);

    case "RESTART":
      return createInitialState();

    default:
      return state;
  }
}

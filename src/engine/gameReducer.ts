import type { GameAction, GameState } from "../types/game";
import { createInitialState, foundClub } from "./initialState";
import { selectBuild } from "./buildSystem";
import { selectResearch } from "./researchSystem";
import { selectDiscoveryPriority } from "./discoverySystem";
import {
  createFoundingMap,
  endFoundingTurn,
  moveFoundingUnit,
} from "./foundingMap";
import { endMonth } from "./turnResolution";

// TODO (future design pass): Rival GMs / Rival AI and any human multiplayer
// (hotseat or async) are intentionally NOT implemented. They need their own
// design pass — opponent turns, contact/diplomacy, and a networking model are
// all out of scope for the single-player First 12 Months prototype.

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return { ...state, phase: "clubSelect" };

    case "SELECT_CLUB":
      return { ...state, phase: "founding", selectedClubId: action.clubId };

    case "START_FOUNDING":
      return {
        ...state,
        phase: "foundingMap",
        foundingMap: createFoundingMap(),
      };

    case "SELECT_FOUNDING_UNIT":
      if (!state.foundingMap || state.foundingMap.founded) return state;
      return {
        ...state,
        foundingMap: { ...state.foundingMap, selected: true },
      };

    case "MOVE_FOUNDING_UNIT":
      return moveFoundingUnit(state, action.x, action.y);

    case "END_FOUNDING_TURN":
      return endFoundingTurn(state);

    case "FOUND_CLUB": {
      const fm = state.foundingMap;
      if (!fm || fm.founded) return state;
      const founded = foundClub(state, action.clubId);
      if (!founded.club) return state; // invalid club id
      return {
        ...founded,
        foundingMap: { ...fm, founded: { ...fm.unit }, selected: false },
      };
    }

    case "BEGIN_SEASON":
      return { ...state, phase: "playing", foundingMap: null };

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

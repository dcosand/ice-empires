import type { GameAction, GameState } from "../types/game";
import { createInitialState, foundClub } from "./initialState";
import { startProduction } from "./productionSystem";
import { selectResearch } from "./researchSystem";
import { selectDiscoveryPriority } from "./discoverySystem";
import {
  createWorld,
  endFoundingTurn,
  foundOnTile,
  moveFounder,
} from "./world";
import {
  moveScout,
  recruitScout,
  selectScout,
  surveyRegion,
} from "./scoutSystem";
import { establishConnection } from "./regionDevelopment";
import { endMonth } from "./turnResolution";

// TODO (future design pass): Rival GMs / Rival AI and any human multiplayer
// (hotseat or async) are intentionally NOT implemented. Rivals currently exist
// only as lightweight RUMORS (see rivalSystem.ts). Full opponent turns,
// contact/diplomacy, and a networking model all need their own design pass.

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
        world: createWorld(Date.now()),
      };

    case "SELECT_FOUNDING_UNIT":
      if (!state.world || state.world.hqTile || !state.world.founder) {
        return state;
      }
      return { ...state, world: { ...state.world, founderSelected: true } };

    case "MOVE_FOUNDING_UNIT":
      return moveFounder(state, action.x, action.y);

    case "END_FOUNDING_TURN":
      return endFoundingTurn(state);

    case "FOUND_CLUB": {
      const world = state.world;
      if (!world || world.hqTile || !world.founder) return state;
      // Place HQ on the founding tile, then seed the club (resources, month 1).
      const placed = foundOnTile(state);
      const founded = foundClub(placed, action.clubId);
      if (!founded.club) return state; // invalid club id
      return founded;
    }

    case "BEGIN_SEASON":
      // Keep the world — it persists into play (HQ, fog, revealed tiles).
      return { ...state, phase: "playing" };

    case "START_PRODUCTION":
      return startProduction(state, action.kind, action.itemId);

    case "SELECT_RESEARCH":
      return selectResearch(state, action.techId);

    case "SELECT_DISCOVERY_PRIORITY":
      return selectDiscoveryPriority(state, action.priorityId);

    case "RECRUIT_SCOUT":
      return recruitScout(state);

    case "SELECT_SCOUT":
      return selectScout(state);

    case "MOVE_SCOUT":
      return moveScout(state, action.x, action.y);

    case "SURVEY_REGION":
      return surveyRegion(state, action.regionId);

    case "ESTABLISH_CONNECTION":
      return establishConnection(state, action.regionId);

    case "END_MONTH":
      return endMonth(state);

    case "RESTART":
      return createInitialState();

    default:
      return state;
  }
}

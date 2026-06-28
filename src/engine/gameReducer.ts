import type { GameAction, GameState } from "../types/game";
import { beginFounding, createInitialState } from "./initialState";
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
import {
  devResetTurn1,
  devSetRevealAll,
  devToggleFacility,
  devToggleResearch,
} from "./devSystem";

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

    case "START_FOUNDING": {
      // The founding turn IS Month 1, played on the same map-oriented Dashboard
      // as the rest of the game: seed the club and generate the world, then go
      // straight into "playing" with the Founding Group on the board.
      if (!state.selectedClubId) return state;
      const withWorld: GameState = {
        ...state,
        phase: "playing",
        world: createWorld(Date.now()),
      };
      return beginFounding(withWorld, state.selectedClubId);
    }

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
      const club = state.club;
      if (!club) return state;
      // Plant HQ on the founding tile (Founding Group -> Club Leadership, a Scout
      // takes the ice). The club + resources + Month 1 were already seeded at the
      // start of the founding turn, so this only marks the home and logs it.
      const placed = foundOnTile(state);
      return {
        ...placed,
        eventLog: [
          {
            id: "club-founded",
            month: placed.month,
            title: `${club.name} HQ established`,
            message: `${club.name} plants its home ice. Production opens — start building your first facility.`,
            type: "era",
          },
          ...placed.eventLog,
        ],
      };
    }

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

    case "DEV_RESET_TURN1":
      return devResetTurn1(state);

    case "DEV_TOGGLE_FACILITY":
      return devToggleFacility(state, action.facilityId);

    case "DEV_TOGGLE_RESEARCH":
      return devToggleResearch(state, action.techId);

    case "DEV_SET_REVEAL_ALL":
      return devSetRevealAll(state, action.value);

    default:
      return state;
  }
}

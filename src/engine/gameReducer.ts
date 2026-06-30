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
  resolvePendingEncounter,
  selectScout,
  surveyRegion,
  triggerPondEncounter,
} from "./scoutSystem";
import { establishConnection } from "./regionDevelopment";
import { endMonth } from "./turnResolution";
import { triggerRivalContact } from "./rivalAI";
import {
  devMeetRival,
  devRegenMap,
  devResetTurn1,
  devSetRevealAll,
  devToggleFacility,
  devToggleResearch,
} from "./devSystem";

// Rival clubs now exist as a FOUNDATION-level AI: each non-player club founds an
// HQ on turn 1 (world.placeRivals), produces + wanders scouts each month
// (rivalAI.runRivalTurns), and triggers a leader meeting on first contact. Full
// strategic AI, diplomacy/negotiation, and any human multiplayer (hotseat or
// async networking) still need their own design pass.

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
        world: createWorld(Date.now(), state.selectedClubId),
      };
      return beginFounding(withWorld, state.selectedClubId);
    }

    case "SELECT_FOUNDING_UNIT":
      if (!state.world || state.world.hqTile || !state.world.founder) {
        return state;
      }
      return { ...state, world: { ...state.world, founderSelected: true } };

    case "MOVE_FOUNDING_UNIT":
      return triggerPondEncounter(
        moveFounder(state, action.x, action.y),
        action.x,
        action.y,
      );

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
      return selectScout(state, action.scoutId);

    case "MOVE_SCOUT":
      // After the move: a pond goodie hut takes priority (sets pendingEncounter),
      // then a rival first-contact check (sets pendingMeeting, but bails if an
      // encounter is already open) so the player only ever sees one pop-up.
      return triggerRivalContact(
        triggerPondEncounter(
          moveScout(state, action.x, action.y, action.scoutId),
          action.x,
          action.y,
        ),
        action.x,
        action.y,
      );

    case "RESOLVE_ENCOUNTER":
      return resolvePendingEncounter(state);

    case "ACKNOWLEDGE_MEETING":
      return { ...state, pendingMeeting: null };

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

    case "DEV_REGEN_MAP":
      return devRegenMap(state);

    case "DEV_TOGGLE_FACILITY":
      return devToggleFacility(state, action.facilityId);

    case "DEV_TOGGLE_RESEARCH":
      return devToggleResearch(state, action.techId);

    case "DEV_SET_REVEAL_ALL":
      return devSetRevealAll(state, action.value);

    case "DEV_MEET_RIVAL":
      return devMeetRival(state);

    default:
      return state;
  }
}

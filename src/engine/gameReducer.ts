import type { GameAction, GameState } from "../types/game";
import { beginFounding, createInitialState } from "./initialState";
import { cancelProduction, startProduction } from "./productionSystem";
import { cancelResearch, selectResearch } from "./researchSystem";
import {
  createWorld,
  endFoundingTurn,
  foundOnTile,
  moveFounder,
} from "./world";
import {
  allScouts,
  moveScout,
  recruitScout,
  resolvePendingEncounter,
  selectScout,
  triggerPondEncounter,
} from "./scoutSystem";
import { clearSnow, harvestBranches, startRinkBuild } from "./builderSystem";
import { closeTryouts, holdTryouts, recruitPlayer } from "./tryoutSystem";
import {
  sendIntroduction,
  triggerIndependentContact,
} from "./independentsSystem";
import { endMonth } from "./turnResolution";
import { triggerRivalContact } from "./rivalAI";
import {
  devAddEquipment,
  devForceTryouts,
  devGrantPondTech,
  devMeetIndependent,
  devMeetRival,
  devRegenMap,
  devResetTurn1,
  devSetRevealAll,
  devSpawnBuilder,
  devToggleFacility,
  devToggleResearch,
} from "./devSystem";

// Rival clubs now exist as a FOUNDATION-level AI: each non-player club founds an
// HQ on turn 1 (world.placeRivals), produces + wanders scouts each month
// (rivalAI.runRivalTurns), and triggers a leader meeting on first contact. Full
// strategic AI, diplomacy/negotiation, and any human multiplayer (hotseat or
// async networking) still need their own design pass.

// Drain any queued first-contact that a higher-priority popup pre-empted. When
// a scout lands on a goodie hut next to an unmet org, the encounter wins the
// one-popup rule and the contact is skipped that move; once the encounter (and
// any player reveal) is dismissed we re-check every unit's tile so the meeting
// fires immediately instead of waiting for the End-Month sweep.
function retryContactAtUnits(state: GameState): GameState {
  const world = state.world;
  if (!world) return state;
  if (state.pendingMeeting || state.pendingEncounter || state.pendingPlayerReveal) {
    return state;
  }
  for (const u of allScouts(world)) {
    const afterRival = triggerRivalContact(state, u.x, u.y);
    if (afterRival !== state) return afterRival;
    const afterIndie = triggerIndependentContact(state, u.x, u.y);
    if (afterIndie !== state) return afterIndie;
  }
  return state;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME":
      return { ...state, phase: "clubSelect" };

    case "SELECT_CLUB":
      return { ...state, phase: "founding", selectedClubId: action.clubId };

    case "START_FOUNDING": {
      // Month 1 begins with the club already founded: seed the club, generate the
      // world, then immediately plant the HQ on the chosen start tile. There's no
      // separate "move the Founding Group, then found here" step — the player
      // drops straight into the game with production open and a Scout on the ice.
      if (!state.selectedClubId) return state;
      const withWorld: GameState = {
        ...state,
        phase: "playing",
        world: createWorld(Date.now(), state.selectedClubId),
      };
      const seeded = beginFounding(withWorld, state.selectedClubId);
      const club = seeded.club;
      if (!club || !seeded.world?.founder) return seeded;
      const placed = foundOnTile(seeded);
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

    case "CANCEL_PRODUCTION":
      return cancelProduction(state);

    case "SELECT_RESEARCH":
      return selectResearch(state, action.techId);

    case "CANCEL_RESEARCH":
      return cancelResearch(state);

    case "RECRUIT_SCOUT":
      return recruitScout(state);

    case "SELECT_SCOUT":
      return selectScout(state, action.scoutId);

    case "MOVE_SCOUT":
      // After the move, popups stage in priority order — goodie hut, then rival
      // first contact, then independent first contact. Each trigger bails if
      // something is already pending, so the player only ever sees one pop-up.
      return triggerIndependentContact(
        triggerRivalContact(
          triggerPondEncounter(
            moveScout(state, action.x, action.y, action.scoutId),
            action.x,
            action.y,
          ),
          action.x,
          action.y,
        ),
        action.x,
        action.y,
      );

    case "CLEAR_SNOW":
      return clearSnow(state, action.unitId);

    case "BUILD_RINK":
      return startRinkBuild(state, action.unitId);

    case "HARVEST_BRANCHES":
      return harvestBranches(state, action.unitId);

    case "HOLD_TRYOUTS":
      return holdTryouts(state);

    case "RECRUIT_PLAYER":
      return recruitPlayer(state, action.candidateId);

    case "CLOSE_TRYOUTS":
      return closeTryouts(state);

    case "SEND_INTRODUCTION":
      return sendIntroduction(state, action.orgId);

    case "RESOLVE_ENCOUNTER":
      // Resolving may stage a player reveal (wanderer); if so the retry bails
      // and the contact fires when that reveal is dismissed instead.
      return retryContactAtUnits(resolvePendingEncounter(state));

    case "ACKNOWLEDGE_PLAYER_REVEAL":
      return retryContactAtUnits({ ...state, pendingPlayerReveal: null });

    case "ACKNOWLEDGE_MEETING":
      return retryContactAtUnits({ ...state, pendingMeeting: null });

    case "RESPOND_MEETING": {
      // Store the chosen greeting on the rival being met, then close the scene.
      const meeting = state.pendingMeeting;
      const world = state.world;
      if (!meeting || meeting.kind !== "rival" || !world) {
        return retryContactAtUnits({ ...state, pendingMeeting: null });
      }
      return retryContactAtUnits({
        ...state,
        pendingMeeting: null,
        world: {
          ...world,
          rivals: world.rivals.map((r) =>
            r.clubId === meeting.id ? { ...r, attitude: action.attitude } : r,
          ),
        },
      });
    }

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

    case "DEV_MEET_INDEPENDENT":
      return devMeetIndependent(state);

    case "DEV_SPAWN_BUILDER":
      return devSpawnBuilder(state);

    case "DEV_GRANT_POND_TECH":
      return devGrantPondTech(state);

    case "DEV_ADD_EQUIPMENT":
      return devAddEquipment(state);

    case "DEV_FORCE_TRYOUTS":
      return devForceTryouts(state);

    default:
      return state;
  }
}

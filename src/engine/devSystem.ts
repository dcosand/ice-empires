import type { GameState, PlayerPosition } from "../types/game";
import { RESEARCH } from "../data/research";
import { createWorld } from "./world";
import { ensureRivalRosters, generateRivalRoster, nearestRivalClubId } from "./rivalAI";
import { playExhibition } from "./matchEngine";
import { rollPersonIdentity } from "./playerGen";
import {
  createWandererPlayer,
  holdTryouts,
  ROSTER_CAP,
  TRYOUT_COST_FUNDS,
} from "./tryoutSystem";

// Dev tools — reachable only from the in-app dev panel, never from normal play.
// They mutate state directly (bypassing costs / prerequisites) so a developer
// can jump the game into any configuration for testing.

// Reset the calendar to month 1 while keeping the founded club + generated world.
// Clears all progress (facilities, research, active jobs) and reseeds the club's
// starting resources, so it's a clean "turn 1" of the same game.
export function devResetTurn1(state: GameState): GameState {
  if (!state.club) return state;
  return {
    ...state,
    month: 1,
    resources: { ...state.club.startingResources },
    equipment: 0,
    roster: [],
    pendingTryout: null,
    facilities: [],
    units: [],
    completedResearch: [],
    activeProduction: null,
    activeResearch: null,
    matchHistory: [],
    pendingMatchResult: null,
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
  // Prefer a rival not yet met (so the button surfaces a fresh meeting); fall
  // back to the nearest once every rival has already been contacted.
  const clubId =
    nearestRivalClubId(state, { uncontactedOnly: true }) ??
    nearestRivalClubId(state);
  if (!world || !clubId) return state;
  // Contacted rivals carry a roster (D51) — dev contact included.
  const rival = world.rivals.find((r) => r.clubId === clubId)!;
  const rolled =
    rival.roster.length > 0
      ? { roster: rival.roster, seed: state.rngSeed }
      : generateRivalRoster(state.rngSeed, rival, state.month);
  return {
    ...state,
    rngSeed: rolled.seed,
    world: {
      ...world,
      rivals: world.rivals.map((r) =>
        r.clubId === clubId ? { ...r, contacted: true, roster: rolled.roster } : r,
      ),
    },
    pendingMeeting: { kind: "rival", id: clubId },
  };
}

// Open the independent-meeting screen for the nearest unmet independent —
// mirrors devMeetRival so the flow is testable without walking a scout there.
export function devMeetIndependent(state: GameState): GameState {
  const world = state.world;
  if (!world) return state;
  const origin =
    world.hqTile ?? (world.founder ? { x: world.founder.x, y: world.founder.y } : null);
  const pool = world.hockeyOrgs.filter((o) => !o.playerContacted);
  if (!origin || pool.length === 0) return state;
  let best = pool[0];
  let bestD = Infinity;
  for (const o of pool) {
    const d = Math.hypot(o.x - origin.x, o.y - origin.y);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return {
    ...state,
    world: {
      ...world,
      hockeyOrgs: world.hockeyOrgs.map((o) =>
        o.id === best.id
          ? { ...o, discovered: true, playerContacted: true, contactMonth: state.month }
          : o,
      ),
    },
    pendingMeeting: { kind: "independent", id: best.id },
  };
}

// Drop a Rink Rats builder at (or beside) the HQ, bypassing production + tech.
export function devSpawnBuilder(state: GameState): GameState {
  const world = state.world;
  const at = world?.hqTile ?? (world?.founder ? { x: world.founder.x, y: world.founder.y } : null);
  if (!world || !at) return state;
  const id = `dev-builder-${state.month}-${world.scouts.length}`;
  return {
    ...state,
    world: {
      ...world,
      scouts: [
        ...world.scouts,
        {
          id,
          unitDefId: "rink-rats",
          name: "Rink Rats",
          kind: "builder",
          x: at.x,
          y: at.y,
          movesPerTurn: 2,
          movesRemaining: 2,
        },
      ],
      selectedScoutId: id,
    },
  };
}

// Complete every Pond Hockey era tech in one click.
export function devGrantPondTech(state: GameState): GameState {
  const pondIds = RESEARCH.filter((r) => r.eraId === "pond-hockey").map((r) => r.id);
  const merged = new Set([...state.completedResearch, ...pondIds]);
  return { ...state, completedResearch: [...merged] };
}

export function devAddEquipment(state: GameState): GameState {
  return { ...state, equipment: state.equipment + 5 };
}

// Force an exhibition game (D51): contact the nearest rival if none is met,
// gear the bench, pad the roster to a legal line with seeded stand-ins, and
// run the REAL playExhibition path (bypassing the once-a-month gate, never
// the sim) — same doctrine as Force Tryouts.
export function devForceExhibition(state: GameState): GameState {
  if (!state.club || !state.world || state.pendingMatchResult) return state;
  const draft: GameState = structuredClone(state);
  const world = draft.world!;

  // A contacted rival to play — prefer one already met, else meet the nearest
  // (quietly: no leader scene, this is a test shortcut).
  const rival =
    world.rivals.find((r) => r.contacted) ??
    world.rivals.find((r) => r.clubId === nearestRivalClubId(draft));
  if (!rival) return state;
  rival.contacted = true;
  ensureRivalRosters(draft);

  // A legal line: gear everyone on the bench, then pad with stand-ins.
  for (const p of draft.roster) p.hasEquipment = true;
  const needsGoalie = () =>
    !draft.roster.some((p) => p.hasEquipment && p.position === "G");
  const padPositions: PlayerPosition[] = ["C", "W", "D"];
  let padCount = 0;
  while (
    (draft.roster.length < 6 || needsGoalie()) &&
    draft.roster.length < ROSTER_CAP
  ) {
    const position = needsGoalie() ? "G" : padPositions[padCount % padPositions.length];
    padCount += 1;
    const identity = rollPersonIdentity(
      draft.rngSeed,
      draft.club,
      "tryoutCandidateFemale",
      new Set(draft.roster.map((p) => p.name)),
    );
    draft.rngSeed = identity.seed;
    draft.equipment += 1; // stand-ins arrive geared
    createWandererPlayer(
      draft,
      position,
      identity.name,
      identity.gender,
      identity.nationality,
    );
  }

  return playExhibition(draft, rival.clubId, { force: true });
}

// Open a tryout bypassing the tech/rink/cost gates (candidates still seeded).
export function devForceTryouts(state: GameState): GameState {
  if (state.pendingTryout) return state;
  const primed: GameState = {
    ...state,
    completedResearch: state.completedResearch.includes("local-tryouts")
      ? state.completedResearch
      : [...state.completedResearch, "local-tryouts"],
    resources: {
      ...state.resources,
      funds: Math.max(state.resources.funds, TRYOUT_COST_FUNDS),
    },
    world: state.world
      ? state.world.rinks.some((r) => r.level >= 1)
        ? state.world
        : {
            ...state.world,
            rinks: [
              ...state.world.rinks,
              {
                id: "dev-rink",
                x: state.world.hqTile?.x ?? 0,
                y: state.world.hqTile?.y ?? 0,
                level: 1,
                kind: "ice" as const,
                builtMonth: state.month,
              },
            ],
          }
      : state.world,
  };
  return holdTryouts(primed, { force: true });
}

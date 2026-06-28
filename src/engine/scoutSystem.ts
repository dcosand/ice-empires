import type { GameState } from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import {
  SCOUT_MOVES,
  addReveal,
  isAdjacent,
  regionIdAtTile,
  tileAt,
} from "./world";
import { prependLog } from "./log";
import { grantRandomCard } from "./cardSystem";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// The Scout unlocks once Scouting Reports is researched AND the club has basic
// infrastructure (at least one facility built).
export function canRecruitScout(state: GameState): boolean {
  return (
    !!state.world?.hqTile &&
    !state.world.scout &&
    state.completedResearch.includes("scouting-reports") &&
    state.facilities.length >= 1
  );
}

export function recruitScout(state: GameState): GameState {
  const world = state.world;
  if (!world || !world.hqTile || !canRecruitScout(state)) return state;
  const at = world.hqTile;
  const next: GameState = {
    ...state,
    world: {
      ...world,
      scout: {
        x: at.x,
        y: at.y,
        movesPerTurn: SCOUT_MOVES,
        movesRemaining: SCOUT_MOVES,
      },
      scoutSelected: true,
      revealed: addReveal(world.revealed, at.x, at.y),
    },
  };
  return prependLog(
    next,
    "discovery",
    "Scout recruited",
    "Your first formal Scout takes the ice. Move them out to reveal the world and survey hockey regions.",
  );
}

export function selectScout(state: GameState): GameState {
  const world = state.world;
  if (!world || !world.scout) return state;
  return { ...state, world: { ...world, scoutSelected: !world.scoutSelected } };
}

// Scout moves to an adjacent valid tile (1 point), revealing fog around it.
export function moveScout(state: GameState, x: number, y: number): GameState {
  const world = state.world;
  if (!world || !world.scout) return state;
  const scout = world.scout;
  if (scout.movesRemaining <= 0) return state;
  if (!isAdjacent(scout, { x, y })) return state;
  const tile = tileAt(world, x, y);
  if (!tile || !tile.valid) return state;

  return {
    ...state,
    world: {
      ...world,
      scout: { ...scout, x, y, movesRemaining: scout.movesRemaining - 1 },
      revealed: addReveal(world.revealed, x, y),
      scoutSelected: true,
    },
  };
}

// The region the scout can survey right now (on its tile, discovered, not yet
// surveyed/influenced).
export function surveyableRegionId(state: GameState): string | null {
  const scout = state.world?.scout;
  if (!scout) return null;
  const regionId = regionIdAtTile(scout.x, scout.y);
  if (!regionId) return null;
  const s = state.discovery.regionStates[regionId];
  return s === "discovered" || s === "rumored" ? regionId : null;
}

// Survey the region under the scout: promote to "surveyed" and surface a detail
// (resource, a prospect/staff hint, or a relationship opening).
export function surveyRegion(state: GameState, regionId: string): GameState {
  if (surveyableRegionId(state) !== regionId) return state;
  const region = REGIONS_BY_ID[regionId];
  if (!region) return state;

  let next: GameState = {
    ...state,
    discovery: {
      ...state.discovery,
      regionStates: {
        ...state.discovery.regionStates,
        [regionId]: "surveyed",
      },
    },
  };

  // A seeded survey outcome: resource detail, a prospect/staff hint, or a
  // local relationship opening.
  const roll = nextRandom(next.rngSeed);
  next = { ...next, rngSeed: roll.seed };
  const r = roll.value;

  if (r < 0.4) {
    const before = next.cards.length;
    const granted = grantSurveyCard(next, region.tags);
    next =
      granted.cards.length > before
        ? granted
        : prependLog(
            next,
            "discovery",
            `Surveyed ${region.name}`,
            `${region.scoutReport} Resource confirmed: ${region.hockeyResource}.`,
          );
  } else if (r < 0.7) {
    next = prependLog(
      next,
      "discovery",
      `Surveyed ${region.name}`,
      `Prospect hint: scouts keep mentioning a name out of ${region.name}. Worth developing a connection here.`,
    );
  } else {
    next = prependLog(
      next,
      "discovery",
      `Surveyed ${region.name}`,
      `Relationship opening: locals in ${region.name} are open to working with your club. Establish a Local Connection to bring them in.`,
    );
  }
  return next;
}

function grantSurveyCard(state: GameState, tags: string[]): GameState {
  const pool = tags.includes("goalies")
    ? ["quiet-lake-goalie"]
    : tags.includes("physical")
      ? ["prairie-defenseman", "raw-desert-winger"]
      : ["raw-desert-winger", "prairie-defenseman", "local-coach"];
  // grantRandomCard works on a draft + push; adapt to immutable here.
  const draft: GameState = structuredClone(state);
  const captured: Array<{ title: string; message: string }> = [];
  const push: PushLog = (_type, title, message) =>
    captured.push({ title, message });
  grantRandomCard(draft, pool, state.rngSeed % pool.length, push);
  if (draft.cards.length > state.cards.length && captured.length > 0) {
    return prependLog(draft, "card", captured[0].title, captured[0].message);
  }
  return state;
}

// Refresh the scout's movement points at the start of each month (silent).
export function refreshScoutMoves(draft: GameState): void {
  const scout = draft.world?.scout;
  if (!scout) return;
  scout.movesRemaining = scout.movesPerTurn;
}

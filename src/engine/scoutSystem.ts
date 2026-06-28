import type { GameState, ResourceKey, WorldPondMarker, WorldState, WorldUnit } from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import { POND_ENCOUNTERS_BY_ID } from "../data/pondEncounters";
import {
  addReveal,
  createScoutUnit,
  isAdjacent,
  regionIdAtTile,
  tileAt,
} from "./world";
import { prependLog } from "./log";
import { grantCard, grantRandomCard } from "./cardSystem";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// The Scout unlocks once Scouting Reports is researched AND the club has basic
// infrastructure (at least one facility built).
export function canRecruitScout(state: GameState): boolean {
  return (
    !!state.world?.hqTile &&
    allScouts(state.world).length === 0 &&
    state.completedResearch.includes("scouting-reports") &&
    state.facilities.length >= 1
  );
}

export function recruitScout(state: GameState): GameState {
  const world = state.world;
  if (!world || !world.hqTile || !canRecruitScout(state)) return state;
  const at = world.hqTile;
  const scout = createScoutUnit("pond-scout-recruited", at.x, at.y);
  const next: GameState = {
    ...state,
    world: {
      ...world,
      scouts: [scout],
      selectedScoutId: scout.id ?? null,
      scout,
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

export function allScouts(world: WorldState | null | undefined): WorldUnit[] {
  if (!world) return [];
  if (world.scouts?.length) return world.scouts;
  return world.scout ? [world.scout] : [];
}

export function activeScout(world: WorldState | null | undefined): WorldUnit | null {
  if (!world) return null;
  const scouts = allScouts(world);
  if (!scouts.length) return null;
  return scouts.find((s) => s.id && s.id === world.selectedScoutId) ?? null;
}

export function firstScout(world: WorldState | null | undefined): WorldUnit | null {
  return allScouts(world)[0] ?? null;
}

function syncLegacyScout(world: WorldState, scouts: WorldUnit[], selectedScoutId: string | null): WorldState {
  const selected = scouts.find((s) => s.id && s.id === selectedScoutId) ?? scouts[0] ?? null;
  return {
    ...world,
    scouts,
    selectedScoutId,
    scout: selected,
    scoutSelected: !!selectedScoutId,
  };
}

export function selectScout(state: GameState, scoutId?: string): GameState {
  const world = state.world;
  if (!world) return state;
  const scouts = allScouts(world);
  if (!scouts.length) return state;
  const target = scoutId
    ? world.selectedScoutId === scoutId
      ? null
      : scouts.find((s) => s.id === scoutId)
    : world.selectedScoutId
      ? null
      : scouts[0];
  const selectedScoutId = target?.id ?? null;
  return { ...state, world: syncLegacyScout(world, scouts, selectedScoutId) };
}

// Scout moves to an adjacent valid tile (1 point), revealing fog around it.
export function moveScout(state: GameState, x: number, y: number, scoutId?: string): GameState {
  const world = state.world;
  if (!world) return state;
  const scouts = allScouts(world);
  const selectedId = scoutId ?? world.selectedScoutId;
  const scout = scouts.find((s) => s.id && s.id === selectedId);
  if (!scout) return state;
  if (scout.movesRemaining <= 0) return state;
  if (!isAdjacent(scout, { x, y })) return state;
  const tile = tileAt(world, x, y);
  if (!tile || !tile.valid) return state;
  const moved = { ...scout, x, y, movesRemaining: scout.movesRemaining - 1 };
  const nextScouts = scouts.map((s) => (s.id === scout.id ? moved : s));

  return {
    ...state,
    world: syncLegacyScout(
      {
        ...world,
        revealed: addReveal(world.revealed, x, y),
        hockeyOrgs: world.hockeyOrgs.map((org) =>
          Math.abs(org.x - x) <= 1 && Math.abs(org.y - y) <= 1
            ? { ...org, discovered: true }
            : org,
        ),
      },
      nextScouts,
      moved.id ?? selectedId ?? null,
    ),
  };
}

// The region the scout can survey right now (on its tile, discovered, not yet
// surveyed/influenced).
export function surveyableRegionId(state: GameState): string | null {
  const scout = activeScout(state.world);
  if (!scout) return null;
  const regionId = regionIdAtTile(scout.x, scout.y);
  if (!regionId) return null;
  const s = state.discovery.regionStates[regionId];
  return s === "discovered" || s === "rumored" ? regionId : null;
}

export function investigablePondMarker(state: GameState): WorldPondMarker | null {
  const scout = activeScout(state.world);
  const world = state.world;
  if (!scout || !world) return null;
  return (
    world.pondMarkers.find(
      (m) => !m.investigated && m.x === scout.x && m.y === scout.y,
    ) ?? null
  );
}

export function investigatePondMarker(state: GameState, markerId: string): GameState {
  const world = state.world;
  const marker = investigablePondMarker(state);
  if (!world || !marker || marker.id !== markerId) return state;
  const encounter = POND_ENCOUNTERS_BY_ID[marker.encounterId];
  if (!encounter) return state;

  let next: GameState = {
    ...state,
    world: {
      ...world,
      pondMarkers: world.pondMarkers.map((m) =>
        m.id === marker.id ? { ...m, investigated: true } : m,
      ),
    },
  };

  const roll = nextRandom(next.rngSeed + marker.x * 31 + marker.y * 17);
  next = { ...next, rngSeed: roll.seed };
  const effects = encounter.possibleEffects;
  const effect = effects[Math.floor(roll.value * effects.length)] ?? effects[0];
  let detail = encounter.description;

  if (effect?.type === "addResource") {
    next = {
      ...next,
      resources: {
        ...next.resources,
        [effect.resource]: next.resources[effect.resource] + effect.amount,
      },
    };
    detail = `${detail} Outcome: +${effect.amount} ${resourceLabel(effect.resource)}.`;
  } else if (effect?.type === "addCard") {
    const before = next.cards.length;
    const draft: GameState = structuredClone(next);
    grantCard(draft, effect.cardId, () => undefined);
    next = draft.cards.length > before ? draft : next;
    detail =
      draft.cards.length > before
        ? `${detail} Outcome: a new hockey person joins your club.`
        : `${detail} Outcome: the lead was already in your notebook.`;
  } else if (effect?.type === "teamAttribute") {
    detail = `${detail} Outcome: +${effect.amount} future ${effect.attribute} development.`;
  } else if (effect?.type === "setback") {
    detail = `${detail} Outcome: ${effect.message}`;
  } else {
    detail = `${detail} Outcome: a useful rumor for the scouting files.`;
  }

  return prependLog(
    next,
    "discovery",
    `Investigated ${encounter.name}`,
    `Goodie hut: ${marker.kind.replace("-", " ")}. ${detail}`,
  );
}

function resourceLabel(resource: ResourceKey): string {
  if (resource === "hockeyKnowledge") return "Hockey Knowledge";
  return resource.charAt(0).toUpperCase() + resource.slice(1);
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
  const world = draft.world;
  if (!world) return;
  const scouts = allScouts(world).map((scout) => ({
    ...scout,
    movesRemaining: scout.movesPerTurn,
  }));
  draft.world = syncLegacyScout(world, scouts, world.selectedScoutId);
}

export function spawnProducedScout(
  draft: GameState,
  instanceId: string,
  name = "Pond Scout",
): void {
  const world = draft.world;
  if (!world?.hqTile) return;
  const scouts = allScouts(world);
  const scout = createScoutUnit(instanceId, world.hqTile.x, world.hqTile.y, name);
  draft.world = syncLegacyScout(
    {
      ...world,
      revealed: addReveal(world.revealed, world.hqTile.x, world.hqTile.y),
    },
    [...scouts, scout],
    scout.id ?? null,
  );
}

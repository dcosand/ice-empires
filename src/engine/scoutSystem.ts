import type {
  EncounterEffect,
  GameState,
  ResourceKey,
  WorldState,
  WorldUnit,
} from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import { RESEARCH_BY_ID } from "../data/research";
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

// A goodie hut auto-resolves the instant a unit steps onto it: we roll the
// outcome, hide the marker, and stage a PendingEncounter for the UI to surface
// as a pop-up. The effect itself is NOT applied yet — that happens on
// acknowledgement (resolvePendingEncounter), so the player sees the event first.
export function triggerPondEncounter(state: GameState, x: number, y: number): GameState {
  const world = state.world;
  if (!world || state.pendingEncounter) return state;

  // Only fire if a unit is actually standing on the tile (a failed/blocked move
  // must not detonate a distant hut).
  const unitHere =
    (world.founder && world.founder.x === x && world.founder.y === y) ||
    allScouts(world).some((s) => s.x === x && s.y === y);
  if (!unitHere) return state;

  const marker = world.pondMarkers.find(
    (m) => !m.investigated && m.x === x && m.y === y,
  );
  if (!marker) return state;
  const encounter = POND_ENCOUNTERS_BY_ID[marker.encounterId];
  if (!encounter) return state;

  const roll = nextRandom(state.rngSeed + marker.x * 31 + marker.y * 17);
  const effects = encounter.possibleEffects;
  const effect = effects[Math.floor(roll.value * effects.length)] ?? effects[0];
  const { outcome, tone } = describeOutcome(effect);

  return {
    ...state,
    rngSeed: roll.seed,
    world: {
      ...world,
      pondMarkers: world.pondMarkers.map((m) =>
        m.id === marker.id ? { ...m, investigated: true } : m,
      ),
    },
    pendingEncounter: {
      markerId: marker.id,
      encounterId: encounter.id,
      name: encounter.name,
      kind: marker.kind,
      description: encounter.description,
      outcome,
      tone,
      effect,
    },
  };
}

// Apply the staged goodie-hut effect once the player acknowledges the pop-up,
// then log it and clear the pending encounter.
export function resolvePendingEncounter(state: GameState): GameState {
  const pe = state.pendingEncounter;
  if (!pe) return state;
  const effect = pe.effect;

  let next: GameState = { ...state, pendingEncounter: null };

  if (effect.type === "addResource") {
    next = {
      ...next,
      resources: {
        ...next.resources,
        [effect.resource]: next.resources[effect.resource] + effect.amount,
      },
    };
  } else if (effect.type === "setback" && effect.resource && effect.amount) {
    next = {
      ...next,
      resources: {
        ...next.resources,
        [effect.resource]: Math.max(0, next.resources[effect.resource] - effect.amount),
      },
    };
  } else if (effect.type === "addCard") {
    const draft: GameState = structuredClone(next);
    grantCard(draft, effect.cardId, () => undefined);
    next = draft;
  } else if (effect.type === "grantTech") {
    if (!next.completedResearch.includes(effect.techId)) {
      const draft: GameState = structuredClone(next);
      draft.completedResearch = [...draft.completedResearch, effect.techId];
      const def = RESEARCH_BY_ID[effect.techId];
      if (def) {
        for (const unlock of def.unlocks) {
          if (unlock.type === "card") grantCard(draft, unlock.cardId, () => undefined);
        }
      }
      next = draft;
    }
  }
  // teamAttribute / flavorOnly: no mechanical change yet.

  return prependLog(
    next,
    "discovery",
    `Investigated ${pe.name}`,
    `Goodie hut: ${pe.kind.replace("-", " ")}. ${pe.description} Outcome: ${pe.outcome}`,
  );
}

// Human-readable result line + tone for an encounter effect, shown in the pop-up
// and reused in the event log.
function describeOutcome(effect: EncounterEffect): {
  outcome: string;
  tone: "good" | "bad" | "neutral";
} {
  switch (effect.type) {
    case "addResource":
      return { outcome: `+${effect.amount} ${resourceLabel(effect.resource)}.`, tone: "good" };
    case "addCard":
      return { outcome: "A new hockey person joins your club.", tone: "good" };
    case "teamAttribute":
      return {
        outcome: `+${effect.amount} future ${effect.attribute} development.`,
        tone: "good",
      };
    case "grantTech": {
      const def = RESEARCH_BY_ID[effect.techId];
      return {
        outcome: `Free technology unlocked: ${def?.name ?? effect.techId}.`,
        tone: "good",
      };
    }
    case "setback":
      return {
        outcome:
          effect.resource && effect.amount
            ? `${effect.message} (-${effect.amount} ${resourceLabel(effect.resource)})`
            : effect.message,
        tone: "bad",
      };
    default:
      return { outcome: "A useful rumor for the scouting files.", tone: "neutral" };
  }
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

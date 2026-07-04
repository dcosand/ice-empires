import type {
  EncounterEffect,
  GameState,
  PlayerGender,
  ResourceKey,
  ScoutQualityTier,
  WorldHockeyOrg,
  WorldState,
  WorldUnit,
} from "../types/game";
import { CARDS_BY_ID } from "../data/cards";
import {
  FEMALE_FIRST_NAMES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
} from "../data/playerNames";
import { RESEARCH_BY_ID } from "../data/research";
import { POND_ENCOUNTERS_BY_ID } from "../data/pondEncounters";
import {
  addReveal,
  BUILDER_SIGHT,
  createScoutUnit,
  isAdjacent,
  SCOUT_SIGHT,
  tileAt,
} from "./world";
import { prependLog } from "./log";
import { grantCard } from "./cardSystem";
import { createWandererPlayer } from "./tryoutSystem";
import { nextRandom } from "./rng";
import {
  awardScoutXpDraft,
  rollScoutCharacter,
  scoutCharacterFor,
} from "./scoutStaff";
import { SCOUT_XP_ENCOUNTER, SCOUT_XP_NETWORK } from "../data/scouts";
import { levelForInfluence } from "./independentsSystem";
import type { PushLog } from "./turnContext";
// The Scout unlocks once Scouting Reports is researched AND the club has basic
// infrastructure (at least one facility built). Builders don't count — owning
// a Rink Rats crew shouldn't block recruiting your first scout.
export function canRecruitScout(state: GameState): boolean {
  return (
    !!state.world?.hqTile &&
    allScouts(state.world).filter((u) => u.kind !== "builder").length === 0 &&
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
      revealed: addReveal(world, world.revealed, at.x, at.y, SCOUT_SIGHT),
    },
  };
  return prependLog(
    next,
    "discovery",
    "Scout recruited",
    "Your first formal Scout takes the ice. Move them out to reveal the world and reach the independents and rival clubs scattered across it.",
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

// Exported for builderSystem, which also mutates the shared field-unit array.
export function syncLegacyScout(world: WorldState, scouts: WorldUnit[], selectedScoutId: string | null): WorldState {
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
  const sight = scout.kind === "builder" ? BUILDER_SIGHT : SCOUT_SIGHT;

  return {
    ...state,
    world: syncLegacyScout(
      {
        ...world,
        revealed: addReveal(world, world.revealed, x, y, sight),
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
  // Credit the scout standing on the hut (fieldwork XP on resolve). The
  // founder isn't a scout character, so founding-phase huts credit nobody.
  const finder = allScouts(world).find(
    (s) => s.x === x && s.y === y && s.kind !== "builder",
  );

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
      unitId: finder?.id,
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

  // Fieldwork XP for the scout who found the hut (D29).
  if (pe.unitId && scoutCharacterFor(next, pe.unitId)) {
    next = {
      ...next,
      scoutStaff: next.scoutStaff.map((s) =>
        s.id === pe.unitId ? { ...s, xp: s.xp + SCOUT_XP_ENCOUNTER } : s,
      ),
    };
  }

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
  } else if (effect.type === "addRosterPlayer") {
    const draft: GameState = structuredClone(next);
    const identity = wandererIdentity(draft);
    const player = createWandererPlayer(
      draft,
      effect.position,
      identity.name,
      identity.gender,
    );
    if (!player) {
      // Roster full: the wanderer nods and moves on; the story still pays.
      draft.resources.reputation += 1;
    } else {
      // A wanderer joining is always a moment — stage the reveal cinematic,
      // with the fullest fanfare if they're the club's very first player.
      draft.pendingPlayerReveal = {
        player,
        source: "encounter",
        firstEver: !draft.seenFirstPlayer,
      };
      draft.seenFirstPlayer = true;
    }
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
    case "addCard": {
      const card = CARDS_BY_ID[effect.cardId];
      const role =
        card?.type === "staff"
          ? "joins your staff"
          : card?.type === "prospect"
            ? "joins as a prospect"
            : "joins your club";
      return {
        outcome: `${card?.name ?? "A new hockey person"} ${role} — see them under Cards (or Club HQ → Personnel).`,
        tone: "good",
      };
    }
    case "addRosterPlayer":
      return {
        outcome: `They join your roster as a ${
          effect.position === "G" ? "goalie" : effect.position === "D" ? "defenseman" : "forward"
        } — see Club HQ → Team.`,
        tone: "good",
      };
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

// A wanderer gets a real name from the player pools (seeded).
function wandererIdentity(draft: GameState): { name: string; gender: PlayerGender } {
  const r1 = nextRandom(draft.rngSeed);
  const r2 = nextRandom(r1.seed);
  const r3 = nextRandom(r2.seed);
  draft.rngSeed = r3.seed;
  const gender: PlayerGender = r1.value < 0.32 ? "female" : "male";
  const firstPool = gender === "female" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
  const first = firstPool[Math.floor(r2.value * firstPool.length)];
  const last = LAST_NAMES[Math.floor(r3.value * LAST_NAMES.length)];
  return {
    gender,
    name: `${first} ${last}`,
  };
}

function resourceLabel(resource: ResourceKey): string {
  if (resource === "hockeyKnowledge") return "Hockey Knowledge";
  return resource.charAt(0).toUpperCase() + resource.slice(1);
}


// Refresh each unit's movement points at the start of each month (silent).
// Units mid-construction (`working` set) stay pinned at 0 moves until done.
export function refreshScoutMoves(draft: GameState): void {
  const world = draft.world;
  if (!world) return;
  const scouts = allScouts(world).map((unit) =>
    unit.working ? { ...unit, movesRemaining: 0 } : { ...unit, movesRemaining: unit.movesPerTurn },
  );
  draft.world = syncLegacyScout(world, scouts, world.selectedScoutId);
}

export function spawnProducedScout(
  draft: GameState,
  instanceId: string,
  _defName = "Pond Scout",
  tier: ScoutQualityTier = "volunteer",
): void {
  const world = draft.world;
  if (!world?.hqTile) return;
  const scouts = allScouts(world);
  // The map unit carries the scout PERSON's name (D29 scout characters).
  const rolled = rollScoutCharacter(draft.rngSeed, instanceId, tier, draft.month);
  draft.rngSeed = rolled.seed;
  draft.scoutStaff.push(rolled.character);
  const scout = createScoutUnit(
    instanceId,
    world.hqTile.x,
    world.hqTile.y,
    rolled.character.name,
  );
  draft.world = syncLegacyScout(
    {
      ...world,
      revealed: addReveal(world, world.revealed, world.hqTile.x, world.hqTile.y, SCOUT_SIGHT),
    },
    [...scouts, scout],
    scout.id ?? null,
  );
}

// ---------------------------------------------------------------------------
// Establish Scouting Network (Act II, docs/13 §4.5): park a scout beside a
// contacted independent for 2 months to reveal their prospect pipeline.
// ---------------------------------------------------------------------------

export const NETWORK_MONTHS = 2;
export const NETWORK_INFLUENCE_GAIN = 10;

// The org this scout could network with right now (adjacent or same tile,
// contacted, not already networked). Null when there's nothing in reach.
export function networkTargetOrg(
  state: GameState,
  unitId: string,
): WorldHockeyOrg | null {
  const world = state.world;
  if (!world) return null;
  const unit = allScouts(world).find((u) => u.id === unitId);
  if (!unit || unit.kind === "builder" || unit.working) return null;
  if (unit.movesRemaining <= 0) return null;
  if (!state.completedResearch.includes("scouting-reports")) return null;
  return (
    world.hockeyOrgs.find(
      (o) =>
        o.playerContacted &&
        !o.networkedByPlayer &&
        ((o.x === unit.x && o.y === unit.y) || isAdjacent(unit, o)),
    ) ?? null
  );
}

export function canEstablishNetwork(state: GameState, unitId: string): boolean {
  return !!networkTargetOrg(state, unitId);
}

export function establishNetwork(
  state: GameState,
  unitId: string,
  orgId: string,
): GameState {
  const org = networkTargetOrg(state, unitId);
  if (!org || org.id !== orgId) return state;
  const world = state.world!;
  const scouts = allScouts(world).map((u) =>
    u.id === unitId
      ? {
          ...u,
          movesRemaining: 0,
          working: {
            task: "establish-network" as const,
            orgId,
            monthsRemaining: NETWORK_MONTHS,
          },
        }
      : u,
  );
  const next: GameState = {
    ...state,
    world: syncLegacyScout({ ...world }, scouts, world.selectedScoutId),
  };
  const who = scoutCharacterFor(state, unitId);
  return prependLog(
    next,
    "discovery",
    `Scouting network underway: ${org.name}`,
    `${who?.name ?? "Your scout"} settles in with ${org.name} — rink coffees, junior games, names in a notebook (${NETWORK_MONTHS} months).`,
  );
}

// Monthly tick for scout fieldwork (runs alongside progressBuilderWork, which
// owns rink tasks). Completing a network reveals the org's prospects, grants
// influence, and pays the scout XP.
export function progressScoutWork(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const unit of allScouts(world)) {
    if (!unit.working || unit.working.task !== "establish-network") continue;
    unit.working.monthsRemaining -= 1;
    const org = world.hockeyOrgs.find((o) => o.id === (unit.working as { orgId: string }).orgId);
    if (!org) {
      unit.working = undefined;
      continue;
    }
    if (unit.working.monthsRemaining > 0) {
      push(
        "discovery",
        "Scouting network taking shape",
        `${unit.name ?? "Your scout"} keeps the visits up at ${org.name} — ${unit.working.monthsRemaining} month${
          unit.working.monthsRemaining === 1 ? "" : "s"
        } to a working network.`,
      );
      continue;
    }
    unit.working = undefined;
    org.networkedByPlayer = true;
    org.networkMonth = draft.month;
    org.influencePoints += NETWORK_INFLUENCE_GAIN;
    org.relationshipLevel = levelForInfluence(org.influencePoints);
    revealOrgProspects(draft, org);
    awardScoutXpDraft(draft, unit.id, SCOUT_XP_NETWORK);
    push(
      "discovery",
      `Scouting network established: ${org.name}`,
      `Their prospect pipeline is open to you — real names, real reads (+${NETWORK_INFLUENCE_GAIN} Influence). ${
        unit.name ?? "Your scout"
      } earns their keep.`,
    );
  }
  draft.world = syncLegacyScout(world, allScouts(world), world.selectedScoutId);
}

// Fill in a networked org's prospect identities (seeded). Attribute quality is
// modest Act-II fare; academies grow slightly stronger kids. True attributes —
// fog-of-talent (D29 task 3) will later blur these by scout judging.
function revealOrgProspects(draft: GameState, org: WorldHockeyOrg): void {
  const academyBonus = org.archetype === "academy" ? 1 : 0;
  for (const p of org.prospects) {
    if (p.revealed) continue;
    const r1 = nextRandom(draft.rngSeed);
    const r2 = nextRandom(r1.seed);
    const r3 = nextRandom(r2.seed);
    const r4 = nextRandom(r3.seed);
    const r5 = nextRandom(r4.seed);
    const r6 = nextRandom(r5.seed);
    const r7 = nextRandom(r6.seed);
    const r8 = nextRandom(r7.seed);
    draft.rngSeed = r8.seed;

    const female = r1.value < 0.32;
    const firstPool = female ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
    const roll = (v: number, min: number, die: number) =>
      min + 1 + Math.floor(v * die) + academyBonus;

    p.revealed = true;
    p.name = `${firstPool[Math.floor(r2.value * firstPool.length)]} ${
      LAST_NAMES[Math.floor(r3.value * LAST_NAMES.length)]
    }`;
    p.age = 15 + Math.floor(r4.value * 5);
    p.attrs = {
      skating: roll(r5.value, 2, 6),
      shooting: roll(r6.value, p.position === "G" ? 1 : 2, p.position === "G" ? 4 : 6),
      passing: roll(r7.value, p.position === "G" ? 1 : 2, p.position === "G" ? 4 : 6),
      checking: roll(r8.value, p.position === "D" ? 3 : 1, 5),
      goaltending: p.position === "G" ? roll(r5.value, 3, 6) : 1,
    };
  }
}

import type {
  EncounterEffect,
  GameState,
  PlayerGender,
  ResourceKey,
  ScoutCharacter,
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
  tileKey,
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
import { estimateAttr, estimateAttrs } from "./talentFog";
import { levelForInfluence } from "./independentsSystem";
import {
  computeTerritory,
  isKnownRivalTerritory,
  PLAYER_OWNER,
} from "./territorySystem";
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

export function nextReadyUnitId(scouts: WorldUnit[], moved: WorldUnit): string | null {
  const current = moved.id ? scouts.find((s) => s.id === moved.id) : null;
  if (current?.id && current.movesRemaining > 0 && !current.working) return current.id;
  const ready = scouts.filter((s) => s.id && s.movesRemaining > 0 && !s.working);
  if (ready.length === 0) return null;

  const movedIndex = Math.max(
    0,
    scouts.findIndex((s) => s.id === moved.id),
  );
  return (
    ready.find((s) => scouts.findIndex((unit) => unit.id === s.id) > movedIndex) ??
    ready[0]
  ).id ?? null;
}

function selectedOrFirstReadyUnitId(
  scouts: WorldUnit[],
  selectedScoutId: string | null,
): string | null {
  const selected = scouts.find((s) => s.id === selectedScoutId);
  if (selected?.id && selected.movesRemaining > 0 && !selected.working) {
    return selected.id;
  }
  return scouts.find((s) => s.id && s.movesRemaining > 0 && !s.working)?.id ?? null;
}

// Tiles a unit may move to right now (adjacent, valid land/ice, points left).
// Movement tiers (D36): scouts cross all borders freely — recon and diplomacy
// travel; builders (work crews) cannot enter a known rival's territory.
export function moveableTilesFor(
  world: WorldState,
  unit: WorldUnit | null,
): Set<string> {
  const out = new Set<string>();
  if (!unit || unit.movesRemaining <= 0) return out;
  const territory = unit.kind === "builder" ? computeTerritory(world) : null;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      const tile = tileAt(world, x, y);
      if (!tile || !tile.valid) continue;
      const owner = territory?.ownerByTile[tileKey(x, y)];
      if (owner && owner !== PLAYER_OWNER) continue;
      out.add(tileKey(x, y));
    }
  }
  return out;
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
  // Work crews stay home (D36): builders cannot cross a known rival's border.
  if (scout.kind === "builder" && isKnownRivalTerritory(world, x, y)) return state;
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
      nextReadyUnitId(nextScouts, moved),
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
  draft.world = syncLegacyScout(
    world,
    scouts,
    selectedOrFirstReadyUnitId(scouts, world.selectedScoutId),
  );
}

export function spawnProducedScout(
  draft: GameState,
  instanceId: string,
  unitDefId = "pond-scout",
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
    unitDefId,
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
// Establish Scouting Network (D38): the Club Scout is the ONLY unit that opens
// an independent's prospect pipeline, and it lands INSTANTLY on arrival beside
// a contacted org — the trek across the map is the cost, not an on-site wait.
// Supersedes v1 (any scout + scouting-reports, 2-month park).
// ---------------------------------------------------------------------------

export const CLUB_SCOUT_UNIT_ID = "club-scout";
export const NETWORK_INFLUENCE_GAIN = 10;

// The org this Club Scout could network with right now (adjacent or same tile,
// contacted, not already networked). Null when there's nothing in reach.
// No movement-points check: networks land on arrival, spent legs and all.
export function networkTargetOrg(
  state: GameState,
  unitId: string,
): WorldHockeyOrg | null {
  const world = state.world;
  if (!world) return null;
  const unit = allScouts(world).find((u) => u.id === unitId);
  if (!unit || unit.unitDefId !== CLUB_SCOUT_UNIT_ID || unit.working) return null;
  return (
    world.hockeyOrgs.find(
      (o) =>
        o.playerContacted &&
        !o.networkedByPlayer &&
        ((o.x === unit.x && o.y === unit.y) || isAdjacent(unit, o)),
    ) ?? null
  );
}

// Shared completion (draft-mutating): open the pipeline, pay influence and XP.
function completeNetworkDraft(
  draft: GameState,
  unitId: string,
  org: WorldHockeyOrg,
): void {
  org.networkedByPlayer = true;
  org.networkMonth = draft.month;
  org.influencePoints += NETWORK_INFLUENCE_GAIN;
  org.relationshipLevel = levelForInfluence(org.influencePoints);
  revealOrgProspects(draft, org, scoutCharacterFor(draft, unitId));
  awardScoutXpDraft(draft, unitId, SCOUT_XP_NETWORK);
}

function networkLogMessage(scoutName: string | undefined, orgName: string): string {
  return `${scoutName ?? "Your Club Scout"} arrives with a notebook full of names — ${orgName}'s prospect pipeline is open to you (+${NETWORK_INFLUENCE_GAIN} Influence).`;
}

// Reducer-path establish (also the ledger/overlay button): instant.
export function establishNetwork(
  state: GameState,
  unitId: string,
  orgId: string,
): GameState {
  const target = networkTargetOrg(state, unitId);
  if (!target || target.id !== orgId) return state;
  const draft: GameState = structuredClone(state);
  const org = draft.world!.hockeyOrgs.find((o) => o.id === orgId)!;
  completeNetworkDraft(draft, unitId, org);
  return prependLog(
    draft,
    "discovery",
    `Scouting network established: ${org.name}`,
    networkLogMessage(scoutCharacterFor(draft, unitId)?.name, org.name),
  );
}

// On-arrival sweep, run after every move (and monthly below): any Club Scout
// standing beside a contacted, un-networked independent networks it now.
export function autoEstablishNetworks(state: GameState): GameState {
  let next = state;
  for (const unit of allScouts(state.world)) {
    if (!unit.id) continue;
    const org = networkTargetOrg(next, unit.id);
    if (org) next = establishNetwork(next, unit.id, org.id);
  }
  return next;
}

// Monthly tick for scout fieldwork: catches Club Scouts already in position
// when an org becomes contacted (or produced next to one).
export function progressScoutWork(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const unit of allScouts(world)) {
    if (!unit.id || unit.unitDefId !== CLUB_SCOUT_UNIT_ID || unit.working) continue;
    const org = world.hockeyOrgs.find(
      (o) =>
        o.playerContacted &&
        !o.networkedByPlayer &&
        ((o.x === unit.x && o.y === unit.y) || isAdjacent(unit, o)),
    );
    if (!org) continue;
    completeNetworkDraft(draft, unit.id, org);
    push(
      "discovery",
      `Scouting network established: ${org.name}`,
      networkLogMessage(unit.name, org.name),
    );
  }
}

// Fill in a networked org's prospect identities (seeded). True attributes and
// ceiling are stored engine-side; what the UI gets is fog-of-talent ESTIMATES
// (docs/13 §6.3) whose tightness scales with the establishing scout's judging
// ratings — a sharp-eyed ace gives you narrow, trustworthy reads.
function revealOrgProspects(
  draft: GameState,
  org: WorldHockeyOrg,
  scout: ScoutCharacter | null,
): void {
  const academyBonus = org.archetype === "academy" ? 1 : 0;
  const judgingAbility = scout?.judgingAbility ?? 3;
  const judgingPotential = scout?.judgingPotential ?? 3;
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
    const r9 = nextRandom(r8.seed);
    draft.rngSeed = r9.seed;

    const female = r1.value < 0.32;
    const firstPool = female ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
    const roll = (v: number, min: number, die: number) =>
      min + 1 + Math.floor(v * die) + academyBonus;

    p.revealed = true;
    p.knownVia = "scout-network";
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
    // True ceiling: somewhere above their best current attribute.
    const best = Math.max(
      p.attrs.skating,
      p.attrs.shooting,
      p.attrs.passing,
      p.attrs.checking,
      p.attrs.goaltending,
    );
    p.potential = Math.min(20, best + 2 + Math.floor(r9.value * 6));

    // The scout's read: estimates, not truth.
    const est = estimateAttrs(draft.rngSeed, p.attrs, judgingAbility);
    draft.rngSeed = est.seed;
    p.attrEstimates = est.estimates;
    const pot = estimateAttr(draft.rngSeed, p.potential, judgingPotential);
    draft.rngSeed = pot.seed;
    p.potentialEstimate = pot.estimate;
  }
}

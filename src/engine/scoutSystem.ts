import type {
  EncounterEffect,
  GameState,
  OrgProspect,
  PersonNationality,
  ResourceKey,
  ScoutCharacter,
  ScoutQualityTier,
  WorldHockeyOrg,
  WorldState,
  WorldUnit,
} from "../types/game";
import { CARDS_BY_ID } from "../data/cards";
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
import { SCOUT_XP_ENCOUNTER, SCOUT_XP_NETWORK, WATCH_SLOTS } from "../data/scouts";
import { estimateAttr, estimateAttrs } from "./talentFog";
import {
  type NationalitySource,
  PROSPECT_BAND,
  rollAttrs,
  rollPersonIdentity,
  rollPersonIdentityForNationality,
  rollPotential,
  rollStyle,
} from "./playerGen";
import { prospectReport } from "./scoutReport";
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
    const identity = wandererIdentity(draft, pe.markerId);
    const player = createWandererPlayer(
      draft,
      effect.position,
      identity.name,
      identity.gender,
      identity.nationality,
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

// A wanderer gets a real identity from the nearest hockey context if possible.
function wandererIdentity(
  draft: GameState,
  markerId: string,
): { name: string; gender: "male" | "female"; nationality: PersonNationality } {
  const usedNames = new Set(draft.roster.map((p) => p.name));
  const identity = rollPersonIdentity(
    draft.rngSeed,
    wandererNationalitySource(draft, markerId),
    "scoutedPlayerFemale",
    usedNames,
  );
  draft.rngSeed = identity.seed;
  return {
    gender: identity.gender,
    name: identity.name,
    nationality: identity.nationality,
  };
}

function wandererNationalitySource(
  draft: GameState,
  markerId: string,
): NationalitySource | null | undefined {
  const world = draft.world;
  if (!world) return draft.club;
  const marker = world.pondMarkers.find((m) => m.id === markerId);
  if (!marker) return draft.club;
  const sources: ({ x: number; y: number } & NationalitySource)[] = [];
  if (draft.club && world.hqTile) {
    sources.push({
      x: world.hqTile.x,
      y: world.hqTile.y,
      homeNationId: draft.club.homeNationId,
      nationalityWeights: draft.club.nationalityWeights,
    });
  }
  for (const rival of world.rivals) {
    sources.push({
      x: rival.hqTile.x,
      y: rival.hqTile.y,
      homeNationId: rival.homeNationId,
      nationalityWeights: rival.nationalityWeights,
    });
  }
  for (const org of world.hockeyOrgs) {
    sources.push({
      x: org.x,
      y: org.y,
      homeNationId: org.homeNationId,
      nationalityWeights: org.nationalityWeights,
    });
  }
  sources.sort(
    (a, b) =>
      Math.hypot(a.x - marker.x, a.y - marker.y) -
      Math.hypot(b.x - marker.x, b.y - marker.y),
  );
  return sources[0] ?? draft.club;
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
  const scouts = allScouts(world).map((unit) => {
    // Penalty box (wanderer scrap): pinned at 0 moves; the sentence burns down
    // one turn at a time.
    if ((unit.penaltyBoxTurns ?? 0) > 0) {
      const remaining = (unit.penaltyBoxTurns ?? 0) - 1;
      return {
        ...unit,
        penaltyBoxTurns: remaining > 0 ? remaining : undefined,
        movesRemaining: 0,
      };
    }
    return unit.working
      ? { ...unit, movesRemaining: 0 }
      : { ...unit, movesRemaining: unit.movesPerTurn };
  });
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
  const rolled = rollScoutCharacter(
    draft.rngSeed,
    instanceId,
    tier,
    draft.month,
    draft.club,
    new Set(draft.scoutStaff.map((s) => s.name)),
  );
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
// A mission files a report batch every N months on assignment (docs/15 §5).
export const MISSION_REPORT_MONTHS = 2;

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

// Identify an org's full roster (docs/15 §6: first contact = you SEE the
// whole player list). Names, ages, styles — and the engine-side truth —
// generate here; nothing numeric shows until a scout files reports.
export function identifyOrgProspects(draft: GameState, org: WorldHockeyOrg): void {
  const academyBoost = org.archetype === "academy" ? 5 : 0;
  const usedNames = new Set(
    (draft.world?.hockeyOrgs ?? [])
      .flatMap((o) => o.prospects)
      .map((p) => p.name)
      .filter((name): name is string => !!name),
  );
  for (const p of org.prospects) {
    if (p.name) continue;
    const identity = rollPersonIdentityForNationality(
      draft.rngSeed,
      p.nationality,
      "scoutedPlayerFemale",
      usedNames,
    );
    draft.rngSeed = identity.seed;
    const ageRoll = nextRandom(draft.rngSeed);
    draft.rngSeed = ageRoll.seed;
    p.revealed = true;
    p.knownVia = "org-word";
    p.name = identity.name;
    p.gender = identity.gender;
    p.age = 15 + Math.floor(ageRoll.value * 5);

    const style = rollStyle(draft.rngSeed, p.position);
    draft.rngSeed = style.seed;
    p.style = style.style;
    const attrs = rollAttrs(draft.rngSeed, p.position, style.style, {
      min: PROSPECT_BAND.min + academyBoost,
      span: PROSPECT_BAND.span,
    });
    draft.rngSeed = attrs.seed;
    p.attrs = attrs.attrs;
    // Prospects carry the biggest upside — that's why they're worth scouting.
    const pot = rollPotential(draft.rngSeed, p.position, attrs.attrs, {
      min: 12,
      span: 30,
    });
    draft.rngSeed = pot.seed;
    p.potential = pot.potential;
  }
}

// Establish Scouting Network — EXPLICIT: the player clicks the order when a
// Club Scout stands at a contacted independent. Instant (the trek was the
// cost), pays influence + XP, and stages the celebration scene. Reads on the
// players still require an assignment (docs/15 §5) — the network opens the
// door; the mission does the watching.
export function establishNetwork(
  state: GameState,
  unitId: string,
  orgId: string,
): GameState {
  const target = networkTargetOrg(state, unitId);
  if (!target || target.id !== orgId) return state;
  const draft: GameState = structuredClone(state);
  const org = draft.world!.hockeyOrgs.find((o) => o.id === orgId)!;
  org.networkedByPlayer = true;
  org.networkMonth = draft.month;
  org.influencePoints += NETWORK_INFLUENCE_GAIN;
  org.relationshipLevel = levelForInfluence(org.influencePoints);
  identifyOrgProspects(draft, org); // safety net if contact predates identity
  awardScoutXpDraft(draft, unitId, SCOUT_XP_NETWORK);
  draft.pendingNetwork = { orgId, unitId };
  const who = scoutCharacterFor(draft, unitId);
  return prependLog(
    draft,
    "discovery",
    `Scouting network established: ${org.name}`,
    `${who?.name ?? "Your Club Scout"} shakes the right hands at ${org.name} — their pipeline is open to you (+${NETWORK_INFLUENCE_GAIN} Influence). Assign them to stay and watch, and the reports will start coming.`,
  );
}

// ---------------------------------------------------------------------------
// Scouting assignments (docs/15 §5): park a Club Scout at a networked org and
// reports arrive on a cadence — repeat viewings sharpen every read.
// ---------------------------------------------------------------------------

// The networked org this Club Scout could start observing right now.
export function missionTargetOrg(
  state: GameState,
  unitId: string,
): WorldHockeyOrg | null {
  const world = state.world;
  if (!world) return null;
  const unit = allScouts(world).find((u) => u.id === unitId);
  if (!unit || unit.unitDefId !== CLUB_SCOUT_UNIT_ID || unit.working) return null;
  if (state.scoutMissions.some((m) => m.unitId === unitId)) return null;
  return (
    world.hockeyOrgs.find(
      (o) =>
        o.networkedByPlayer &&
        !state.scoutMissions.some((m) => m.orgId === o.id) &&
        ((o.x === unit.x && o.y === unit.y) || isAdjacent(unit, o)),
    ) ?? null
  );
}

export function beginScoutMission(
  state: GameState,
  unitId: string,
  orgId: string,
): GameState {
  const org = missionTargetOrg(state, unitId);
  if (!org || org.id !== orgId) return state;
  const world = state.world!;
  const scouts = allScouts(world).map((u) =>
    u.id === unitId
      ? { ...u, movesRemaining: 0, working: { task: "scout-org" as const, orgId } }
      : u,
  );
  const next: GameState = {
    ...state,
    scoutMissions: [
      ...state.scoutMissions,
      {
        unitId,
        orgId,
        startMonth: state.month,
        monthsActive: 0,
        filings: 0,
        watchedPlayerIds: [],
      },
    ],
    world: syncLegacyScout({ ...world }, scouts, world.selectedScoutId),
  };
  const who = scoutCharacterFor(state, unitId);
  return prependLog(
    next,
    "discovery",
    `Scouting assignment: ${org.name}`,
    `${who?.name ?? "Your scout"} settles in at ${org.name} — junior games, rink coffees, a notebook filling up. First report in ${MISSION_REPORT_MONTHS} turns.`,
  );
}

// Recall an assigned scout: the mission ends, the unit is free to move next
// refresh. Filed reports stay on record (they'll go stale in a later pass).
export function recallScout(state: GameState, unitId: string): GameState {
  const world = state.world;
  if (!world) return state;
  const mission = state.scoutMissions.find((m) => m.unitId === unitId);
  if (!mission) return state;
  const org = world.hockeyOrgs.find((o) => o.id === mission.orgId);
  const scouts = allScouts(world).map((u) =>
    u.id === unitId && u.working?.task === "scout-org"
      ? { ...u, working: undefined }
      : u,
  );
  const next: GameState = {
    ...state,
    scoutMissions: state.scoutMissions.filter((m) => m.unitId !== unitId),
    world: syncLegacyScout({ ...world }, scouts, world.selectedScoutId),
  };
  return prependLog(
    next,
    "discovery",
    "Scout recalled",
    `${scoutCharacterFor(state, unitId)?.name ?? "Your scout"} packs the notebook and heads out${org ? ` — ${org.name}'s file stays as written` : ""}.`,
  );
}

// How many players this scout can watch at once — the tier-set attention cap
// (docs/15 §5, "you can't watch everyone").
export function watchSlotsForUnit(state: GameState, unitId: string): number {
  const scout = scoutCharacterFor(state, unitId);
  return WATCH_SLOTS[scout?.tier ?? "volunteer"];
}

// Toggle a prospect on/off an assigned scout's watch list. Adding is capped
// at the scout's slots; removing is always allowed. Signed-away prospects
// can't be watched — that race is over.
export function toggleWatchProspect(
  state: GameState,
  unitId: string,
  prospectId: string,
): GameState {
  const mission = state.scoutMissions.find((m) => m.unitId === unitId);
  if (!mission) return state;
  const org = state.world?.hockeyOrgs.find((o) => o.id === mission.orgId);
  const prospect = org?.prospects.find((p) => p.id === prospectId);
  if (!org || !prospect || !prospect.revealed) return state;
  const watching = mission.watchedPlayerIds.includes(prospectId);
  if (!watching) {
    if (prospect.signedByClubId) return state;
    if (mission.watchedPlayerIds.length >= watchSlotsForUnit(state, unitId)) {
      return state;
    }
  }
  return {
    ...state,
    scoutMissions: state.scoutMissions.map((m) =>
      m.unitId === unitId
        ? {
            ...m,
            watchedPlayerIds: watching
              ? m.watchedPlayerIds.filter((id) => id !== prospectId)
              : [...m.watchedPlayerIds, prospectId],
          }
        : m,
    ),
  };
}

// Monthly mission tick: every MISSION_REPORT_MONTHS on station, the scout
// files a report batch. The FIRST batch sweeps the whole roster (the club
// report); after that attention narrows to the watch list — repeat viewings
// sharpen only the players the scout is actually pointed at (docs/15 §5).
export function progressScoutMissions(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const mission of draft.scoutMissions) {
    mission.monthsActive += 1;
    if (mission.monthsActive % MISSION_REPORT_MONTHS !== 0) continue;
    const org = world.hockeyOrgs.find((o) => o.id === mission.orgId);
    const unit = allScouts(world).find((u) => u.id === mission.unitId);
    if (!org || !unit) continue;
    const scout = scoutCharacterFor(draft, mission.unitId);
    const scoutName = scout?.name ?? unit.name ?? "Your scout";

    // A signed-away player leaves the watch list; nobody scouts a done deal.
    mission.watchedPlayerIds = mission.watchedPlayerIds.filter((id) =>
      org.prospects.some((p) => p.id === id && !p.signedByClubId),
    );

    const subjects =
      mission.filings === 0
        ? org.prospects.filter((p) => !p.signedByClubId)
        : org.prospects.filter(
            (p) => !p.signedByClubId && mission.watchedPlayerIds.includes(p.id),
          );
    if (subjects.length === 0) {
      // On station with nobody to watch: nudge instead of filing air.
      push(
        "discovery",
        `${org.name}: nothing new to file`,
        `${scoutName} is on station at ${org.name} but isn't watching anyone. Pick players to watch (${watchSlotsForUnit(draft, mission.unitId)} slots) and the reads will sharpen.`,
        scoutName,
      );
      continue;
    }
    mission.filings += 1;
    fileMissionReports(draft, org, scout, mission.unitId, subjects);
    awardScoutXpDraft(draft, mission.unitId, SCOUT_XP_NETWORK);
    push(
      "discovery",
      `Scout report: ${org.name}`,
      mission.filings === 1
        ? `${scoutName} files a first sweep on all ${subjects.length} players at ${org.name}. Pick up to ${watchSlotsForUnit(draft, mission.unitId)} to watch closely — repeat viewings sharpen the reads.`
        : `${scoutName} files on ${subjects.length} watched player${subjects.length === 1 ? "" : "s"} at ${org.name} — the reads keep sharpening. See the Scouting board for the full file.`,
      scoutName,
    );
  }
}

// One report batch: the scout's CURRENT belief on each subject. Estimates are
// stored on the prospect (replacing older, blurrier ones) and each subject
// gets a ScoutReport in their history. Effective judging climbs with the
// number of reports THIS scout has already filed on THAT player — repeat
// viewings sharpen per player, never to certainty.
function fileMissionReports(
  draft: GameState,
  org: WorldHockeyOrg,
  scout: ScoutCharacter | null,
  unitId: string,
  subjects: OrgProspect[],
): void {
  for (const p of subjects) {
    if (!p.attrs || !p.potential) continue;
    const priorViewings = draft.scoutReports.filter(
      (r) => r.subjectId === p.id && r.scoutId === unitId,
    ).length;
    const sharpen = (judging: number) =>
      Math.min(14, judging + priorViewings * 3);
    p.knownVia = "scout-network";
    const est = estimateAttrs(draft.rngSeed, p.attrs, sharpen(scout?.judgingAbility ?? 3));
    draft.rngSeed = est.seed;
    p.attrEstimates = est.estimates;
    const potEst = estimateAttr(
      draft.rngSeed,
      p.potential,
      sharpen(scout?.judgingPotential ?? 3),
    );
    draft.rngSeed = potEst.seed;
    p.potentialEstimate = potEst.estimate;

    const report = prospectReport(p, scout, org, draft.month);
    if (report) draft.scoutReports = [report, ...draft.scoutReports];
  }
}

// ---------------------------------------------------------------------------
// Report staleness (D39): a read holds only while a scout is on station.
// Derived, never stored — like territory and income.
// ---------------------------------------------------------------------------

// A read older than this with nobody watching is stale (flagged, not erased —
// the file stays as written, but the player shouldn't trust it blindly).
export const REPORT_STALE_MONTHS = 6;

export function latestReportMonth(
  state: GameState,
  subjectId: string,
): number | null {
  let latest: number | null = null;
  for (const r of state.scoutReports) {
    if (r.subjectId !== subjectId) continue;
    if (latest === null || r.month > latest) latest = r.month;
  }
  return latest;
}

// Is this prospect's read stale? True when reports exist, no mission covers
// their org, and the newest report has aged past the threshold.
export function prospectReadStale(
  state: GameState,
  orgId: string,
  prospectId: string,
): boolean {
  if (state.scoutMissions.some((m) => m.orgId === orgId)) return false;
  const latest = latestReportMonth(state, prospectId);
  return latest !== null && state.month - latest > REPORT_STALE_MONTHS;
}

import type {
  GameState,
  Player,
  PlayerPosition,
  RivalClub,
  RivalUnit,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { CANDIDATE_NOTES, GOALIE_NOTES } from "../data/playerNames";
import { playerImageFor } from "../data/playerImages";
import { createRivalUnit, isAdjacent, tileAt } from "./world";
import { allScouts } from "./scoutSystem";
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import {
  type AttrBand,
  rollAttrs,
  rollPersonIdentity,
  rollPotential,
  rollStyle,
  rollTraits,
} from "./playerGen";
import type { PushLog } from "./turnContext";

// Lightweight AI opponents — the FOUNDATION for rival clubs / multiplayer, not a
// full strategic AI. Each rival club founds an HQ on turn 1 (see world.placeRivals)
// and runs a small monthly turn here: accumulate production, occasionally spawn a
// scout, and wander its units across the map. The human "bumps into" a rival when
// a scout shares (or sits next to) a rival's tile — which opens a leader meeting.

const RIVAL_OPS_PER_MONTH = 3; // production a rival banks each month
const RIVAL_UNIT_COST = 9; // production to field one more scout (~Pond Scout's 8)
const RIVAL_BUILDER_COST = 12; // a work crew costs a bit more than a scout
const MAX_RIVAL_UNITS = 6; // cap so a rival never floods the map
const MAX_RIVAL_SCOUTS = 4; // leave roster room for the builder
const MAX_RIVAL_RINKS = 3; // rinks a rival will raise near its HQ
const RIVAL_RINK_SEARCH_RADIUS = 9; // how far from home a crew will look for ice
const RIVAL_RINK_BUILD_MONTHS = 3; // clear + build, one month slower than the human

// ---------------------------------------------------------------------------
// Rival rosters (D51, docs/17 §2): generated at FIRST CONTACT through the
// shared playerGen — never a forked generator. A fixed 2C/3W/3D/1G template
// guarantees every contacted rival can ice a legal line; the attribute band
// keys to the rival's era at contact time. Players arrive pre-geared (an AI
// club equips its own team) so ratings.teamRatings reads them like the
// player's roster. Engine-side truth — never render these attrs directly.
// ---------------------------------------------------------------------------

const RIVAL_ROSTER_TEMPLATE: PlayerPosition[] = [
  "C", "C", "W", "W", "W", "D", "D", "D", "G",
];

const RIVAL_ROSTER_BANDS: Record<string, AttrBand> = {
  "pond-hockey": { min: 20, span: 25 },
  "club-formation": { min: 28, span: 27 },
  "competitive-hockey": { min: 38, span: 27 },
  "hockey-operations": { min: 48, span: 27 },
  dynasty: { min: 58, span: 30 },
};

export function generateRivalRoster(
  seed: number,
  rival: RivalClub,
  month: number,
): { roster: Player[]; seed: number } {
  let s = seed;
  const thread = <T>(rolled: T & { seed: number }): T => {
    s = rolled.seed;
    return rolled;
  };
  const band = RIVAL_ROSTER_BANDS[rival.eraId] ?? RIVAL_ROSTER_BANDS["pond-hockey"];
  const club = CLUBS[rival.clubId];
  const usedNames = new Set<string>();
  const roster: Player[] = [];
  for (let i = 0; i < RIVAL_ROSTER_TEMPLATE.length; i++) {
    const position = RIVAL_ROSTER_TEMPLATE[i];
    const { style } = thread(rollStyle(s, position));
    const { attrs } = thread(rollAttrs(s, position, style, band));
    const { potential } = thread(rollPotential(s, position, attrs));
    const { traits } = thread(rollTraits(s));
    const identity = thread(
      rollPersonIdentity(s, rival, "scoutedPlayerFemale", usedNames),
    );
    const id = `rival-${rival.clubId}-p${i}`;
    const ageRoll = nextRandom(s);
    s = ageRoll.seed;
    const noteRoll = nextRandom(s);
    s = noteRoll.seed;
    const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
    roster.push({
      id,
      name: identity.name,
      nationality: identity.nationality,
      gender: identity.gender,
      position,
      age: 16 + Math.floor(ageRoll.value * 12),
      attrs,
      potential,
      style,
      traits,
      imageUrl: playerImageFor({
        gender: identity.gender,
        kind: "player",
        position,
        seed: id,
      }),
      hasEquipment: true,
      joinedMonth: month,
      origin: `${club?.name ?? "rival"} roster`,
      note: notes[Math.floor(noteRoll.value * notes.length)],
    });
  }
  return { roster, seed: s };
}

// Fill the roster of any contacted rival that still lacks one — idempotent,
// draft-mutating (endMonth style). Covers contact paths and dev shortcuts.
export function ensureRivalRosters(draft: GameState): void {
  for (const rival of draft.world?.rivals ?? []) {
    if (!rival.contacted || rival.roster.length > 0) continue;
    const rolled = generateRivalRoster(draft.rngSeed, rival, draft.month);
    draft.rngSeed = rolled.seed;
    rival.roster = rolled.roster;
  }
}

// Run every rival's monthly turn: economy (spawn scouts) + movement (wander),
// then check whether a wandering rival walked into one of the human's scouts.
export function runRivalTurns(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world || world.rivals.length === 0) return;

  for (const rival of world.rivals) {
    advanceRivalEconomy(draft, rival, push);
    moveRivalUnits(draft, rival, push);
  }

  checkRivalContactAtScouts(draft, push);
}

// Bank monthly production; field a new scout at the HQ each time it crosses the
// unit cost. Only log expansion for rivals the player has already met, so the
// log never spoils the location of a still-undiscovered club.
function advanceRivalEconomy(draft: GameState, rival: RivalClub, push: PushLog): void {
  // Stop banking once the roster is capped — otherwise points climb forever with
  // nothing to spend them on. Resumes if a unit slot ever frees up.
  if (rival.units.length >= MAX_RIVAL_UNITS) return;
  rival.productionPoints += RIVAL_OPS_PER_MONTH;

  // Build order mirrors a sane human opening: a couple of scouts to see the
  // world, then a work crew to raise rinks, then more scouts.
  while (rival.units.length < MAX_RIVAL_UNITS) {
    const scouts = rival.units.filter((u) => u.kind === "scout").length;
    const builders = rival.units.filter((u) => u.kind === "builder").length;
    const ownRinks = draft.world?.rinks.filter(
      (r) => r.ownerClubId === rival.clubId,
    ).length ?? 0;
    const wantsBuilder =
      scouts >= 2 && builders === 0 && ownRinks < MAX_RIVAL_RINKS;
    const cost = wantsBuilder ? RIVAL_BUILDER_COST : RIVAL_UNIT_COST;
    if (rival.productionPoints < cost) break;
    if (!wantsBuilder && scouts >= MAX_RIVAL_SCOUTS) break;

    rival.productionPoints -= cost;
    const n = rival.units.length + 1;
    rival.units.push(
      createRivalUnit(
        `rival-${rival.clubId}-${wantsBuilder ? "builder" : "scout"}-${draft.month}-${n}`,
        rival.hqTile.x,
        rival.hqTile.y,
        wantsBuilder ? "builder" : "scout",
      ),
    );
    if (rival.contacted) {
      const club = CLUBS[rival.clubId];
      push(
        "rival",
        `${club?.name ?? "A rival"} expands`,
        wantsBuilder
          ? `${club?.name ?? "A rival club"} put together a rink-building crew.`
          : `${club?.name ?? "A rival club"} sent another scout out from its home ice.`,
      );
    }
  }
}

// Wander each unit: refresh its moves and random-walk, biased away from the HQ so
// units fan out and explore rather than circling home.
function moveRivalUnits(draft: GameState, rival: RivalClub, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const unit of rival.units) {
    if (unit.kind === "builder") {
      runRivalBuilder(draft, rival, unit, push);
      continue;
    }
    unit.movesRemaining = unit.movesPerTurn;
    consumePondMarkerAt(draft, unit.x, unit.y);
    while (unit.movesRemaining > 0) {
      const candidates = wanderCandidates(unit, rival.hqTile, draft);
      if (candidates.length === 0) break;
      const roll = nextRandom(draft.rngSeed);
      draft.rngSeed = roll.seed;
      const pick = candidates[Math.floor(roll.value * candidates.length)];
      unit.x = pick.x;
      unit.y = pick.y;
      unit.movesRemaining -= 1;
      consumePondMarkerAt(draft, unit.x, unit.y);
    }
  }
}

// A rival work crew: walk to the nearest unclaimed frozen pond near home,
// then spend RIVAL_RINK_BUILD_MONTHS raising a rink (clear + build folded
// together — one month slower than the human's two-step, so parity without
// out-racing the player). Idles by the HQ once the rink quota is met.
function runRivalBuilder(
  draft: GameState,
  rival: RivalClub,
  unit: RivalUnit,
  push: PushLog,
): void {
  const world = draft.world!;
  consumePondMarkerAt(draft, unit.x, unit.y);

  // Mid-build: keep at it.
  if (unit.workingMonths !== undefined) {
    unit.movesRemaining = 0;
    unit.workingMonths -= 1;
    if (unit.workingMonths > 0) return;
    unit.workingMonths = undefined;
    world.rinks.push({
      id: `rink-${unit.x}-${unit.y}`,
      x: unit.x,
      y: unit.y,
      level: 1,
      kind: "ice",
      builtMonth: draft.month,
      ownerClubId: rival.clubId,
    });
    if (rival.contacted) {
      const club = CLUBS[rival.clubId];
      push(
        "rival",
        `${club?.name ?? "A rival"} raises a rink`,
        `${club?.name ?? "A rival club"} finished an outdoor rink near its home ice.`,
      );
    }
    return;
  }

  const target = nearestBuildablePond(world, rival);
  if (!target) return; // quota met or no ice nearby: hold position

  // Standing on the target: break ground.
  if (unit.x === target.x && unit.y === target.y) {
    unit.movesRemaining = 0;
    unit.workingMonths = RIVAL_RINK_BUILD_MONTHS;
    return;
  }

  // Greedy step toward the target (diagonals allowed, matching unit movement).
  unit.movesRemaining = unit.movesPerTurn;
  let guard = 8;
  while (unit.movesRemaining > 0 && guard-- > 0) {
    const step = stepToward(world, unit, target);
    if (!step) break;
    unit.x = step.x;
    unit.y = step.y;
    unit.movesRemaining -= 1;
    consumePondMarkerAt(draft, unit.x, unit.y);
    if (unit.x === target.x && unit.y === target.y) {
      unit.movesRemaining = 0;
      unit.workingMonths = RIVAL_RINK_BUILD_MONTHS;
      break;
    }
  }
}

// The closest frozen pond within the rival's home radius that nobody has
// built on (or is standing mid-build on). Null once the rink quota is met.
function nearestBuildablePond(
  world: NonNullable<GameState["world"]>,
  rival: RivalClub,
): { x: number; y: number } | null {
  const owned = world.rinks.filter((r) => r.ownerClubId === rival.clubId).length;
  if (owned >= MAX_RIVAL_RINKS) return null;
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  const r = RIVAL_RINK_SEARCH_RADIUS;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = rival.hqTile.x + dx;
      const y = rival.hqTile.y + dy;
      const tile = tileAt(world, x, y);
      if (!tile || tile.terrain !== "pond" || tile.surfaceState !== "frozen") continue;
      if (world.rinks.some((k) => k.x === x && k.y === y)) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy));
      if (d < bestD) {
        bestD = d;
        best = { x, y };
      }
    }
  }
  return best;
}

// One greedy step toward the target; sidesteps simple blockers.
function stepToward(
  world: NonNullable<GameState["world"]>,
  unit: { x: number; y: number },
  target: { x: number; y: number },
): { x: number; y: number } | null {
  const options: { x: number; y: number; d: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      const tile = tileAt(world, x, y);
      if (!tile || !tile.valid) continue;
      options.push({
        x,
        y,
        d: Math.max(Math.abs(x - target.x), Math.abs(y - target.y)),
      });
    }
  }
  if (options.length === 0) return null;
  options.sort((a, b) => a.d - b.d);
  const curD = Math.max(Math.abs(unit.x - target.x), Math.abs(unit.y - target.y));
  return options[0].d < curD ? options[0] : null;
}

// Valid adjacent tiles to wander to, preferring tiles that move outward from the
// HQ (so a rival's scouts spread across the continent over the months).
function wanderCandidates(
  unit: RivalUnit,
  hq: { x: number; y: number },
  draft: GameState,
): { x: number; y: number }[] {
  const world = draft.world;
  if (!world) return [];
  const all: { x: number; y: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      const tile = tileAt(world, x, y);
      if (tile && tile.valid) all.push({ x, y });
    }
  }
  if (all.length === 0) return all;
  const curD = Math.hypot(unit.x - hq.x, unit.y - hq.y);
  const outward = all.filter(
    (t) => Math.hypot(t.x - hq.x, t.y - hq.y) >= curD,
  );
  return outward.length ? outward : all;
}

// Rival units consume campfire/goodie-hut markers exactly like the human does
// from the world perspective: once a unit steps onto the tile, the marker is
// spent and disappears for every club. Rivals do not stage the human encounter
// popup or receive its player-facing reward yet; this is shared-map denial.
function consumePondMarkerAt(draft: GameState, x: number, y: number): boolean {
  const world = draft.world;
  if (!world) return false;
  const marker = world.pondMarkers.find(
    (m) => !m.investigated && m.x === x && m.y === y,
  );
  if (!marker) return false;
  world.pondMarkers = world.pondMarkers.map((m) =>
    m.id === marker.id ? { ...m, investigated: true } : m,
  );
  return true;
}

// After rival movement, a rival may have walked onto/next to a human scout. Open
// a meeting for the first such uncontacted rival (one meeting at a time, and
// never on top of an open encounter/meeting pop-up).
function checkRivalContactAtScouts(draft: GameState, push: PushLog): void {
  if (draft.pendingMeeting || draft.pendingEncounter) return;
  const world = draft.world;
  if (!world) return;
  const scouts = allScouts(world);
  if (scouts.length === 0) return;
  for (const rival of world.rivals) {
    if (rival.contacted) continue;
    if (rivalIsInContact(rival, scouts)) {
      rival.contacted = true;
      ensureRivalRosters(draft); // a met club has a team to meet (D51)
      draft.pendingMeeting = { kind: "rival", id: rival.clubId };
      const club = CLUBS[rival.clubId];
      push(
        "rival",
        `First contact: ${club?.name ?? "a rival club"}`,
        contactMessage(rival.clubId),
      );
      return;
    }
  }
}

// Immediate (mid-month) first-contact check fired when the HUMAN moves a scout
// onto (x,y). Mirrors triggerPondEncounter's shape in the reducer. Returns a new
// state with the meeting opened, or the input state untouched.
export function triggerRivalContact(state: GameState, x: number, y: number): GameState {
  const world = state.world;
  if (!world || state.pendingMeeting || state.pendingEncounter) return state;
  // The moving scout must actually be standing on (x,y).
  if (!allScouts(world).some((s) => s.x === x && s.y === y)) return state;

  const idx = world.rivals.findIndex(
    (r) => !r.contacted && rivalIsInContact(r, [{ x, y }]),
  );
  if (idx < 0) return state;

  const rival = world.rivals[idx];
  // First contact reveals a club with a team on it (D51).
  const rolled =
    rival.roster.length > 0
      ? { roster: rival.roster, seed: state.rngSeed }
      : generateRivalRoster(state.rngSeed, rival, state.month);
  const rivals = world.rivals.map((r, i) =>
    i === idx ? { ...r, contacted: true, roster: rolled.roster } : r,
  );
  const club = CLUBS[rival.clubId];
  const next: GameState = {
    ...state,
    rngSeed: rolled.seed,
    world: { ...world, rivals },
    pendingMeeting: { kind: "rival", id: rival.clubId },
  };
  return prependLog(
    next,
    "rival",
    `First contact: ${club?.name ?? "a rival club"}`,
    contactMessage(rival.clubId),
  );
}

// True if any of the given points sits on, or adjacent to, the rival's HQ or one
// of its units.
function rivalIsInContact(
  rival: RivalClub,
  points: { x: number; y: number }[],
): boolean {
  const targets: { x: number; y: number }[] = [rival.hqTile, ...rival.units];
  return points.some((p) =>
    targets.some((t) => (p.x === t.x && p.y === t.y) || isAdjacent(p, t)),
  );
}

function contactMessage(clubId: string): string {
  const club = CLUBS[clubId];
  return `Your scout has crossed paths with ${
    club?.name ?? "a rival club"
  } on the open map. The two clubs size each other up.`;
}

// The rival nearest the player's HQ (or founding group), for the dev "Meet
// nearest rival" tool. With { uncontactedOnly }, ignores rivals already met so
// the dev button surfaces a fresh meeting rather than re-opening a known one.
export function nearestRivalClubId(
  state: GameState,
  opts: { uncontactedOnly?: boolean } = {},
): string | null {
  const world = state.world;
  if (!world) return null;
  const pool = opts.uncontactedOnly
    ? world.rivals.filter((r) => !r.contacted)
    : world.rivals;
  if (pool.length === 0) return null;
  const origin =
    world.hqTile ??
    (world.founder ? { x: world.founder.x, y: world.founder.y } : null);
  if (!origin) return pool[0].clubId;
  let best = pool[0];
  let bestD = Infinity;
  for (const r of pool) {
    const d = Math.hypot(r.hqTile.x - origin.x, r.hqTile.y - origin.y);
    if (d < bestD) {
      bestD = d;
      best = r;
    }
  }
  return best.clubId;
}

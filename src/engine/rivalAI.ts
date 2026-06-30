import type { GameState, RivalClub, RivalUnit } from "../types/game";
import { CLUBS } from "../data/clubs";
import { createRivalUnit, isAdjacent, tileAt } from "./world";
import { allScouts } from "./scoutSystem";
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// Lightweight AI opponents — the FOUNDATION for rival clubs / multiplayer, not a
// full strategic AI. Each rival club founds an HQ on turn 1 (see world.placeRivals)
// and runs a small monthly turn here: accumulate production, occasionally spawn a
// scout, and wander its units across the map. The human "bumps into" a rival when
// a scout shares (or sits next to) a rival's tile — which opens a leader meeting.

const RIVAL_OPS_PER_MONTH = 3; // production a rival banks each month
const RIVAL_UNIT_COST = 9; // production to field one more scout (~Pond Scout's 8)
const MAX_RIVAL_UNITS = 6; // cap so a rival never floods the map

// Run every rival's monthly turn: economy (spawn scouts) + movement (wander),
// then check whether a wandering rival walked into one of the human's scouts.
export function runRivalTurns(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world || world.rivals.length === 0) return;

  for (const rival of world.rivals) {
    advanceRivalEconomy(draft, rival, push);
    moveRivalUnits(draft, rival);
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
  while (
    rival.productionPoints >= RIVAL_UNIT_COST &&
    rival.units.length < MAX_RIVAL_UNITS
  ) {
    rival.productionPoints -= RIVAL_UNIT_COST;
    const n = rival.units.length + 1;
    rival.units.push(
      createRivalUnit(
        `rival-${rival.clubId}-scout-${draft.month}-${n}`,
        rival.hqTile.x,
        rival.hqTile.y,
      ),
    );
    if (rival.contacted) {
      const club = CLUBS[rival.clubId];
      push(
        "rival",
        `${club?.name ?? "A rival"} expands`,
        `${club?.name ?? "A rival club"} sent another scout out from its home ice.`,
      );
    }
  }
}

// Wander each unit: refresh its moves and random-walk, biased away from the HQ so
// units fan out and explore rather than circling home.
function moveRivalUnits(draft: GameState, rival: RivalClub): void {
  const world = draft.world;
  if (!world) return;
  for (const unit of rival.units) {
    unit.movesRemaining = unit.movesPerTurn;
    while (unit.movesRemaining > 0) {
      const candidates = wanderCandidates(unit, rival.hqTile, draft);
      if (candidates.length === 0) break;
      const roll = nextRandom(draft.rngSeed);
      draft.rngSeed = roll.seed;
      const pick = candidates[Math.floor(roll.value * candidates.length)];
      unit.x = pick.x;
      unit.y = pick.y;
      unit.movesRemaining -= 1;
    }
  }
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
      draft.pendingMeeting = { clubId: rival.clubId };
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
  const rivals = world.rivals.map((r, i) =>
    i === idx ? { ...r, contacted: true } : r,
  );
  const club = CLUBS[rival.clubId];
  const next: GameState = {
    ...state,
    world: { ...world, rivals },
    pendingMeeting: { clubId: rival.clubId },
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

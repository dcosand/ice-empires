import type {
  GameState,
  PlayerPosition,
  RivalClub,
  RivalUnit,
  Wanderer,
  WandererDisposition,
  WorldUnit,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { nextRandom } from "./rng";
import { allScouts, syncLegacyScout } from "./scoutSystem";
import { tileAt } from "./world";
import {
  buildWandererPlayer,
  createWandererPlayer,
  type WandererTier,
} from "./tryoutSystem";
import { rollPersonIdentity, rollPosition } from "./playerGen";
import { scoutCharacterFor, awardScoutXpDraft } from "./scoutStaff";
import { prependLog } from "./log";
import type { PushLog } from "./turnContext";

// Wandering neutral units (docs/18 "Wandering neutral units"): Civ-barbarian
// analogs with no on-map combat of their own. Some are prospects you can try to
// recruit (a gamble: mostly ordinary, rarely good, very rarely a club legend);
// some are hostiles who drop the gloves and box your scout for a turn or two.
// The true disposition is engine-side; the UI shows only a scout-judged tell.

const ROAM_RADIUS = 4; // drift within this Chebyshev radius of home
const MAX_ACTIVE = 5; // cap on live wanderers at once
const SPAWN_CHANCE = 0.3; // per-turn chance to add one while under the cap
const LIFESPAN_MONTHS = 24; // un-engaged wanderers drift off after this long
const SPAWN_MIN_FROM_HQ = 5;
const SPAWN_MAX_FROM_HQ = 20;

// Recruit odds (owner-picked "Balanced"): ~35% join; of joiners ~4.3% are a
// legend and ~34% are genuinely good → ≈1.5% legend / ≈12% good overall.
const JOIN_CHANCE = 0.35;
const LEGEND_OF_JOINERS = 0.043;
const GOOD_OF_JOINERS = 0.34;

const SCRAP_HK_BONUS = 2; // consolation: a scrap teaches your scout something
const SCRAP_XP = 3; // ...and counts as fieldwork (judging promotions)
const RECRUIT_XP = 2;
const PENALTY_BOX_MIN = 1;
const PENALTY_BOX_MAX = 2;

const cheb = (ax: number, ay: number, bx: number, by: number) =>
  Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// ---- Turn loop -----------------------------------------------------------

// Advance every wanderer one step, retire stale ones, and occasionally spawn a
// fresh roamer. Mutates the draft (called from endMonth). Threads rngSeed (D3).
export function advanceWanderers(draft: GameState): void {
  const world = draft.world;
  if (!world) return;
  despawnStale(draft);
  roamWanderers(draft);
  spawnWanderer(draft);
}

function despawnStale(draft: GameState): void {
  const world = draft.world!;
  world.wanderers = world.wanderers.filter(
    (w) => draft.month - w.spawnedMonth < LIFESPAN_MONTHS,
  );
}

const STEPS: [number, number][] = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0],
];

function roamWanderers(draft: GameState): void {
  const world = draft.world!;
  world.wanderers = world.wanderers.map((w) => {
    const roll = nextRandom(draft.rngSeed + w.x * 7 + w.y * 13);
    draft.rngSeed = roll.seed;
    // Prefer a step that keeps the wanderer inside its home range and on
    // passable ground; fall back to standing still.
    const shuffled = [...STEPS].sort(
      (a, b) =>
        nextRandom(draft.rngSeed + a[0] * 31 + a[1] * 17).value -
        nextRandom(draft.rngSeed + b[0] * 31 + b[1] * 17).value,
    );
    for (const [dx, dy] of shuffled) {
      const nx = w.x + dx;
      const ny = w.y + dy;
      if (cheb(nx, ny, w.homeX, w.homeY) > ROAM_RADIUS) continue;
      const tile = tileAt(world, nx, ny);
      if (!tile || !tile.valid) continue;
      if (occupied(draft, nx, ny, w.id)) continue;
      return { ...w, x: nx, y: ny };
    }
    return w;
  });
}

// Don't stack wanderers on each other, on a settlement, or on a rink tile.
function occupied(draft: GameState, x: number, y: number, selfId: string): boolean {
  const world = draft.world!;
  if (world.hqTile && world.hqTile.x === x && world.hqTile.y === y) return true;
  if (world.rivals.some((r) => r.hqTile.x === x && r.hqTile.y === y)) return true;
  if (world.hockeyOrgs.some((o) => o.x === x && o.y === y)) return true;
  if (world.rinks.some((r) => r.x === x && r.y === y)) return true;
  if (world.wanderers.some((w) => w.id !== selfId && w.x === x && w.y === y)) return true;
  return false;
}

function spawnWanderer(draft: GameState): void {
  const world = draft.world!;
  if (world.wanderers.length >= MAX_ACTIVE) return;
  const anchor = world.hqTile ?? world.founder;
  if (!anchor) return;
  const roll = nextRandom(draft.rngSeed + draft.month * 101);
  draft.rngSeed = roll.seed;
  if (roll.value > SPAWN_CHANCE) return;

  // Pick the best-scoring passable tile in a ring around HQ, away from
  // settlements and existing wanderers.
  let best: { x: number; y: number; score: number } | null = null;
  for (const t of world.tiles) {
    if (!t.valid) continue;
    const d = cheb(t.x, t.y, anchor.x, anchor.y);
    if (d < SPAWN_MIN_FROM_HQ || d > SPAWN_MAX_FROM_HQ) continue;
    if (occupied(draft, t.x, t.y, "")) continue;
    const score = nextRandom(draft.rngSeed + t.x * 911 + t.y * 733).value;
    if (!best || score > best.score) best = { x: t.x, y: t.y, score };
  }
  if (!best) return;
  const dispRoll = nextRandom(draft.rngSeed + best.x * 5 + best.y * 3);
  draft.rngSeed = dispRoll.seed;
  world.wanderers = [
    ...world.wanderers,
    {
      id: `wanderer-${draft.month}-${Math.floor(best.score * 1e6)}`,
      x: best.x,
      y: best.y,
      homeX: best.x,
      homeY: best.y,
      disposition: dispRoll.value < 0.4 ? "hostile" : "friendly",
      spawnedMonth: draft.month,
    },
  ];
}

// ---- Contact + the scout's tell ------------------------------------------

// After a scout move, open the encounter if a scout is standing on a wanderer
// (and nothing else is already popped — the one-popup rule).
export function triggerWandererContact(
  state: GameState,
  x: number,
  y: number,
): GameState {
  const world = state.world;
  if (
    !world ||
    state.pendingEncounter ||
    state.pendingMeeting ||
    state.pendingWanderer ||
    state.pendingPlayerReveal
  )
    return state;

  const wanderer = world.wanderers.find((w) => w.x === x && w.y === y);
  if (!wanderer) return state;
  const scout = allScouts(world).find(
    (s) => s.x === x && s.y === y && s.kind !== "builder",
  );
  if (!scout) return state;

  const read = scoutTell(state, wanderer, scout.id);
  return {
    ...state,
    pendingWanderer: { wandererId: wanderer.id, read, scoutId: scout.id },
  };
}

// The subtle tell: a scout's guess at whether this wanderer is friendly or
// trouble. Accuracy rises with Judging Ability (20-scale); a bad read points
// the wrong way — that's the risk. Deterministic per wanderer (stable popup).
function scoutTell(
  state: GameState,
  wanderer: Wanderer,
  scoutId: string | undefined,
): WandererDisposition | "unsure" {
  const char = scoutCharacterFor(state, scoutId);
  if (!char) return "unsure";
  const accuracy = 0.6 + 0.35 * (char.judgingAbility / 20);
  const r = nextRandom(
    state.rngSeed + wanderer.x * 101 + wanderer.y * 57 + char.judgingAbility,
  ).value;
  if (r < accuracy) return wanderer.disposition;
  return wanderer.disposition === "friendly" ? "hostile" : "friendly";
}

// ---- Resolution ----------------------------------------------------------

export function resolveWanderer(
  state: GameState,
  choice: "approach" | "ignore",
): GameState {
  const pending = state.pendingWanderer;
  if (!pending) return state;
  const world = state.world;
  const wanderer = world?.wanderers.find((w) => w.id === pending.wandererId);
  if (!world || !wanderer) return { ...state, pendingWanderer: null };

  if (choice === "ignore") {
    // Keep your distance — the wanderer stays out there, roaming.
    return { ...state, pendingWanderer: null };
  }

  const draft: GameState = structuredClone(state);
  draft.pendingWanderer = null;
  // Engaging consumes the wanderer either way.
  draft.world!.wanderers = draft.world!.wanderers.filter((w) => w.id !== wanderer.id);

  if (wanderer.disposition === "hostile") {
    return resolveScrap(draft, pending.scoutId, wanderer);
  }
  return resolveRecruit(draft, pending.scoutId, wanderer);
}

function resolveScrap(
  draft: GameState,
  scoutId: string | undefined,
  wanderer: Wanderer,
): GameState {
  const boxRoll = nextRandom(draft.rngSeed + wanderer.x + wanderer.y);
  draft.rngSeed = boxRoll.seed;
  const turns =
    PENALTY_BOX_MIN +
    Math.floor(boxRoll.value * (PENALTY_BOX_MAX - PENALTY_BOX_MIN + 1));

  // Box the scout: pinned at 0 moves for `turns` turns (refreshScoutMoves keeps
  // it there and decrements). Update through the legacy-scout sync.
  const world = draft.world!;
  const scouts = allScouts(world).map((s) =>
    s.id === scoutId
      ? { ...s, penaltyBoxTurns: turns, movesRemaining: 0 }
      : s,
  );
  draft.world = syncLegacyScout(world, scouts, world.selectedScoutId ?? null);

  // Consolation (owner note): a scrap still teaches something — a small HK bump
  // and fieldwork XP toward the scout's judging promotions.
  draft.resources.hockeyKnowledge += SCRAP_HK_BONUS;
  awardScoutXpDraft(draft, scoutId, SCRAP_XP);

  return prependLog(
    draft,
    "flavor",
    "Gloves off on the pond",
    `A hostile wanderer dropped the gloves — your scout takes ${turns} turn${
      turns === 1 ? "" : "s"
    } in the penalty box. They came out of it wiser (+${SCRAP_HK_BONUS} Hockey Knowledge, and a little tougher for next time).`,
  );
}

function resolveRecruit(
  draft: GameState,
  scoutId: string | undefined,
  wanderer: Wanderer,
): GameState {
  const joinRoll = nextRandom(draft.rngSeed + wanderer.x * 3 + wanderer.y * 5);
  draft.rngSeed = joinRoll.seed;

  if (joinRoll.value >= JOIN_CHANCE) {
    return prependLog(
      draft,
      "flavor",
      "They passed",
      "The wanderer heard you out, shrugged, and drifted back onto the ice. Not everyone wants a club.",
    );
  }

  // They're in — roll the quality tier and their identity/position.
  const tierRoll = nextRandom(draft.rngSeed + wanderer.x + wanderer.y * 2);
  draft.rngSeed = tierRoll.seed;
  const tier: WandererTier =
    tierRoll.value < LEGEND_OF_JOINERS
      ? "legend"
      : tierRoll.value < LEGEND_OF_JOINERS + GOOD_OF_JOINERS
        ? "good"
        : "normal";

  const posRolled = rollPosition(draft.rngSeed);
  draft.rngSeed = posRolled.seed;
  const position: PlayerPosition = posRolled.position;

  const identity = rollPersonIdentity(
    draft.rngSeed,
    draft.club,
    "scoutedPlayerFemale",
    new Set(draft.roster.map((p) => p.name)),
  );
  draft.rngSeed = identity.seed;

  const player = createWandererPlayer(
    draft,
    position,
    identity.name,
    identity.gender,
    identity.nationality,
    tier,
  );
  awardScoutXpDraft(draft, scoutId, RECRUIT_XP);

  if (!player) {
    // Roster full — they nod and move on; the story still pays a little rep.
    draft.resources.reputation += 1;
    return prependLog(
      draft,
      "flavor",
      "No room on the bench",
      "A wanderer wanted in, but your roster is full. Word gets around that this is a club worth joining (+1 Reputation).",
    );
  }

  // A signing is always a moment — stage the shared reveal cinematic.
  draft.pendingPlayerReveal = {
    player,
    source: "encounter",
    firstEver: !draft.seenFirstPlayer,
  };
  draft.seenFirstPlayer = true;
  return draft;
}

// Roll a joiner's quality tier from a fresh draw (shared so the human and rival
// recruit paths weight legend/good/normal identically).
function rollWandererTier(seed: number): { tier: WandererTier; seed: number } {
  const roll = nextRandom(seed);
  const tier: WandererTier =
    roll.value < LEGEND_OF_JOINERS
      ? "legend"
      : roll.value < LEGEND_OF_JOINERS + GOOD_OF_JOINERS
        ? "good"
        : "normal";
  return { tier, seed: roll.seed };
}

// ---- Rival parity (owner ask) --------------------------------------------

// A rival AI club gets the SAME wanderer effects/risks/benefits the human does.
// When one of a rival's roaming scout units lands on a wanderer, it engages
// automatically (no tell, no choice — the AI just bumps into whoever's there):
// a friendly is a recruit gamble on the identical odds (rare good/legend added
// to the rival's roster), a hostile is a scrap that boxes the unit for a turn or
// two. Consumes the wanderer so it can't also pop for the player. Logs only for
// contacted rivals so an undiscovered club's doings never spoil the map.
// Mutates the endMonth draft; threads rngSeed (D3). Returns true if the unit was
// boxed (so the caller can stop walking it this turn).
export function resolveRivalWandererAt(
  draft: GameState,
  rival: RivalClub,
  unit: RivalUnit,
  push: PushLog,
): boolean {
  const world = draft.world;
  if (!world || unit.kind === "builder") return false;
  if ((unit.penaltyBoxTurns ?? 0) > 0) return true;
  const wanderer = world.wanderers.find(
    (w) => w.x === unit.x && w.y === unit.y,
  );
  // Don't poach a wanderer the human is mid-encounter with.
  if (!wanderer || draft.pendingWanderer?.wandererId === wanderer.id)
    return false;

  world.wanderers = world.wanderers.filter((w) => w.id !== wanderer.id);
  const club = CLUBS[rival.clubId];
  const name = club?.name ?? "A rival club";
  const logged = rival.contacted;

  if (wanderer.disposition === "hostile") {
    const boxRoll = nextRandom(draft.rngSeed + unit.x + unit.y);
    draft.rngSeed = boxRoll.seed;
    const turns =
      PENALTY_BOX_MIN +
      Math.floor(boxRoll.value * (PENALTY_BOX_MAX - PENALTY_BOX_MIN + 1));
    unit.penaltyBoxTurns = turns;
    unit.movesRemaining = 0;
    if (logged)
      push(
        "rival",
        `${name} drops the gloves`,
        `${name}'s scout tangled with a hostile wanderer and takes ${turns} turn${
          turns === 1 ? "" : "s"
        } in the penalty box.`,
      );
    return true;
  }

  // Friendly: the same recruit gamble the human makes.
  const joinRoll = nextRandom(draft.rngSeed + unit.x * 3 + unit.y * 5);
  draft.rngSeed = joinRoll.seed;
  if (joinRoll.value >= JOIN_CHANCE) {
    if (logged)
      push(
        "rival",
        `${name} strikes out`,
        `A wanderer heard out ${name} and drifted back onto the ice.`,
      );
    return false;
  }

  const tierRolled = rollWandererTier(draft.rngSeed);
  draft.rngSeed = tierRolled.seed;
  const posRolled = rollPosition(draft.rngSeed);
  draft.rngSeed = posRolled.seed;
  const identity = rollPersonIdentity(
    draft.rngSeed,
    rival,
    "scoutedPlayerFemale",
    new Set(rival.roster.map((p) => p.name)),
  );
  draft.rngSeed = identity.seed;
  const built = buildWandererPlayer(draft.rngSeed, {
    position: posRolled.position,
    name: identity.name,
    gender: identity.gender,
    nationality: identity.nationality,
    tier: tierRolled.tier,
    month: draft.month,
    geared: true, // rivals arrive pre-geared, matching generateRivalRoster
    idPrefix: `rival-${rival.clubId}-wanderer`,
  });
  draft.rngSeed = built.seed;
  rival.roster.push(built.player);
  if (logged)
    push(
      "rival",
      tierRolled.tier === "legend"
        ? `${name} lands a legend`
        : `${name} signs a wanderer`,
      tierRolled.tier === "legend"
        ? `${name} convinced a wandering legend to lace up for them.`
        : `${name} added a wandering ${posRolled.position} to its roster.`,
    );
  return false;
}

// ---- Penalty box (called from refreshScoutMoves) -------------------------

// While a scout is boxed, hold it at 0 moves and burn down the sentence.
export function tickPenaltyBox(unit: WorldUnit): WorldUnit {
  if (!unit.penaltyBoxTurns || unit.penaltyBoxTurns <= 0) return unit;
  const remaining = unit.penaltyBoxTurns - 1;
  return {
    ...unit,
    penaltyBoxTurns: remaining > 0 ? remaining : undefined,
    movesRemaining: 0,
  };
}

export function isBoxed(unit: WorldUnit): boolean {
  return (unit.penaltyBoxTurns ?? 0) > 0;
}

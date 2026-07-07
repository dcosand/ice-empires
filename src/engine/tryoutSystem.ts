import type {
  GameState,
  PersonNationality,
  Player,
  PlayerPosition,
  TryoutCandidate,
} from "../types/game";
import { CANDIDATE_NOTES, GOALIE_NOTES } from "../data/playerNames";
import { playerImageFor } from "../data/playerImages";
import { getClubRinks } from "./rinkSystem";
import { playerTerritorySize } from "./territorySystem";
import type { AttrBand } from "./playerGen";
import {
  POND_TRYOUT_BAND,
  WANDERER_BAND,
  rollAttrs,
  rollPersonIdentity,
  rollPosition,
  rollPotential,
  rollStyle,
  rollTraits,
} from "./playerGen";
import {
  nextTryoutWindowMonth,
  turnMonthName,
  tryoutWindowFor,
} from "./calendar";
import { PUND_HOCKEY_ERA_ID } from "../data/eras";
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// Local tryouts: the Act I recruiting verb. Post flyers at your rink, curious
// locals show up, and you pick your first team from whoever appears. Attribute
// rolls are deliberately humble (pond locals ≈ 20–45 on the 1–100 scale) —
// the fantasy is coaching these people into a hockey club, not drafting stars.

export const TRYOUT_COST_FUNDS = 3;
export const ROSTER_CAP = 10;
// Each floor "step" (territory growth, Rink Evangelist) lifts the band's
// bottom by this many 1–100 points.
const FLOOR_STEP_POINTS = 5;

// Territory → turnout (D35): a bigger claimed area is a bigger population.
// The HQ alone claims at most TERRITORY_BASELINE_TILES at founding (its full
// radius-3 disk on open ground), so only tiles BEYOND that baseline — forward
// rinks, Affiliate independents — grow the pool; the first tryout stays a
// 3–5 person pond affair.
export const TERRITORY_BASELINE_TILES = 37;
export const TILES_PER_EXTRA_CANDIDATE = 7; // +1 hopeful per ~7 extra tiles
export const TILES_PER_FLOOR_STEP = 10; // attr floor +1 per ~10 extra tiles
export const TERRITORY_FLOOR_CAP = 3; // pond-era talent stays humble

// Extra candidates / raised attribute floor earned by owned territory,
// stacking with the unique-unit bonuses (Warming-House Crew, Rink Evangelist).
export function territoryTryoutBonus(state: GameState): {
  candidates: number;
  floor: number;
} {
  const beyond = Math.max(0, playerTerritorySize(state) - TERRITORY_BASELINE_TILES);
  return {
    candidates: Math.floor(beyond / TILES_PER_EXTRA_CANDIDATE),
    floor: Math.min(TERRITORY_FLOOR_CAP, Math.floor(beyond / TILES_PER_FLOOR_STEP)),
  };
}

export type TryoutGate =
  | "ok"
  | "no-tech"
  | "no-rink"
  | "out-of-season"
  | "no-funds"
  | "tryout-open"
  | "roster-full";

// Seasonal windows (D37) start with Club Formation: pond-era tryouts stay
// any-month so the first team comes together at its own pace (the same
// doctrine that delays upkeep, D25).
export function tryoutsAreSeasonal(state: GameState): boolean {
  return state.eraId !== PUND_HOCKEY_ERA_ID;
}

export function tryoutGate(state: GameState): TryoutGate {
  if (!state.completedResearch.includes("local-tryouts")) return "no-tech";
  if (!state.world || getClubRinks(state.world).length === 0) return "no-rink";
  if (tryoutsAreSeasonal(state) && !tryoutWindowFor(state.month)) {
    return "out-of-season";
  }
  if (state.pendingTryout) return "tryout-open";
  if (state.roster.length >= ROSTER_CAP) return "roster-full";
  if (state.resources.funds < TRYOUT_COST_FUNDS) return "no-funds";
  return "ok";
}

export function canHoldTryouts(state: GameState): boolean {
  return tryoutGate(state) === "ok";
}

export function tryoutGateHint(gate: TryoutGate, month?: number): string {
  switch (gate) {
    case "no-tech":
      return "Research Local Tryouts first.";
    case "no-rink":
      return "Needs a rink near your HQ — send the Rink Rats to a frozen pond.";
    case "out-of-season":
      return month === undefined
        ? "Tryouts are seasonal — wait for spring tryouts (May) or training camp (Aug–Sep)."
        : `Tryouts are seasonal — next window opens in ${turnMonthName(
            nextTryoutWindowMonth(month),
          )}.`;
    case "no-funds":
      return `Needs ${TRYOUT_COST_FUNDS} Funds for flyers and hot drinks.`;
    case "tryout-open":
      return "A tryout is already in progress.";
    case "roster-full":
      return "The roster is full.";
    default:
      return "";
  }
}

// Does the club own a given organizational unit? (unique-unit hooks)
function ownsUnit(state: GameState, unitDefId: string): boolean {
  return state.units.some((u) => u.unitDefId === unitDefId);
}

// Roll one candidate. Goalies are rare (~1 in 4) and get their ability in the
// crease; skaters get a position-flavored spread of terrible numbers.
// Helsinki's Goalie Whisperer roughly doubles goalie turnout.
function rollCandidate(
  state: GameState,
  index: number,
  territoryFloor: number,
  usedNames: Set<string>,
): TryoutCandidate {
  const draw = () => {
    const roll = nextRandom(state.rngSeed);
    state.rngSeed = roll.seed;
    return roll.value;
  };
  const thread = <T>(rolled: T & { seed: number }): T => {
    state.rngSeed = rolled.seed;
    return rolled;
  };
  // A Rink Evangelist raises the floor: nobody shows up completely hopeless.
  // Territory raises it further — a wider claim draws better locals (D35).
  const floorSteps =
    (ownsUnit(state, "rink-evangelist") ? 1 : 0) + territoryFloor;
  const band = {
    min: POND_TRYOUT_BAND.min + floorSteps * FLOOR_STEP_POINTS,
    span: POND_TRYOUT_BAND.span,
  };

  // Helsinki's Goalie Whisperer roughly doubles goalie turnout.
  const goalieOdds = ownsUnit(state, "goalie-whisperer") ? 0.36 : 0.18;
  const { position } = thread(rollPosition(state.rngSeed, { goalieOdds }));
  const { style } = thread(rollStyle(state.rngSeed, position));
  const { attrs } = thread(rollAttrs(state.rngSeed, position, style, band));
  // Pond-era kids carry real upside — the coaching fantasy needs headroom.
  const { potential } = thread(
    rollPotential(state.rngSeed, position, attrs, { min: 10, span: 30 }),
  );
  const { traits } = thread(rollTraits(state.rngSeed));

  const identity = thread(
    rollPersonIdentity(
      state.rngSeed,
      state.club,
      "tryoutCandidateFemale",
      usedNames,
    ),
  );
  const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
  const id = `candidate-${state.month}-${index}-${Math.floor(draw() * 1e6)}`;

  return {
    id,
    name: identity.name,
    nationality: identity.nationality,
    gender: identity.gender,
    position,
    age: 14 + Math.floor(draw() * 6),
    attrs,
    potential,
    style,
    traits,
    imageUrl: playerImageFor({
      gender: identity.gender,
      kind: "prospect",
      position,
      seed: id,
    }),
    origin: "local tryout",
    note: notes[Math.floor(draw() * notes.length)],
  };
}

// `force` (dev panel) bypasses every gate, including the seasonal window.
export function holdTryouts(
  state: GameState,
  opts: { force?: boolean } = {},
): GameState {
  if (!opts.force && !canHoldTryouts(state)) return state;
  // A tryout held in an Aug–Sep window is a training camp (D37) — counted
  // toward the club-formation era's `training-camp` exit requirement.
  const isCamp =
    tryoutsAreSeasonal(state) && tryoutWindowFor(state.month) === "camp";

  // Thread the seeded RNG through a working copy (rollCandidate mutates
  // rngSeed on it) so the whole tryout is deterministic per seed.
  const working: GameState = {
    ...state,
    resources: {
      ...state.resources,
      funds: state.resources.funds - TRYOUT_COST_FUNDS,
    },
  };
  const roll = nextRandom(working.rngSeed);
  working.rngSeed = roll.seed;
  // Extra hopefuls: Minnesota's Warming-House Crew and the Rink Evangelist
  // each draw one more local to every tryout.
  const bonus =
    (ownsUnit(state, "warming-house-crew") ? 1 : 0) +
    (ownsUnit(state, "rink-evangelist") ? 1 : 0);
  // Owned territory is population: more claimed tiles, more (and better)
  // walk-ons (D35). Stacks with the unique-unit bonuses above.
  const territory = territoryTryoutBonus(state);
  const count = 3 + Math.floor(roll.value * 3) + bonus + territory.candidates; // 3..5 (+bonuses)
  const candidates: TryoutCandidate[] = [];
  const usedNames = new Set(state.roster.map((p) => p.name));
  for (let i = 0; i < count; i++)
    candidates.push(rollCandidate(working, i, territory.floor, usedNames));

  const next: GameState = {
    ...working,
    // The very first tryout earns the letterbox cinematic framing.
    pendingTryout: { candidates, recruitedIds: [], firstEver: !state.seenFirstTryout },
    seenFirstTryout: true,
    trainingCampsHeld: state.trainingCampsHeld + (isCamp ? 1 : 0),
  };
  return prependLog(
    next,
    "card",
    isCamp ? "Training camp opens" : "Tryouts posted",
    `Flyers go up at the rink. ${count} hopeful locals lace up whatever they own and wobble onto the ice.${
      territory.candidates > 0
        ? " Word has spread across your territory — the turnout is bigger than the pond alone could draw."
        : ""
    }`,
  );
}

export function recruitPlayer(state: GameState, candidateId: string): GameState {
  const tryout = state.pendingTryout;
  if (!tryout) return state;
  if (state.roster.length >= ROSTER_CAP) return state;
  const candidate = tryout.candidates.find((c) => c.id === candidateId);
  if (!candidate || tryout.recruitedIds.includes(candidateId)) return state;

  const gearAvailable = state.equipment >= 1;
  const player: Player = {
    ...candidate,
    imageUrl: playerImageFor({
      gender: candidate.gender,
      kind: "player",
      position: candidate.position,
      seed: candidate.id,
    }),
    hasEquipment: gearAvailable,
    joinedMonth: state.month,
  };
  const next: GameState = {
    ...state,
    equipment: gearAvailable ? state.equipment - 1 : state.equipment,
    roster: [...state.roster, player],
    pendingTryout: {
      ...tryout,
      recruitedIds: [...tryout.recruitedIds, candidateId],
    },
    // The club's first-ever signing gets the shared reveal cinematic.
    seenFirstPlayer: true,
    pendingPlayerReveal: state.seenFirstPlayer
      ? state.pendingPlayerReveal
      : { player, source: "tryout", firstEver: true },
  };
  return prependLog(
    next,
    "card",
    `${player.name} joins the club`,
    gearAvailable
      ? `${player.name} (${player.position}) signs on and collects a stick from the shed. ${player.note}`
      : `${player.name} (${player.position}) signs on — but the shed is empty. No gear, no games, until you harvest or stock more equipment.`,
  );
}

export function closeTryouts(state: GameState): GameState {
  const tryout = state.pendingTryout;
  if (!tryout) return state;
  const recruited = tryout.recruitedIds.length;
  const passed = tryout.candidates.length - recruited;
  return prependLog(
    { ...state, pendingTryout: null },
    "card",
    "Tryouts end",
    recruited > 0
      ? `${recruited} recruit${recruited === 1 ? "" : "s"} joined; ${passed} went home with a story to tell.`
      : "Nobody made the cut. The flyers stay up.",
  );
}

// A wanderer from a map encounter joins the roster directly (no tryout).
// Slightly better than tryout locals — they've clearly done this before.
// Returns null if the roster is full.
// Quality tiers a recruited wanderer can land in (wandererSystem's balanced
// odds): most are ordinary, a few are genuinely good, a rare one is a legend.
export type WandererTier = "normal" | "good" | "legend";
const WANDERER_TIER_BANDS: Record<WandererTier, { attrs: AttrBand; pot: AttrBand }> = {
  normal: { attrs: WANDERER_BAND, pot: { min: 8, span: 22 } },
  good: { attrs: { min: 46, span: 24 }, pot: { min: 16, span: 24 } },
  legend: { attrs: { min: 62, span: 26 }, pot: { min: 32, span: 20 } },
};

// Pure builder for a wanderer-tier player — the SINGLE source of a recruit's
// stats so the human and rival paths stay in exact parity (same tier bands,
// same rolls). Threads the seed; never touches any roster/equipment. The rival
// path (wandererSystem.resolveRivalWandererAt) and the human path below both
// call this so a rival that bumps a wanderer draws the identical odds/quality.
export function buildWandererPlayer(
  seed: number,
  opts: {
    position: PlayerPosition;
    name: string;
    gender: Player["gender"];
    nationality: PersonNationality;
    tier: WandererTier;
    month: number;
    geared: boolean;
    idPrefix?: string;
  },
): { player: Player; seed: number } {
  let s = seed;
  const draw = () => {
    const roll = nextRandom(s);
    s = roll.seed;
    return roll.value;
  };
  const thread = <T>(rolled: T & { seed: number }): T => {
    s = rolled.seed;
    return rolled;
  };
  const { position, name, gender, nationality, tier, month, geared } = opts;
  const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
  const bands = WANDERER_TIER_BANDS[tier];
  // Wanderers roll a cut above tryout locals — they've clearly played before;
  // "good"/"legend" tiers roll from a markedly higher band with a taller ceiling.
  const { style } = thread(rollStyle(s, position));
  const { attrs } = thread(rollAttrs(s, position, style, bands.attrs));
  const { potential } = thread(rollPotential(s, position, attrs, bands.pot));
  const { traits } = thread(rollTraits(s));
  const player: Player = {
    id: `${opts.idPrefix ?? "wanderer"}-${month}-${Math.floor(draw() * 1e6)}`,
    name,
    nationality,
    gender,
    position,
    age: 16 + Math.floor(draw() * 8),
    attrs,
    potential,
    style,
    traits,
    imageUrl: playerImageFor({
      gender,
      kind: "player",
      position,
      seed: `${name}-${month}-${position}`,
    }),
    hasEquipment: geared,
    joinedMonth: month,
    origin: tier === "legend" ? "a legend walks in" : "map encounter",
    note:
      tier === "legend"
        ? "The kind of player the whole league will one day claim to have seen first."
        : notes[Math.floor(draw() * notes.length)],
  };
  return { player, seed: s };
}

export function createWandererPlayer(
  draft: GameState,
  position: PlayerPosition,
  name: string,
  gender: Player["gender"],
  nationality: PersonNationality,
  tier: WandererTier = "normal",
): Player | null {
  if (draft.roster.length >= ROSTER_CAP) return null;
  const geared = draft.equipment >= 1;
  if (geared) draft.equipment -= 1;
  const built = buildWandererPlayer(draft.rngSeed, {
    position,
    name,
    gender,
    nationality,
    tier,
    month: draft.month,
    geared,
  });
  draft.rngSeed = built.seed;
  draft.roster.push(built.player);
  return built.player;
}

// Monthly pass: gear up ungeared players FIFO while shed stock lasts, so
// equipment harvested after a recruit still reaches them automatically.
export function autoEquipRoster(draft: GameState, push: PushLog): void {
  if (draft.equipment <= 0) return;
  let geared = 0;
  for (const player of draft.roster) {
    if (draft.equipment <= 0) break;
    if (player.hasEquipment) continue;
    player.hasEquipment = true;
    draft.equipment -= 1;
    geared += 1;
  }
  if (geared > 0) {
    push(
      "resource",
      "Gear handed out",
      `${geared} player${geared === 1 ? "" : "s"} collected sticks and gear from the shed.`,
    );
  }
}

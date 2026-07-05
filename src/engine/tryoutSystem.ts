import type {
  GameState,
  Player,
  PlayerGender,
  PlayerPosition,
  TryoutCandidate,
} from "../types/game";
import {
  CANDIDATE_NOTES,
  FEMALE_FIRST_NAMES,
  GOALIE_NOTES,
  LAST_NAMES,
  MALE_FIRST_NAMES,
} from "../data/playerNames";
import { playerImageFor } from "../data/playerImages";
import { getClubRinks } from "./rinkSystem";
import { playerTerritorySize } from "./territorySystem";
import {
  POND_TRYOUT_BAND,
  WANDERER_BAND,
  rollAttrs,
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

  const gender: PlayerGender = draw() < 0.32 ? "female" : "male";
  const firstPool = gender === "female" ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES;
  const first = firstPool[Math.floor(draw() * firstPool.length)];
  const last = LAST_NAMES[Math.floor(draw() * LAST_NAMES.length)];
  const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
  const id = `candidate-${state.month}-${index}-${Math.floor(draw() * 1e6)}`;

  return {
    id,
    name: `${first} ${last}`,
    gender,
    position,
    age: 14 + Math.floor(draw() * 6),
    attrs,
    potential,
    style,
    traits,
    imageUrl: playerImageFor({
      gender,
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
  for (let i = 0; i < count; i++)
    candidates.push(rollCandidate(working, i, territory.floor));

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
export function createWandererPlayer(
  draft: GameState,
  position: PlayerPosition,
  name: string,
  gender: PlayerGender,
): Player | null {
  if (draft.roster.length >= ROSTER_CAP) return null;
  const draw = () => {
    const roll = nextRandom(draft.rngSeed);
    draft.rngSeed = roll.seed;
    return roll.value;
  };
  const thread = <T>(rolled: T & { seed: number }): T => {
    draft.rngSeed = rolled.seed;
    return rolled;
  };
  const geared = draft.equipment >= 1;
  if (geared) draft.equipment -= 1;
  const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
  // Wanderers roll a cut above tryout locals — they've clearly played before.
  const { style } = thread(rollStyle(draft.rngSeed, position));
  const { attrs } = thread(rollAttrs(draft.rngSeed, position, style, WANDERER_BAND));
  const { potential } = thread(
    rollPotential(draft.rngSeed, position, attrs, { min: 8, span: 22 }),
  );
  const { traits } = thread(rollTraits(draft.rngSeed));
  const player: Player = {
    id: `wanderer-${draft.month}-${Math.floor(draw() * 1e6)}`,
    name,
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
      seed: `${name}-${draft.month}-${position}`,
    }),
    hasEquipment: geared,
    joinedMonth: draft.month,
    origin: "map encounter",
    note: notes[Math.floor(draw() * notes.length)],
  };
  draft.roster.push(player);
  return player;
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

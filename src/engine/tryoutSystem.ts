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
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";

// Local tryouts: the Act I recruiting verb. Post flyers at your rink, curious
// locals show up, and you pick your first team from whoever appears. Attribute
// rolls are deliberately terrible (1–6 on a 20 scale) — the fantasy is
// coaching these people into a hockey club, not drafting stars.

export const TRYOUT_COST_FUNDS = 3;
export const ROSTER_CAP = 10;
const POND_ATTR_MIN = 1;
const POND_ATTR_SPAN = 5; // rolls land in [1, 6]

export type TryoutGate =
  | "ok"
  | "no-tech"
  | "no-rink"
  | "no-funds"
  | "tryout-open"
  | "roster-full";

export function tryoutGate(state: GameState): TryoutGate {
  if (!state.completedResearch.includes("local-tryouts")) return "no-tech";
  if (!state.world || getClubRinks(state.world).length === 0) return "no-rink";
  if (state.pendingTryout) return "tryout-open";
  if (state.roster.length >= ROSTER_CAP) return "roster-full";
  if (state.resources.funds < TRYOUT_COST_FUNDS) return "no-funds";
  return "ok";
}

export function canHoldTryouts(state: GameState): boolean {
  return tryoutGate(state) === "ok";
}

export function tryoutGateHint(gate: TryoutGate): string {
  switch (gate) {
    case "no-tech":
      return "Research Local Tryouts first.";
    case "no-rink":
      return "Needs a rink near your HQ — send the Rink Rats to a frozen pond.";
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
function rollCandidate(state: GameState, index: number): TryoutCandidate {
  const draw = () => {
    const roll = nextRandom(state.rngSeed);
    state.rngSeed = roll.seed;
    return roll.value;
  };
  // A Rink Evangelist raises the floor: nobody shows up completely hopeless.
  const floor = ownsUnit(state, "rink-evangelist") ? POND_ATTR_MIN + 1 : POND_ATTR_MIN;
  const attr = () => floor + Math.floor(draw() * (POND_ATTR_SPAN + 1));

  const goalieCut = ownsUnit(state, "goalie-whisperer") ? 0.6 : 0.78;
  const posRoll = draw();
  const position: PlayerPosition =
    posRoll < 0.45 ? "F" : posRoll < goalieCut ? "D" : "G";
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
    attrs: {
      skating: attr(),
      shooting: attr(),
      passing: attr(),
      checking: attr(),
      goaltending: position === "G" ? Math.max(2, attr()) : 1,
    },
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

export function holdTryouts(state: GameState): GameState {
  if (!canHoldTryouts(state)) return state;

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
  const count = 3 + Math.floor(roll.value * 3) + bonus; // 3..5 (+bonuses)
  const candidates: TryoutCandidate[] = [];
  for (let i = 0; i < count; i++) candidates.push(rollCandidate(working, i));

  const next: GameState = {
    ...working,
    // The very first tryout earns the letterbox cinematic framing.
    pendingTryout: { candidates, recruitedIds: [], firstEver: !state.seenFirstTryout },
    seenFirstTryout: true,
  };
  return prependLog(
    next,
    "card",
    "Tryouts posted",
    `Flyers go up at the rink. ${count} hopeful locals lace up whatever they own and wobble onto the ice.`,
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
  const attr = () => 2 + Math.floor(draw() * 7); // 2..8
  const geared = draft.equipment >= 1;
  if (geared) draft.equipment -= 1;
  const notes = position === "G" ? GOALIE_NOTES : CANDIDATE_NOTES;
  const player: Player = {
    id: `wanderer-${draft.month}-${Math.floor(draw() * 1e6)}`,
    name,
    gender,
    position,
    age: 16 + Math.floor(draw() * 8),
    attrs: {
      skating: attr(),
      shooting: attr(),
      passing: attr(),
      checking: attr(),
      goaltending: position === "G" ? Math.max(4, attr()) : 1,
    },
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

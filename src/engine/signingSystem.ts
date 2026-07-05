import type {
  GameState,
  OrgProspect,
  Player,
  WorldHockeyOrg,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import { rollStyle, rollTraits } from "./playerGen";
import { ROSTER_CAP } from "./tryoutSystem";
import type { PushLog } from "./turnContext";

// The contested signing race (docs/15 §6): SIGN_PROSPECT resolves a seeded
// roll — your influence at the org + scouting depth + map proximity vs each
// interested rival's influence there. Win and the prospect converts to a
// Player on your roster; lose and he signs with the rival and leaves the
// pool. The contract is only paid on a WIN — losing costs you the player,
// not the treasury.

export const SIGN_COST_FUNDS = 8;
// Scouting depth: each filed report on the prospect adds this to your bid
// (capped) — the club that actually watched him wins ties.
const REPORT_BID_WEIGHT = 6;
const REPORT_BID_CAP = 5;
// Both sides add a seeded roll of this size — no race is a sure thing.
const CONTEST_ROLL = 15;

// A rival courting an org this hard may sign its best prospect out from
// under you each month — the docs/15 §4 closing window.
const POACH_MIN_INFLUENCE = 30;

export type SignGate =
  | "ok"
  | "not-found"
  | "signed-away"
  | "no-network"
  | "no-report"
  | "no-funds"
  | "roster-full";

export function prospectOrg(
  state: GameState,
  prospectId: string,
): { org: WorldHockeyOrg; prospect: OrgProspect } | null {
  for (const org of state.world?.hockeyOrgs ?? []) {
    const prospect = org.prospects.find((p) => p.id === prospectId);
    if (prospect) return { org, prospect };
  }
  return null;
}

export function signGate(state: GameState, prospectId: string): SignGate {
  const found = prospectOrg(state, prospectId);
  if (!found || !found.prospect.revealed || !found.prospect.attrs) {
    return "not-found";
  }
  if (found.prospect.signedByClubId) return "signed-away";
  if (!found.org.networkedByPlayer) return "no-network";
  if (!state.scoutReports.some((r) => r.subjectId === prospectId)) {
    return "no-report";
  }
  if (state.roster.length >= ROSTER_CAP) return "roster-full";
  if (state.resources.funds < SIGN_COST_FUNDS) return "no-funds";
  return "ok";
}

export function signGateHint(gate: SignGate): string {
  switch (gate) {
    case "signed-away":
      return "They've already signed elsewhere — that race is over.";
    case "no-network":
      return "Establish a scouting network at their org first.";
    case "no-report":
      return "No scout has filed on them — you don't sign what you haven't watched.";
    case "no-funds":
      return `Needs ${SIGN_COST_FUNDS} Funds for the contract.`;
    case "roster-full":
      return `Roster is full (${ROSTER_CAP}).`;
    case "not-found":
      return "They aren't available.";
    default:
      return "";
  }
}

// The player's standing bid — everything but the roll. Influence at the org
// is the backbone; filed reports and map proximity tilt close races.
function playerBid(
  state: GameState,
  org: WorldHockeyOrg,
  prospectId: string,
): number {
  const reports = state.scoutReports.filter(
    (r) => r.subjectId === prospectId,
  ).length;
  const hq = state.world?.hqTile;
  const dist = hq
    ? Math.max(Math.abs(hq.x - org.x), Math.abs(hq.y - org.y))
    : 99;
  const proximity = Math.max(0, 8 - Math.floor(dist / 2));
  return (
    org.influencePoints +
    Math.min(reports, REPORT_BID_CAP) * REPORT_BID_WEIGHT +
    proximity
  );
}

// Pre-race read for the UI: how contested is this signing? Never leaks the
// roll — just the standing bids anyone in the room could size up.
export function signingOdds(
  state: GameState,
  prospectId: string,
): { label: "uncontested" | "favored" | "contested" | "long shot"; rivalName: string | null } {
  const found = prospectOrg(state, prospectId);
  if (!found) return { label: "uncontested", rivalName: null };
  const suitors = Object.entries(found.org.rivalInfluence).filter(
    ([clubId, pts]) => pts > 0 && found.org.contactedByClubIds.includes(clubId),
  );
  if (suitors.length === 0) return { label: "uncontested", rivalName: null };
  const [rivalId, rivalPts] = suitors.sort((a, b) => b[1] - a[1])[0];
  const diff = playerBid(state, found.org, prospectId) - rivalPts;
  return {
    label: diff >= CONTEST_ROLL ? "favored" : diff >= -10 ? "contested" : "long shot",
    rivalName: CLUBS[rivalId]?.name ?? "A rival club",
  };
}

// Resolve the race. Seeded (D3): every roll threads draft.rngSeed.
export function signProspect(state: GameState, prospectId: string): GameState {
  if (signGate(state, prospectId) !== "ok") return state;
  const draft: GameState = structuredClone(state);
  const found = prospectOrg(draft, prospectId)!;
  const { org, prospect } = found;

  const myRoll = nextRandom(draft.rngSeed);
  draft.rngSeed = myRoll.seed;
  const myScore =
    playerBid(draft, org, prospectId) + myRoll.value * CONTEST_ROLL;

  let winnerClubId: string | null = null; // null = the player
  let bestScore = myScore;
  for (const clubId of org.contactedByClubIds) {
    const pts = org.rivalInfluence[clubId] ?? 0;
    if (pts <= 0) continue;
    const roll = nextRandom(draft.rngSeed);
    draft.rngSeed = roll.seed;
    const score = pts + roll.value * CONTEST_ROLL;
    if (score > bestScore) {
      bestScore = score;
      winnerClubId = clubId;
    }
  }

  if (winnerClubId) {
    prospect.signedByClubId = winnerClubId;
    purgeFromWatchLists(draft, prospectId);
    const rival = CLUBS[winnerClubId];
    return prependLog(
      draft,
      "rival",
      `Lost the race: ${prospect.name} signs with ${rival?.name ?? "a rival"}`,
      `You made your case, but ${rival?.name ?? "a rival club"}'s pull at ${org.name} won out — ${prospect.name} signs with them and leaves the pool. No funds spent; the lesson was free.`,
      rival?.name,
    );
  }

  // Won: the prospect converts to a Player (same id — the scouting history
  // follows them onto the roster).
  draft.resources.funds -= SIGN_COST_FUNDS;
  const style =
    prospect.style ??
    (() => {
      const rolled = rollStyle(draft.rngSeed, prospect.position);
      draft.rngSeed = rolled.seed;
      return rolled.style;
    })();
  const traits = rollTraits(draft.rngSeed);
  draft.rngSeed = traits.seed;
  const player: Player = {
    id: prospect.id,
    name: prospect.name ?? "Unknown",
    nationality: prospect.nationality,
    gender: prospect.gender ?? "male",
    position: prospect.position,
    age: prospect.age ?? 17,
    attrs: prospect.attrs!,
    potential: prospect.potential ?? 50,
    style,
    traits: traits.traits,
    hasEquipment: false,
    joinedMonth: draft.month,
    origin: `signed from ${org.name}`,
    note: prospect.teaser,
  };
  draft.roster.push(player);
  org.prospects = org.prospects.filter((p) => p.id !== prospectId);
  purgeFromWatchLists(draft, prospectId);
  draft.pendingPlayerReveal = {
    player,
    source: "signing",
    firstEver: !draft.seenFirstPlayer,
  };
  draft.seenFirstPlayer = true;
  return prependLog(
    draft,
    "card",
    `Signed: ${player.name}`,
    `${player.name} leaves ${org.name} to wear your colors — your first scouted signing pays off the whole pipeline. (-${SIGN_COST_FUNDS} Funds)`,
    org.name,
  );
}

function purgeFromWatchLists(draft: GameState, prospectId: string): void {
  for (const m of draft.scoutMissions) {
    m.watchedPlayerIds = m.watchedPlayerIds.filter((id) => id !== prospectId);
  }
}

// Monthly rival pressure (docs/15 §4 "Coveted… the window is closing"): a
// rival courting an org hard enough may sign its best prospect. Only orgs
// the player has CONTACTED are swept — a race you can't see isn't pressure,
// it's bookkeeping.
export function rivalSigningPressure(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const org of world.hockeyOrgs) {
    if (!org.playerContacted) continue;
    const suitors = Object.entries(org.rivalInfluence)
      .filter(([, pts]) => pts >= POACH_MIN_INFLUENCE)
      .sort((a, b) => b[1] - a[1]);
    if (suitors.length === 0) continue;
    const candidates = org.prospects.filter(
      (p) => p.revealed && !p.signedByClubId && p.potential,
    );
    if (candidates.length === 0) continue;
    const [clubId, pts] = suitors[0];
    const roll = nextRandom(draft.rngSeed);
    draft.rngSeed = roll.seed;
    if (roll.value >= Math.min(0.2, 0.04 + pts / 500)) continue;
    // They take the best they can see — rivals sign for the ceiling.
    const target = [...candidates].sort(
      (a, b) => (b.potential ?? 0) - (a.potential ?? 0),
    )[0];
    target.signedByClubId = clubId;
    purgeFromWatchLists(draft, target.id);
    const rival = CLUBS[clubId];
    push(
      "rival",
      `${rival?.name ?? "A rival"} signs ${target.name}`,
      `${target.name} (${target.position}, ${org.name}) signs with ${rival?.name ?? "a rival club"}. Their people were in the building all season — the window closed.`,
      rival?.name,
    );
  }
}

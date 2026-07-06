import type {
  GameState,
  MatchGoal,
  MatchResult,
  MatchTeamLine,
  Player,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { prependLog } from "./log";
import { nextRandom } from "./rng";
import { teamRatings, type TeamRatings } from "./ratings";
import { ensureRivalRosters } from "./rivalAI";
import { hasFullLine } from "./selectors";

// Match Engine v0 (D51, docs/17): the first time hockey is actually played.
// A seeded period-by-period shot-chance model — NOT a single dice roll — so
// the box score is real, not retrofitted. simulateMatch is pure (seed in,
// result + seed out, D3); everything it knows about a team comes through
// ratings.teamRatings, so both sides compose identically. Exhibition-only:
// ties stand, no OT, no penalties, no calendar — that's Act III.

// Chance generation (transition vs defense), per team per period.
const BASE_CHANCES = 5;
const CHANCE_RATING_DIVISOR = 12;
const CHANCE_JITTER = 3;
const MIN_CHANCES = 2;
const MAX_CHANCES = 12;
// Chance conversion (attack vs goaltending, physicality as a nudge).
const BASE_CONVERSION = 0.11;
const ATTACK_WEIGHT = 0.005;
const PHYSICALITY_WEIGHT = 0.001;
const MIN_CONVERSION = 0.02;
const MAX_CONVERSION = 0.4;
const ASSIST_ODDS = 0.65;
const PERIODS = 3;
// A stolen game reads as goaltending: the winning goalie is the star when
// they faced this many shots and allowed at most one.
const STAR_GOALIE_SHOTS = 12;

export type MatchTeam = {
  clubId: string;
  name: string;
  roster: Player[];
};

// Per-player scoring tallies, tracked so the star pick can count points.
type Tally = { name: string; clubId: string; goals: number; assists: number };

export function simulateMatch(
  seed: number,
  home: MatchTeam,
  away: MatchTeam,
  month: number,
  id: string,
): { result: MatchResult; seed: number } {
  let s = seed;
  const draw = (): number => {
    const r = nextRandom(s);
    s = r.seed;
    return r.value;
  };

  const sides = [
    { team: home, ratings: teamRatings(home.roster) },
    { team: away, ratings: teamRatings(away.roster) },
  ];
  const lines: MatchTeamLine[] = sides.map(({ team }) => ({
    clubId: team.clubId,
    name: team.name,
    score: 0,
    shots: 0,
    periodGoals: Array.from({ length: PERIODS }, () => 0),
  }));
  const goals: MatchGoal[] = [];
  const tallies = new Map<string, Tally>();
  const tally = (p: Player, clubId: string): Tally => {
    let t = tallies.get(p.id);
    if (!t) {
      t = { name: p.name, clubId, goals: 0, assists: 0 };
      tallies.set(p.id, t);
    }
    return t;
  };

  for (let period = 1; period <= PERIODS; period++) {
    for (let i = 0; i < sides.length; i++) {
      const att = sides[i];
      const def = sides[1 - i];
      const chances = clamp(
        Math.round(
          BASE_CHANCES +
            (att.ratings.transition - def.ratings.defense) / CHANCE_RATING_DIVISOR +
            draw() * CHANCE_JITTER,
        ),
        MIN_CHANCES,
        MAX_CHANCES,
      );
      lines[i].shots += chances;
      const p = conversionOdds(att.ratings, def.ratings);
      for (let c = 0; c < chances; c++) {
        if (draw() >= p) continue;
        // Goal: a shooter finishes, a teammate maybe feeds him.
        const skaters = gearedSkaters(att.team.roster);
        if (skaters.length === 0) continue; // degenerate roster: no one to score
        const scorer = weightedPick(
          skaters,
          (pl) => shooterWeight(pl),
          draw(),
        );
        let assist: Player | null = null;
        if (skaters.length > 1 && draw() < ASSIST_ODDS) {
          assist = weightedPick(
            skaters.filter((pl) => pl.id !== scorer.id),
            (pl) => passerWeight(pl),
            draw(),
          );
        }
        lines[i].score += 1;
        lines[i].periodGoals[period - 1] += 1;
        goals.push({
          period,
          minute: Math.floor(draw() * 20),
          clubId: att.team.clubId,
          scorerId: scorer.id,
          scorer: scorer.name,
          assist: assist?.name,
        });
        tally(scorer, att.team.clubId).goals += 1;
        if (assist) tally(assist, att.team.clubId).assists += 1;
      }
    }
  }

  goals.sort((a, b) => a.period - b.period || a.minute - b.minute);
  const result: MatchResult = {
    id,
    month,
    kind: "exhibition",
    home: lines[0],
    away: lines[1],
    goals,
    star: pickStar(lines, sides, tallies),
  };
  return { result, seed: s };
}

function conversionOdds(att: TeamRatings, def: TeamRatings): number {
  return clamp(
    BASE_CONVERSION +
      (att.attack - def.goaltending) * ATTACK_WEIGHT +
      (att.physicality - def.physicality) * PHYSICALITY_WEIGHT,
    MIN_CONVERSION,
    MAX_CONVERSION,
  );
}

function gearedSkaters(roster: Player[]): Player[] {
  return roster.filter((p) => p.hasEquipment && p.attrs.kind === "skater");
}

function gearedGoalie(roster: Player[]): Player | undefined {
  return roster.find((p) => p.hasEquipment && p.attrs.kind === "goalie");
}

// Forwards finish more; the weight leaks individual Shooting into the reel.
function shooterWeight(p: Player): number {
  const shooting = p.attrs.kind === "skater" ? p.attrs.skater.shooting : 1;
  return shooting + (p.position !== "D" ? 15 : 0);
}

function passerWeight(p: Player): number {
  return p.attrs.kind === "skater" ? p.attrs.skater.passing : 1;
}

// One star, one line. Priority: a winning goalie who stole the game, then the
// top point scorer, then (scoreless) the busier goalie.
function pickStar(
  lines: MatchTeamLine[],
  sides: { team: MatchTeam; ratings: TeamRatings }[],
  tallies: Map<string, Tally>,
): MatchResult["star"] {
  const winnerIdx =
    lines[0].score > lines[1].score ? 0 : lines[1].score > lines[0].score ? 1 : -1;
  if (winnerIdx >= 0) {
    const winner = lines[winnerIdx];
    const loserLine = lines[1 - winnerIdx];
    const goalie = gearedGoalie(sides[winnerIdx].team.roster);
    // The winning side's goalie faced the LOSER's shots.
    if (goalie && loserLine.shots >= STAR_GOALIE_SHOTS && loserLine.score <= 1) {
      return {
        playerId: goalie.id,
        name: goalie.name,
        clubId: winner.clubId,
        line: `${loserLine.shots - loserLine.score} saves on ${loserLine.shots}`,
      };
    }
  }
  let best: { id: string; t: Tally } | null = null;
  for (const [id, t] of tallies) {
    const points = t.goals + t.assists;
    const bestPoints = best ? best.t.goals + best.t.assists : -1;
    if (points > bestPoints || (points === bestPoints && best && t.goals > best.t.goals)) {
      best = { id, t };
    }
  }
  if (best) {
    return {
      playerId: best.id,
      name: best.t.name,
      clubId: best.t.clubId,
      line: statLine(best.t),
    };
  }
  // Scoreless tie: the busier goalie kept their side in it.
  const busyIdx = lines[0].shots >= lines[1].shots ? 1 : 0; // goalie faces the OTHER side's shots
  const goalie = gearedGoalie(sides[busyIdx].team.roster);
  if (!goalie) return null;
  const faced = lines[1 - busyIdx].shots;
  return {
    playerId: goalie.id,
    name: goalie.name,
    clubId: lines[busyIdx].clubId,
    line: `${faced} saves on ${faced}`,
  };
}

function statLine(t: Tally): string {
  const parts: string[] = [];
  if (t.goals > 0) parts.push(`${t.goals}G`);
  if (t.assists > 0) parts.push(`${t.assists}A`);
  return parts.join(" ");
}

function weightedPick<T>(items: T[], weight: (item: T) => number, roll: number): T {
  const total = items.reduce((sum, item) => sum + Math.max(1, weight(item)), 0);
  let cursor = roll * total;
  for (const item of items) {
    cursor -= Math.max(1, weight(item));
    if (cursor <= 0) return item;
  }
  return items[items.length - 1];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ---------------------------------------------------------------------------
// Exhibition initiation (docs/17 §4): the player challenges a contacted rival.
// ---------------------------------------------------------------------------

export type ExhibitionGate =
  | "ok"
  | "no-rival"
  | "not-contacted"
  | "no-line"
  | "already-played";

export function exhibitionGate(
  state: GameState,
  rivalClubId: string,
): ExhibitionGate {
  const rival = state.world?.rivals.find((r) => r.clubId === rivalClubId);
  if (!rival) return "no-rival";
  if (!rival.contacted) return "not-contacted";
  if (!hasFullLine(state)) return "no-line";
  // Once a month, derived from history — a turn can't be spent fishing the
  // RNG for a better score.
  if (state.matchHistory.some((m) => m.month === state.month)) {
    return "already-played";
  }
  return "ok";
}

export function exhibitionGateHint(gate: ExhibitionGate): string {
  switch (gate) {
    case "not-contacted":
      return "You can't book a game with a rumor — make first contact.";
    case "no-line":
      return "Ice a full line first: 6 geared players including a goalie.";
    case "already-played":
      return "The team already played this month — one game per turn.";
    case "no-rival":
      return "No such club.";
    default:
      return "";
  }
}

// Resolve an exhibition against a contacted rival. Seeded (D3); free in v0 —
// costs and frequency arrive with the Act III calendar. `force` (dev panel)
// bypasses the once-a-month gate, never the sim.
export function playExhibition(
  state: GameState,
  rivalClubId: string,
  opts: { force?: boolean } = {},
): GameState {
  const gate = exhibitionGate(state, rivalClubId);
  if (gate !== "ok" && !(opts.force && gate === "already-played")) return state;
  if (!state.club) return state;

  const draft: GameState = structuredClone(state);
  ensureRivalRosters(draft); // defensive: contact paths already generate
  const rival = draft.world!.rivals.find((r) => r.clubId === rivalClubId)!;
  const rivalClub = CLUBS[rivalClubId];

  const sim = simulateMatch(
    draft.rngSeed,
    { clubId: draft.club!.id, name: draft.club!.name, roster: draft.roster },
    {
      clubId: rivalClubId,
      name: rivalClub?.name ?? "Rival Club",
      roster: rival.roster,
    },
    draft.month,
    `match-${draft.month}-${draft.matchHistory.length}`,
  );
  draft.rngSeed = sim.seed;
  draft.matchHistory = [sim.result, ...draft.matchHistory];
  draft.pendingMatchResult = sim.result;

  const { home, away } = sim.result;
  const outcome =
    home.score > away.score ? "win over" : home.score < away.score ? "loss to" : "tie with";
  const star = sim.result.star;
  return prependLog(
    draft,
    "rival",
    `Exhibition ${outcome} ${away.name}: ${home.score}–${away.score}`,
    `${home.name} ${home.score}, ${away.name} ${away.score} — a friendly on ${
      home.score >= away.score ? "your" : "their"
    } terms. Shots ${home.shots}–${away.shots}.${
      star ? ` Star of the game: ${star.name} (${star.line}).` : ""
    }`,
    "Game Notes",
  );
}

import type {
  GameState,
  GoalieAttrs,
  Player,
  PlayerAttrs,
  PlayerPosition,
  RivalClub,
  SkaterAttrs,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { playerImageFor } from "../data/playerImages";
import { computeOverall } from "./ratings";
import { nextRandom } from "./rng";
import {
  rollPersonIdentity,
  rollAttrs,
  rollPotential,
  rollStyle,
  rollTraits,
} from "./playerGen";
import { RIVAL_ROSTER_BANDS } from "./rivalAI";
import type { PushLog } from "./turnContext";

// Player development & aging (docs/15 §6/§8C, Phase 1 — Q34/Q12).
// Honest calendar: a turn is one month, so a player ages one year every 12
// turns (staggered by a birthday derived from the player id, so ages don't all
// tick at once). Each turn young players' attributes drift UP toward their
// hidden `potential` ceiling; prime plateaus; then attributes DECLINE (physical
// first, Hockey IQ / composure age well); at a seeded threshold they retire.
// OVR is derived, so this only ever moves attributes — no headline to keep in
// sync. Rivals age with full parity (their rosters backfill so they stay
// competitive; the human must replace retirees by scouting/tryouts).

const ATTR_FLOOR = 1;
const ATTR_CAP = 99;

// Growth: fraction of the remaining (potential − current OVR) gap closed per
// turn, at peak-growth age. Small — it compounds monthly and tapers with age.
const GROWTH_PER_TURN = 0.022;
// Decline: OVR-equivalent points shed per turn at full decline, spread across
// attributes by the weights below (physical attrs carry most of it).
const DECLINE_PER_TURN = 0.16;

// Age → growth multiplier. Fastest in the junior years, gone by the mid-20s.
function growthMult(age: number): number {
  if (age <= 18) return 1;
  if (age <= 20) return 0.7;
  if (age <= 22) return 0.4;
  if (age <= 24) return 0.15;
  return 0;
}

// Age → decline multiplier. Nothing through the prime, then an accelerating
// fade. `posShift` pushes the curve later for positions that age well.
function declineMult(age: number, posShift: number): number {
  const a = age - posShift;
  if (a <= 29) return 0;
  if (a <= 31) return 0.35;
  if (a <= 33) return 0.7;
  if (a <= 35) return 1;
  return 1.5;
}

// Goalies and (to a lesser degree) defensemen peak and fade later.
function positionShift(position: PlayerPosition): number {
  if (position === "G") return 3;
  if (position === "D") return 1;
  return 0;
}

// How fast each attribute erodes with age. Skating and physicality go first;
// Hockey IQ / Compete (and a goalie's positioning / composure) barely move.
const SKATER_DECLINE_WEIGHTS: Record<keyof SkaterAttrs, number> = {
  speed: 1.4,
  agility: 1.4,
  physicality: 1.1,
  checking: 0.9,
  shooting: 0.7,
  puckControl: 0.6,
  passing: 0.5,
  faceoffs: 0.4,
  compete: 0.15,
  hockeyIq: 0.1,
};
const GOALIE_DECLINE_WEIGHTS: Record<keyof GoalieAttrs, number> = {
  athleticism: 1.4,
  reflexes: 1.2,
  gloveHands: 0.7,
  reboundControl: 0.6,
  positioning: 0.2,
  composure: 0.1,
};

// Per-year retirement odds once a player ages past his prime (rolled on his
// birthday). `positionShift` lets goalies/D hang on a couple years longer.
function retirementChance(age: number, position: PlayerPosition): number {
  const a = age - positionShift(position);
  if (a < 34) return 0;
  if (a === 34) return 0.06;
  if (a === 35) return 0.12;
  if (a === 36) return 0.22;
  if (a === 37) return 0.36;
  if (a === 38) return 0.52;
  if (a === 39) return 0.7;
  if (a === 40) return 0.85;
  return 1;
}

// Stable per-player birthday month (0–11) from the id, so age ticks and
// retirement rolls stagger across the year instead of firing all at once.
function birthdayMonth(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 12) + 12) % 12;
}

function clampAttr(v: number): number {
  return Math.max(ATTR_FLOOR, Math.min(ATTR_CAP, v));
}

function attrEntries(attrs: PlayerAttrs): [string, number][] {
  return attrs.kind === "goalie"
    ? Object.entries(attrs.goalie)
    : Object.entries(attrs.skater);
}

function setAttr(attrs: PlayerAttrs, key: string, value: number): void {
  if (attrs.kind === "goalie") {
    (attrs.goalie as Record<string, number>)[key] = value;
  } else {
    (attrs.skater as Record<string, number>)[key] = value;
  }
}

function declineWeight(attrs: PlayerAttrs, key: string): number {
  return attrs.kind === "goalie"
    ? GOALIE_DECLINE_WEIGHTS[key as keyof GoalieAttrs]
    : SKATER_DECLINE_WEIGHTS[key as keyof SkaterAttrs];
}

// Apply one month of growth or decline in place. Growth raises every attribute
// toward the ceiling (uniformly — the shape the player was generated with is
// preserved); decline erodes them by their aging weights.
function developAttrs(player: Player): void {
  const g = growthMult(player.age);
  if (g > 0) {
    const gap = player.potential - computeOverall(player);
    if (gap > 0.5) {
      const step = GROWTH_PER_TURN * g * gap;
      for (const [key, val] of attrEntries(player.attrs)) {
        setAttr(player.attrs, key, clampAttr(val + step));
      }
    }
    return;
  }
  const d = declineMult(player.age, positionShift(player.position));
  if (d <= 0) return; // prime plateau
  const drop = DECLINE_PER_TURN * d;
  for (const [key, val] of attrEntries(player.attrs)) {
    setAttr(player.attrs, key, clampAttr(val - drop * declineWeight(player.attrs, key)));
  }
}

// Advance one roster one month: develop everyone, tick birthdays, and collect
// the ids that retire this turn (rolled once, on the birthday). Threads the
// seed for determinism.
function advanceRoster(
  roster: Player[],
  month: number,
  seed: number,
): { retired: Player[]; seed: number } {
  let s = seed;
  const retired: Player[] = [];
  for (const player of roster) {
    developAttrs(player);
    if (month % 12 === birthdayMonth(player.id)) {
      player.age += 1;
      const chance = retirementChance(player.age, player.position);
      if (chance > 0) {
        const roll = nextRandom(s);
        s = roll.seed;
        if (roll.value < chance) retired.push(player);
      }
    }
  }
  return { retired, seed: s };
}

// A fresh young replacement for a rival that lost a player to retirement —
// same generators as the first-contact roster, era-banded, junior-aged.
function generateRivalReplacement(
  seed: number,
  rival: RivalClub,
  month: number,
  position: PlayerPosition,
  usedNames: Set<string>,
): { player: Player; seed: number } {
  let s = seed;
  const band = RIVAL_ROSTER_BANDS[rival.eraId] ?? RIVAL_ROSTER_BANDS["pond-hockey"];
  const club = CLUBS[rival.clubId];
  const styleRoll = rollStyle(s, position);
  s = styleRoll.seed;
  const attrsRoll = rollAttrs(s, position, styleRoll.style, band);
  s = attrsRoll.seed;
  const potRoll = rollPotential(s, position, attrsRoll.attrs);
  s = potRoll.seed;
  const traitsRoll = rollTraits(s);
  s = traitsRoll.seed;
  const identity = rollPersonIdentity(s, rival, "scoutedPlayerFemale", usedNames);
  s = identity.seed;
  const ageRoll = nextRandom(s);
  s = ageRoll.seed;
  const id = `rival-${rival.clubId}-p-${month}-${Math.floor(ageRoll.value * 1e6)}`;
  const player: Player = {
    id,
    name: identity.name,
    nationality: identity.nationality,
    gender: identity.gender,
    position,
    age: 18 + Math.floor(ageRoll.value * 4), // junior replacement, 18–21
    attrs: attrsRoll.attrs,
    potential: potRoll.potential,
    style: styleRoll.style,
    traits: traitsRoll.traits,
    imageUrl: playerImageFor({
      gender: identity.gender,
      kind: "player",
      position,
      seed: id,
    }),
    hasEquipment: true,
    joinedMonth: month,
    origin: `${club?.name ?? "rival"} roster`,
    note: "A young call-up finding his feet.",
  };
  return { player, seed: s };
}

export function advanceDevelopment(draft: GameState, push: PushLog): void {
  // Human roster: develop, age, retire. Retirees leave a hole to fill.
  const human = advanceRoster(draft.roster, draft.month, draft.rngSeed);
  draft.rngSeed = human.seed;
  if (human.retired.length > 0) {
    const retiredIds = new Set(human.retired.map((p) => p.id));
    draft.roster = draft.roster.filter((p) => !retiredIds.has(p.id));
    for (const p of human.retired) {
      const role =
        p.position === "G" ? "goaltender" : p.position === "D" ? "defenseman" : "forward";
      push(
        "flavor",
        `${p.name} hangs up the skates`,
        `After a career on the ice, ${p.name} — a ${p.age}-year-old ${role} — is calling it a day and retiring from the club. Time to find who plays those minutes next.`,
        p.name,
      );
    }
  }

  // Rivals age with full parity, but backfill so their rosters stay competitive
  // (silent — no letters, and never for uncontacted clubs, to avoid spoilers).
  for (const rival of draft.world?.rivals ?? []) {
    if (rival.roster.length === 0) continue;
    const res = advanceRoster(rival.roster, draft.month, draft.rngSeed);
    draft.rngSeed = res.seed;
    if (res.retired.length === 0) continue;
    const retiredIds = new Set(res.retired.map((p) => p.id));
    rival.roster = rival.roster.filter((p) => !retiredIds.has(p.id));
    const usedNames = new Set(rival.roster.map((p) => p.name));
    for (const gone of res.retired) {
      const repl = generateRivalReplacement(
        draft.rngSeed,
        rival,
        draft.month,
        gone.position,
        usedNames,
      );
      draft.rngSeed = repl.seed;
      usedNames.add(repl.player.name);
      rival.roster.push(repl.player);
    }
  }
}

import type {
  GoalieAttrs,
  PlayerAttrs,
  PlayerPosition,
  PlayerStyle,
  SkaterAttrs,
} from "../types/game";
import {
  GOALIE_ATTR_ORDER,
  SKATER_ATTR_ORDER,
  STYLE_BIAS,
  STYLES_BY_POSITION,
} from "../data/attributes";
import { computeOverall } from "./ratings";
import { nextRandom } from "./rng";

// Shared player generation (docs/15 §3): every source of humans — tryouts,
// wanderers, org prospects — rolls through here so the 1–100 scale, style
// biasing, potential, and hidden traits stay consistent. All rolls thread the
// seed (D3); helpers return the advanced seed alongside the value.

// The quality band a source rolls in: attrs land in [min, min+span] before
// style bias. Pond-era locals ≈ 20–45; wanderers a cut above; org prospects
// between, with upside carried by potential.
export type AttrBand = { min: number; span: number };

export const POND_TRYOUT_BAND: AttrBand = { min: 20, span: 25 };
export const WANDERER_BAND: AttrBand = { min: 30, span: 25 };
export const PROSPECT_BAND: AttrBand = { min: 25, span: 30 };

const ATTR_CAP = 99;

export function rollPosition(
  seed: number,
  opts: { goalieOdds?: number } = {},
): { position: PlayerPosition; seed: number } {
  const goalieOdds = opts.goalieOdds ?? 0.18;
  const r1 = nextRandom(seed);
  if (r1.value < goalieOdds) return { position: "G", seed: r1.seed };
  const r2 = nextRandom(r1.seed);
  // Skaters: roughly two forwards (one C, one W) per defenseman.
  const position: PlayerPosition = r2.value < 0.3 ? "C" : r2.value < 0.62 ? "W" : "D";
  return { position, seed: r2.seed };
}

export function rollStyle(
  seed: number,
  position: PlayerPosition,
): { style: PlayerStyle; seed: number } {
  const pool = STYLES_BY_POSITION[position];
  const r = nextRandom(seed);
  return { style: pool[Math.floor(r.value * pool.length)] ?? pool[0], seed: r.seed };
}

// Roll a full attribute block in a band, shaped by the player's style.
export function rollAttrs(
  seed: number,
  position: PlayerPosition,
  style: PlayerStyle,
  band: AttrBand,
): { attrs: PlayerAttrs; seed: number } {
  let s = seed;
  const bias = STYLE_BIAS[style] ?? {};
  const roll = (key: string): number => {
    const r = nextRandom(s);
    s = r.seed;
    const base = band.min + r.value * band.span;
    const mult = (bias as Record<string, number>)[key] ?? 1;
    return Math.max(1, Math.min(ATTR_CAP, Math.round(base * mult)));
  };
  if (position === "G") {
    const goalie = {} as GoalieAttrs;
    for (const key of GOALIE_ATTR_ORDER) goalie[key] = roll(key);
    return { attrs: { kind: "goalie", goalie }, seed: s };
  }
  const skater = {} as SkaterAttrs;
  for (const key of SKATER_ATTR_ORDER) skater[key] = roll(key);
  return { attrs: { kind: "skater", skater }, seed: s };
}

// True ceiling OVR: current OVR plus a seeded headroom margin. Young unknowns
// carry the widest upside; the margin is the raw material development (Act IV)
// will grow players through.
export function rollPotential(
  seed: number,
  position: PlayerPosition,
  attrs: PlayerAttrs,
  headroom: { min: number; span: number } = { min: 8, span: 25 },
): { potential: number; seed: number } {
  const r = nextRandom(seed);
  const ovr = computeOverall({ position, attrs });
  const potential = Math.min(ATTR_CAP, ovr + headroom.min + Math.round(r.value * headroom.span));
  return { potential, seed: r.seed };
}

// Hidden traits (docs/15 §3): durability + discipline, off the card.
export function rollTraits(
  seed: number,
): { traits: { durability: number; discipline: number }; seed: number } {
  const r1 = nextRandom(seed);
  const r2 = nextRandom(r1.seed);
  return {
    traits: {
      durability: 40 + Math.round(r1.value * 50),
      discipline: 40 + Math.round(r2.value * 50),
    },
    seed: r2.seed,
  };
}

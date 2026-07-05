import type {
  GoalieAttrs,
  NationId,
  NationalityWeights,
  PersonNationality,
  PlayerAttrs,
  PlayerGender,
  PlayerPosition,
  PlayerStyle,
  SkaterAttrs,
  WeightedName,
} from "../types/game";
import {
  GOALIE_ATTR_ORDER,
  SKATER_ATTR_ORDER,
  STYLE_BIAS,
  STYLES_BY_POSITION,
} from "../data/attributes";
import { NATIONS } from "../data/nationalities";
import { NAME_POOLS } from "../data/playerNames";
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
const SECONDARY_NATIONALITY_ODDS = 0.06;

export const GENDER_ODDS = {
  tryoutCandidateFemale: 0.12,
  scoutedPlayerFemale: 0.1,
  staffFemale: 0.22,
} as const;

export type GenderRollContext = keyof typeof GENDER_ODDS;

export type NationalitySource = {
  homeNationId: NationId;
  nationalityWeights?: NationalityWeights;
};

export function nationalityWeightsFor(
  source: NationalitySource | null | undefined,
): NationalityWeights {
  if (!source) return { other: 1 };
  return source.nationalityWeights && Object.keys(source.nationalityWeights).length > 0
    ? source.nationalityWeights
    : { [source.homeNationId]: 1 };
}

function rollWeightedNation(
  seed: number,
  weights: NationalityWeights,
  exclude?: NationId,
): { nationId: NationId; seed: number } {
  const entries = (Object.entries(weights) as [NationId, number][])
    .filter(([nationId, weight]) => nationId !== exclude && weight > 0);
  if (entries.length === 0) {
    const fallback = exclude && exclude !== "other" ? "other" : "usa";
    return { nationId: fallback, seed };
  }
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const r = nextRandom(seed);
  let cursor = r.value * total;
  for (const [nationId, weight] of entries) {
    cursor -= weight;
    if (cursor <= 0) return { nationId, seed: r.seed };
  }
  return { nationId: entries[entries.length - 1][0], seed: r.seed };
}

export function rollNationality(
  seed: number,
  source: NationalitySource | null | undefined,
): { nationality: PersonNationality; seed: number } {
  const weights = nationalityWeightsFor(source);
  const primary = rollWeightedNation(seed, weights);
  const secondaryRoll = nextRandom(primary.seed);
  const hasSecondaryOption = (Object.entries(weights) as [NationId, number][])
    .some(([nationId, weight]) => nationId !== primary.nationId && weight > 0);
  if (secondaryRoll.value >= SECONDARY_NATIONALITY_ODDS || !hasSecondaryOption) {
    return {
      nationality: { primary: primary.nationId },
      seed: secondaryRoll.seed,
    };
  }
  const secondary = rollWeightedNation(secondaryRoll.seed, weights, primary.nationId);
  return {
    nationality:
      secondary.nationId === primary.nationId
        ? { primary: primary.nationId }
        : { primary: primary.nationId, secondary: secondary.nationId },
    seed: secondary.seed,
  };
}

export function rollGender(
  seed: number,
  context: GenderRollContext,
): { gender: PlayerGender; seed: number } {
  const r = nextRandom(seed);
  return {
    gender: r.value < GENDER_ODDS[context] ? "female" : "male",
    seed: r.seed,
  };
}

function rollWeightedName(seed: number, pool: WeightedName[]): { value: string; seed: number } {
  const r = nextRandom(seed);
  const total = pool.reduce((sum, n) => sum + (n.weight ?? 1), 0);
  let cursor = r.value * total;
  for (const name of pool) {
    cursor -= name.weight ?? 1;
    if (cursor <= 0) return { value: name.value, seed: r.seed };
  }
  return { value: pool[pool.length - 1]?.value ?? "Unknown", seed: r.seed };
}

export function rollPersonIdentityForNationality(
  seed: number,
  nationality: PersonNationality,
  context: GenderRollContext,
  usedNames?: Set<string>,
): {
  name: string;
  gender: PlayerGender;
  nationality: PersonNationality;
  seed: number;
} {
  let s = seed;
  const gender = rollGender(s, context);
  s = gender.seed;
  const poolId = NATIONS[nationality.primary]?.namePoolId ?? "other";
  const pool = NAME_POOLS[poolId] ?? NAME_POOLS.other;
  const firstPool = gender.gender === "female" ? pool.femaleFirstNames : pool.maleFirstNames;

  let name = "Unknown";
  for (let attempt = 0; attempt < 6; attempt++) {
    const first = rollWeightedName(s, firstPool);
    s = first.seed;
    const last = rollWeightedName(s, pool.lastNames);
    s = last.seed;
    name = `${first.value} ${last.value}`;
    if (!usedNames?.has(name)) break;
  }
  usedNames?.add(name);

  return {
    name,
    gender: gender.gender,
    nationality,
    seed: s,
  };
}

export function rollPersonIdentity(
  seed: number,
  source: NationalitySource | null | undefined,
  context: GenderRollContext,
  usedNames?: Set<string>,
): {
  name: string;
  gender: PlayerGender;
  nationality: PersonNationality;
  seed: number;
} {
  let s = seed;
  const nationality = rollNationality(s, source);
  s = nationality.seed;
  return rollPersonIdentityForNationality(
    s,
    nationality.nationality,
    context,
    usedNames,
  );
}

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

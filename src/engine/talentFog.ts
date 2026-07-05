import type { AttrEstimate, AttrEstimates, AttrKey, PlayerAttrs } from "../types/game";
import { ATTR_ABBR } from "../data/attributes";
import { attrEntries } from "./ratings";
import { nextRandom } from "./rng";

// Fog-of-talent (D29/D32, docs/15 §5–6): scouted attributes are estimates
// whose tightness depends on the judging skill of whoever did the looking.
// The contract: the TRUE value is always inside the range (the fog is
// honest), but the range's center is seeded off-true (the fog misleads) — a
// wide range centered high can make a dud look like a gem.

const ATTR_MIN = 1;
const ATTR_MAX = 99;

// Range half-width on the 1–100 scale, from a judging attribute (judging
// itself stays on the scout 20-point scale):
//   judging 3 (volunteer)  -> ±20     judging 13 (ace) -> ±5
//   judging 7 (traveled)   -> ±15     judging 16+      -> ±5 (floor)
export function fogWidth(judging: number): number {
  return Math.max(5, Math.round((16 - judging) / 3) * 5);
}

// One estimated attribute. Threads the seed (D3).
export function estimateAttr(
  seed: number,
  trueValue: number,
  judging: number,
): { estimate: AttrEstimate; seed: number } {
  const width = fogWidth(judging);
  const r = nextRandom(seed);
  // Seeded error in [-width, +width]; truth stays inside [center-w, center+w].
  const error = Math.floor(r.value * (2 * width + 1)) - width;
  const center = Math.min(ATTR_MAX, Math.max(ATTR_MIN, trueValue + error));
  return {
    seed: r.seed,
    estimate: {
      low: Math.max(ATTR_MIN, center - width),
      high: Math.min(ATTR_MAX, center + width),
    },
  };
}

// Estimate a full attribute block (skater or goalie) with one judging rating.
export function estimateAttrs(
  seed: number,
  attrs: PlayerAttrs,
  judging: number,
): { estimates: AttrEstimates; seed: number } {
  let s = seed;
  const out: AttrEstimates = {};
  for (const [key, value] of attrEntries(attrs)) {
    const rolled = estimateAttr(s, value, judging);
    s = rolled.seed;
    out[key as AttrKey] = rolled.estimate;
  }
  return { estimates: out, seed: s };
}

export function formatEstimate(e: AttrEstimate): string {
  return e.low === e.high ? `${e.low}` : `${e.low}–${e.high}`;
}

// Compact one-line scouted readout for tables: three headline attributes for
// the position, shown as the scout's STATIC point read (EHM-style — the
// number is the scout's belief, and it can be wrong; ranges stay internal).
// Falls back to the org's-word teaser when nobody has filed a report.
const SKATER_HEADLINE: AttrKey[] = ["shooting", "passing", "speed"];
const GOALIE_HEADLINE: AttrKey[] = ["reflexes", "positioning", "gloveHands"];

const midOf = (e: AttrEstimate): number => Math.round((e.low + e.high) / 2);

export function estimateLine(p: {
  position: string;
  teaser?: string;
  attrEstimates?: AttrEstimates;
  potentialEstimate?: AttrEstimate;
}): string {
  const e = p.attrEstimates;
  if (!e) return p.teaser ? `“${p.teaser}”` : "No read yet.";
  const keys = p.position === "G" ? GOALIE_HEADLINE : SKATER_HEADLINE;
  return keys
    .filter((k) => e[k])
    .map((k) => `${ATTR_ABBR[k]} ${midOf(e[k]!)}`)
    .join(" · ");
}

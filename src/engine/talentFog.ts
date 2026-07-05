import type { AttrEstimate, AttrEstimates, PlayerAttrs } from "../types/game";
import { nextRandom } from "./rng";

// Fog-of-talent (D29, docs/13 §6.3): scouted attributes are estimates whose
// tightness depends on the judging skill of whoever did the looking. The
// contract: the TRUE value is always inside the range (the fog is honest),
// but the range's center is seeded off-true (the fog misleads) — a wide range
// centered high can make a dud look like a gem.

const ATTR_MIN = 1;
const ATTR_MAX = 20;

// Range half-width from a judging attribute (20-point scale):
//   judging 3 (volunteer)  -> ±4     judging 13 (ace) -> ±1
//   judging 7 (traveled)   -> ±3     judging 16+      -> ±1 (floor)
export function fogWidth(judging: number): number {
  return Math.max(1, Math.round((16 - judging) / 3));
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

// Estimate a full attribute block with one judging rating.
export function estimateAttrs(
  seed: number,
  attrs: PlayerAttrs,
  judging: number,
): { estimates: AttrEstimates; seed: number } {
  let s = seed;
  const out = {} as AttrEstimates;
  for (const key of Object.keys(attrs) as (keyof PlayerAttrs)[]) {
    const rolled = estimateAttr(s, attrs[key], judging);
    s = rolled.seed;
    out[key] = rolled.estimate;
  }
  return { estimates: out, seed: s };
}

export function formatEstimate(e: AttrEstimate): string {
  return e.low === e.high ? `${e.low}` : `${e.low}–${e.high}`;
}

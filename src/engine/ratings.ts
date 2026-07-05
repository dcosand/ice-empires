import type { GoalieAttrs, Player, PlayerAttrs, SkaterAttrs } from "../types/game";
import {
  GOALIE_ATTR_ORDER,
  GOALIE_OVR_WEIGHTS,
  SKATER_ATTR_ORDER,
  SKATER_OVR_WEIGHTS,
} from "../data/attributes";

// Derived ratings (docs/15 §3). OVR is never stored on a player — compute it
// at read time, like income and territory, so development/aging can change
// attributes without a stale headline number.

export function computeOverall(p: Pick<Player, "position" | "attrs">): number {
  if (p.attrs.kind === "goalie") {
    return weightedMean(p.attrs.goalie, GOALIE_ATTR_ORDER, GOALIE_OVR_WEIGHTS);
  }
  const pos = p.position === "G" ? "C" : p.position; // defensive fallback
  return weightedMean(p.attrs.skater, SKATER_ATTR_ORDER, SKATER_OVR_WEIGHTS[pos]);
}

function weightedMean<K extends string>(
  attrs: Record<K, number>,
  order: K[],
  weights: Record<K, number>,
): number {
  let sum = 0;
  let wsum = 0;
  for (const key of order) {
    sum += attrs[key] * weights[key];
    wsum += weights[key];
  }
  return Math.max(1, Math.min(99, Math.round(sum / wsum)));
}

// 0.5–5 star tier for at-a-glance reads. Thresholds, not a formula, so the
// bands can be tuned independently (94+ is the true-elite half-star).
const STAR_THRESHOLDS: [number, number][] = [
  [94, 5],
  [87, 4.5],
  [80, 4],
  [70, 3.5],
  [60, 3],
  [50, 2.5],
  [40, 2],
  [30, 1.5],
  [20, 1],
];

export function starTier(overall: number): number {
  for (const [min, stars] of STAR_THRESHOLDS) {
    if (overall >= min) return stars;
  }
  return 0.5;
}

// "★★★½" — for compact card corners.
export function starString(stars: number): string {
  return "★".repeat(Math.floor(stars)) + (stars % 1 ? "½" : "");
}

// One attribute by name regardless of kind — for generic table cells.
export function attrValue(attrs: PlayerAttrs, key: string): number {
  const rec: Record<string, number> =
    attrs.kind === "skater" ? attrs.skater : attrs.goalie;
  return rec[key] ?? 0;
}

// Every attribute as [key, value] pairs regardless of kind — for generic
// tables and fog iteration.
export function attrEntries(attrs: PlayerAttrs): [string, number][] {
  return attrs.kind === "skater"
    ? SKATER_ATTR_ORDER.map((k): [string, number] => [k, attrs.skater[k]])
    : GOALIE_ATTR_ORDER.map((k): [string, number] => [k, attrs.goalie[k]]);
}

// ---------------------------------------------------------------------------
// Team ratings (docs/15 §7 sketch) — computed on the fly from geared players,
// never stored. The Act III match engine will read these; until then they're
// a dashboard read.
// ---------------------------------------------------------------------------

export type TeamRatings = {
  attack: number;
  defense: number;
  transition: number;
  physicality: number;
  goaltending: number;
};

export function teamRatings(roster: Player[]): TeamRatings {
  const geared = roster.filter((p) => p.hasEquipment);
  const skaters = geared.filter(
    (p): p is Player & { attrs: { kind: "skater"; skater: SkaterAttrs } } =>
      p.attrs.kind === "skater",
  );
  const forwards = skaters.filter((p) => p.position !== "D");
  const dmen = skaters.filter((p) => p.position === "D");
  const goalies = geared.filter(
    (p): p is Player & { attrs: { kind: "goalie"; goalie: GoalieAttrs } } =>
      p.attrs.kind === "goalie",
  );

  const avg = (vals: number[]): number =>
    vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;

  return {
    attack: avg(
      forwards.map(
        (p) => (p.attrs.skater.shooting + p.attrs.skater.passing + p.attrs.skater.puckControl) / 3,
      ),
    ),
    defense: avg(
      [...dmen, ...forwards].map(
        (p) => (p.attrs.skater.checking + p.attrs.skater.hockeyIq) / 2,
      ),
    ),
    transition: avg(
      skaters.map((p) => (p.attrs.skater.speed + p.attrs.skater.agility) / 2),
    ),
    physicality: avg(skaters.map((p) => p.attrs.skater.physicality)),
    goaltending: avg(
      goalies.map((p) => computeOverall({ position: "G", attrs: p.attrs })),
    ),
  };
}

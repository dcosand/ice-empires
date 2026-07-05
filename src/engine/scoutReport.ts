import type {
  AttrEstimate,
  AttrEstimates,
  AttrKey,
  OrgProspect,
  ScoutCharacter,
  ScoutReport,
} from "../types/game";
import { ATTR_LABELS } from "../data/attributes";
import { fogWidth } from "./talentFog";

// Deterministic scout's-voice prose (docs/15 §5): built from the estimate
// ranges the scout actually filed — never the truth — so the report reads as
// what THIS scout believes. No RNG: the same report always renders the same.

const mid = (e: AttrEstimate): number => (e.low + e.high) / 2;

// Band adjectives on the 1–100 scale (midpoint of the scout's range).
function bandWord(midpoint: number): string {
  if (midpoint >= 87) return "elite";
  if (midpoint >= 75) return "impressive";
  if (midpoint >= 60) return "solid";
  if (midpoint >= 45) return "promising";
  if (midpoint >= 30) return "raw";
  return "rough";
}

function confidenceWord(judging: number): string {
  const width = fogWidth(judging);
  if (width <= 5) return "I'd stake my name on this read";
  if (width <= 10) return "I trust what I saw";
  if (width <= 15) return "take the numbers with some salt";
  return "this is a first impression, nothing more";
}

// Strongest and weakest attributes by the scout's own estimates.
function extremes(estimates: AttrEstimates): {
  best: [AttrKey, AttrEstimate] | null;
  worst: [AttrKey, AttrEstimate] | null;
} {
  let best: [AttrKey, AttrEstimate] | null = null;
  let worst: [AttrKey, AttrEstimate] | null = null;
  for (const [key, est] of Object.entries(estimates) as [AttrKey, AttrEstimate][]) {
    if (!est) continue;
    if (!best || mid(est) > mid(best[1])) best = [key, est];
    if (!worst || mid(est) < mid(worst[1])) worst = [key, est];
  }
  return { best, worst };
}

export function buildReportProse(input: {
  subjectName: string;
  age?: number;
  style?: string;
  attrEstimates: AttrEstimates;
  potentialEstimate: AttrEstimate;
  judgingAbility: number;
  judgingPotential: number;
}): string {
  const { best, worst } = extremes(input.attrEstimates);
  const first = input.subjectName.split(/\s+/)[0];
  const parts: string[] = [];

  if (best) {
    parts.push(
      `${first} is ${aOrAn(bandWord(mid(best[1])))} ${bandWord(mid(best[1]))} ${
        ATTR_LABELS[best[0]].toLowerCase()
      } ${input.style ? input.style.toLowerCase() : "player"} for ${
        input.age ? `a ${input.age}-year-old` : "his age"
      }.`,
    );
  }
  if (worst && best && worst[0] !== best[0] && mid(worst[1]) < 55) {
    parts.push(
      `The ${ATTR_LABELS[worst[0]].toLowerCase()} needs real work — ${bandWord(
        mid(worst[1]),
      )} at best right now.`,
    );
  }
  const potMid = Math.round(mid(input.potentialEstimate));
  const potWidth = input.potentialEstimate.high - input.potentialEstimate.low;
  parts.push(
    potWidth > 25
      ? `Ceiling? Ask me after more viewings — could be a ${potMid}-overall type, could be nothing of the sort.`
      : potMid >= 70
        ? `The ceiling is the story: I project a ${potMid}-overall player if he's brought along right.`
        : `Don't expect a star — I'd put his ceiling around ${potMid} overall.`,
  );
  parts.push(capitalize(`${confidenceWord(input.judgingAbility)}.`));
  return parts.join(" ");
}

function aOrAn(word: string): string {
  return /^[aeiou]/.test(word) ? "an" : "a";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// File a report for a just-revealed prospect (the establishing scout's read).
export function prospectReport(
  prospect: OrgProspect,
  scout: ScoutCharacter | null,
  org: { id: string; name: string },
  month: number,
): ScoutReport | null {
  if (!prospect.attrEstimates || !prospect.potentialEstimate || !prospect.name) {
    return null;
  }
  return {
    id: `report-${prospect.id}-${scout?.id ?? "club"}-${month}`,
    month,
    subjectId: prospect.id,
    subjectName: prospect.name,
    position: prospect.position,
    style: prospect.style,
    scoutId: scout?.id ?? "club",
    scoutName: scout?.name ?? "Club front office",
    orgId: org.id,
    orgName: org.name,
    attrEstimates: prospect.attrEstimates,
    potentialEstimate: prospect.potentialEstimate,
    prose: buildReportProse({
      subjectName: prospect.name,
      age: prospect.age,
      style: prospect.style,
      attrEstimates: prospect.attrEstimates,
      potentialEstimate: prospect.potentialEstimate,
      judgingAbility: scout?.judgingAbility ?? 3,
      judgingPotential: scout?.judgingPotential ?? 3,
    }),
  };
}

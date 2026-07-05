import type { ScoutQualityTier } from "../types/game";

// Scout quality tiers (D29/D31). Chosen at production for scout-spawning
// units: the funds cost is the unit's base cost × the tier multiplier, and the
// tier sets the roll range for both judging attributes (20-point scale).
// Volunteers are cheap and blind; an ace costs a pond-era fortune and arrives
// already knowing what a wrist shot should look like.

export type ScoutTierDef = {
  tier: ScoutQualityTier;
  name: string;
  costMultiplier: number;
  // Judging attribute roll: attrMin + d(attrDie) for each attribute.
  attrMin: number;
  attrDie: number;
  blurb: string;
};

export const SCOUT_TIERS: ScoutTierDef[] = [
  {
    tier: "volunteer",
    name: "Keen Volunteer",
    costMultiplier: 1,
    attrMin: 1,
    attrDie: 4, // 2–5
    blurb: "Owns binoculars. Enthusiasm outruns judgment.",
  },
  {
    tier: "traveled",
    name: "Traveled Scout",
    costMultiplier: 1.75,
    attrMin: 4,
    attrDie: 5, // 5–9
    blurb: "Has seen real hockey in at least two towns.",
  },
  {
    tier: "ace",
    name: "Ace Scout",
    costMultiplier: 2.5,
    attrMin: 8,
    attrDie: 6, // 9–14
    blurb: "Reads a skater's stride like a scouting report.",
  },
];

export const SCOUT_TIERS_BY_ID: Record<ScoutQualityTier, ScoutTierDef> =
  Object.fromEntries(SCOUT_TIERS.map((t) => [t.tier, t])) as Record<
    ScoutQualityTier,
    ScoutTierDef
  >;

// Watch slots (docs/15 §5): how many players one scout can watch at once on
// an assignment — the hard cap that makes "you can't watch everyone" bite.
// The first report batch sweeps the whole roster; after that only watched
// players get repeat viewings (and the sharpening that comes with them).
export const WATCH_SLOTS: Record<ScoutQualityTier, number> = {
  volunteer: 2,
  traveled: 3,
  ace: 4,
};

// Fieldwork XP awards (D29 hybrid acquisition: pay upfront, promote through
// work). Promotions land every SCOUT_XP_PER_PROMOTION points, applied in the
// monthly sweep.
export const SCOUT_XP_ENCOUNTER = 2; // investigated a goodie hut
export const SCOUT_XP_FIRST_CONTACT = 3; // their unit made first contact with an org
export const SCOUT_XP_NETWORK = 5; // established a scouting network
export const SCOUT_XP_PER_PROMOTION = 5;

export const SCOUT_NOTES = [
  "Keeps every note in one soggy notebook.",
  "Claims to judge skating by the sound of the blades.",
  "Drives anywhere for a rumor and a hot meal.",
  "Never forgets a face, frequently forgets the car.",
  "Writes reports in the margins of diner menus.",
  "Trusts nobody's stopwatch but their own.",
  "Once walked out of a tryout after one lap. Was right.",
  "Sends postcards from towns nobody scouted before.",
];

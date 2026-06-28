import type { ClubDef } from "../types/game";

// Shared First-12-Months starting profile. Non-Arizona clubs temporarily reuse
// the same mechanics (see DECISIONS.md) but carry their own identity + assets.
const SHARED_START = {
  startingBonusId: "nontraditional-market",
  startingResources: {
    budget: 8,
    operations: 8,
    hockeyKnowledge: 5,
    reputation: 9,
  },
  monthlyBaseIncome: {
    budget: 2,
    operations: 3,
    hockeyKnowledge: 1,
    reputation: 1,
  },
};

export const arizonaMonsoon: ClubDef = {
  id: "arizona-monsoon",
  name: "Arizona Monsoon HC",
  cityRegion: "Sonoran Desert",
  leaderArchetype: "The Desert Visionary",
  philosophy: "Nontraditional hockey growth",
  ...SHARED_START,
  identityText:
    "A storm is gathering in the desert. There is no arena, no league, no pipeline — just ice, stubbornness, and the belief that hockey can grow anywhere.",
  foundingFlavor:
    "Grow hockey where it was never supposed to exist — and earn Reputation for the unusual regions you uncover.",
  tagline: "Grow hockey where it was never supposed to exist.",
  accent: "#f2c14e",
  assetKey: "arizona",
};

export const halifaxPrivateers: ClubDef = {
  id: "halifax-privateers",
  name: "Halifax Privateers",
  cityRegion: "Maritime Coast",
  leaderArchetype: "The Salt-Ice Tactician",
  philosophy: "Toughness and board battles",
  ...SHARED_START,
  identityText:
    "On the Maritime coast the wind does half the coaching. The Privateers are built on cold mornings, hard corners, and players who simply refuse to be moved.",
  foundingFlavor: "Toughness, board battles, and weather that does the coaching.",
  tagline: "Toughness, board battles, and weather that does the coaching.",
  accent: "#5fb0d0",
  assetKey: "halifax",
};

export const helsinkiIceCrown: ClubDef = {
  id: "helsinki-ice-crown",
  name: "Helsinki Ice Crown",
  cityRegion: "Baltic North",
  leaderArchetype: "The Goalie Whisperer",
  philosophy: "Elite goaltending development",
  ...SHARED_START,
  identityText:
    "In the Baltic north, hockey is quiet and exact. The Ice Crown believes a club is built from the net outward — calm, patient, and impossible to score on.",
  foundingFlavor: "A nation of quiet, unbeatable netminders.",
  tagline: "A nation of quiet, unbeatable netminders.",
  accent: "#7dd3fc",
  assetKey: "helsinki",
};

export const saskatoonIronHerd: ClubDef = {
  id: "saskatoon-iron-herd",
  name: "Saskatoon Iron Herd",
  cityRegion: "Prairie Belt",
  leaderArchetype: "The Rink-Town Builder",
  philosophy: "Rink density and grassroots pipelines",
  ...SHARED_START,
  identityText:
    "Out on the prairie, every town has a rink and a grudge. The Iron Herd plans to turn that scattered density into one relentless, home-grown pipeline.",
  foundingFlavor: "Every town a rink, every rink a feeder system.",
  tagline: "Every town a rink, every rink a feeder system.",
  accent: "#d8a24a",
  assetKey: "saskatoon",
};

export const pragueLions: ClubDef = {
  id: "prague-lions",
  name: "Prague Lions",
  cityRegion: "Central Europe",
  leaderArchetype: "The Skill Architect",
  philosophy: "Skating and patient systems",
  ...SHARED_START,
  identityText:
    "In Central Europe the puck moves like a conversation. The Lions chase beautiful skating, patient systems, and a depth of skill that wears opponents down.",
  foundingFlavor: "Beautiful skating, patient systems, dangerous depth.",
  tagline: "Beautiful skating, patient systems, dangerous depth.",
  accent: "#e0556b",
  assetKey: "prague",
};

export const minnesotaNova: ClubDef = {
  id: "minnesota-nova",
  name: "Minnesota Nova",
  cityRegion: "Upper Midwest",
  leaderArchetype: "The State-of-Hockey Heir",
  philosophy: "Deep traditions and pipelines",
  ...SHARED_START,
  identityText:
    "This is the State of Hockey. Minnesota Nova inherits deep traditions and a pipeline that never freezes over — the challenge is turning all that pressure into a new star.",
  foundingFlavor: "Deep traditions and a pipeline that never freezes over.",
  tagline: "Old hockey gravity, new northern light.",
  accent: "#6fae8f",
  assetKey: "minnesota", // folder is "minnesota", not the club id
};

// Display order for the selection screen (Arizona first as the default).
export const CLUB_LIST: ClubDef[] = [
  arizonaMonsoon,
  halifaxPrivateers,
  helsinkiIceCrown,
  saskatoonIronHerd,
  pragueLions,
  minnesotaNova,
];

export const CLUBS: Record<string, ClubDef> = Object.fromEntries(
  CLUB_LIST.map((c) => [c.id, c]),
);

export const DEFAULT_CLUB_ID = arizonaMonsoon.id;

// Path to a club asset. `kind` is the file stem (logo / leader / background / rink).
export function clubAsset(
  club: ClubDef,
  kind: "logo" | "leader" | "background" | "rink",
): string {
  return `/assets/clubs/${club.assetKey}/${kind}.png`;
}

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
  name: "Arizona Monsoon",
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
  palette: { primary: "#0b1f33", secondary: "#00a7b5", light: "#eaf4f7" },
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
  palette: { primary: "#16324f", secondary: "#4fa8a8", light: "#e8eef2" },
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
  palette: { primary: "#11243b", secondary: "#7dc9e8", light: "#f2f7fa" },
  assetKey: "helsinki",
};

export const calgaryIronHerd: ClubDef = {
  id: "calgary-iron-herd",
  name: "Calgary Iron Herd",
  cityRegion: "Prairie Foothills",
  leaderArchetype: "The Rink-Town Builder",
  philosophy: "Rink density and grassroots pipelines",
  ...SHARED_START,
  identityText:
    "Where the prairie rises toward the Rockies, every town has a rink and a grudge. The Iron Herd plans to turn that scattered density into one relentless, home-grown pipeline.",
  foundingFlavor: "Every town a rink, every rink a feeder system.",
  tagline: "Every town a rink, every rink a feeder system.",
  accent: "#d8a24a",
  palette: { primary: "#2b3138", secondary: "#c8a65a", light: "#e9f1f4" },
  assetKey: "calgary",
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
  palette: { primary: "#7c2434", secondary: "#c9a24d", light: "#e7e1d6" },
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
  palette: { primary: "#1f4b4a", secondary: "#4c7fa6", light: "#eef4f6" },
  assetKey: "minnesota", // folder is "minnesota", not the club id
};

export const detroitForge: ClubDef = {
  id: "detroit-forge",
  name: "Detroit Forge",
  cityRegion: "Great Lakes",
  leaderArchetype: "The Foundry Builder",
  philosophy: "Infrastructure, discipline, and legacy building",
  ...SHARED_START,
  identityText:
    "Born in iron and grit, Detroit Forge builds more than teams - it builds legacies. Its rinks rise from the smoke of industry, its rivers run cold, and infrastructure is the foundation of its game.",
  foundingFlavor: "Dynasties are not discovered. They are forged.",
  tagline: "Dynasties are not discovered. They are forged.",
  accent: "#8b0e1a",
  palette: { primary: "#111315", secondary: "#8b0e1a", light: "#e9edf2" },
  assetKey: "detroit",
};

export const stockholmFrost: ClubDef = {
  id: "stockholm-frost",
  name: "Stockholm Frost",
  cityRegion: "Scandinavia",
  leaderArchetype: "The Elegant Architect",
  philosophy: "Elegant systems, composure, and relentless development",
  ...SHARED_START,
  identityText:
    "On the edge of ice and water, Stockholm Frost turns precision into intention. Built on elegant systems, architectural vision, and relentless development, the club designs victories with discipline and composure.",
  foundingFlavor: "Grace is a system.",
  tagline: "Grace is a system.",
  accent: "#ffc107",
  palette: { primary: "#080e10", secondary: "#ffc107", light: "#e6e8eb" },
  assetKey: "stockholm",
};

// Display order for the selection screen (Arizona first as the default).
export const CLUB_LIST: ClubDef[] = [
  arizonaMonsoon,
  halifaxPrivateers,
  helsinkiIceCrown,
  calgaryIronHerd,
  pragueLions,
  minnesotaNova,
  detroitForge,
  stockholmFrost,
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

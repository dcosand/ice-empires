// Club selection roster. Arizona Monsoon HC is the only playable club in this
// prototype; the others are display-only "Coming Soon" entries that communicate
// the broader 4X / civilization fantasy (different markets, leaders, fantasies).

export type RosterClub = {
  id: string;
  name: string;
  region: string;
  leader: string;
  fantasy: string;
  badge: string; // short emblem/glyph for the map-flavored badge
  playable: boolean;
};

export const CLUB_ROSTER: RosterClub[] = [
  {
    id: "arizona-monsoon",
    name: "Arizona Monsoon HC",
    region: "Sonoran Desert",
    leader: "The Desert Visionary",
    fantasy: "Grow hockey where it was never supposed to exist.",
    badge: "🌵",
    playable: true,
  },
  {
    id: "halifax-privateers",
    name: "Halifax Privateers",
    region: "Maritime Coast",
    leader: "The Salt-Ice Tactician",
    fantasy: "Toughness, board battles, and weather that does the coaching.",
    badge: "⚓",
    playable: false,
  },
  {
    id: "helsinki-ice-crown",
    name: "Helsinki Ice Crown",
    region: "Baltic North",
    leader: "The Goalie Whisperer",
    fantasy: "A nation of quiet, unbeatable netminders.",
    badge: "👑",
    playable: false,
  },
  {
    id: "saskatoon-iron-herd",
    name: "Saskatoon Iron Herd",
    region: "Prairie Belt",
    leader: "The Rink-Town Builder",
    fantasy: "Every town a rink, every rink a feeder system.",
    badge: "🐂",
    playable: false,
  },
  {
    id: "prague-lions",
    name: "Prague Lions",
    region: "Central Europe",
    leader: "The Skill Architect",
    fantasy: "Beautiful skating, patient systems, dangerous depth.",
    badge: "🦁",
    playable: false,
  },
  {
    id: "minneapolis-north",
    name: "Minneapolis North",
    region: "Upper Midwest",
    leader: "The State-of-Hockey Heir",
    fantasy: "Deep traditions and a pipeline that never freezes over.",
    badge: "❄",
    playable: false,
  },
];

import type {
  AttrKey,
  GoalieAttrs,
  PlayerPosition,
  PlayerStyle,
  SkaterAttrs,
} from "../types/game";

// The attribute model's content layer (docs/15 §3): display groups + labels,
// OVR position weights, and the Style→generation biases. One honest 1–100
// scale everywhere — elite ≈ 90–99, league-average ≈ 75, pond locals ≈ 20–45.

export const SKATER_ATTR_ORDER: (keyof SkaterAttrs)[] = [
  "shooting",
  "passing",
  "puckControl",
  "checking",
  "physicality",
  "speed",
  "agility",
  "hockeyIq",
  "faceoffs",
  "compete",
];

export const GOALIE_ATTR_ORDER: (keyof GoalieAttrs)[] = [
  "reflexes",
  "positioning",
  "gloveHands",
  "reboundControl",
  "athleticism",
  "composure",
];

export const ATTR_LABELS: Record<AttrKey, string> = {
  shooting: "Shooting",
  passing: "Passing",
  puckControl: "Puck Control",
  checking: "Checking",
  physicality: "Physicality",
  speed: "Speed",
  agility: "Agility",
  hockeyIq: "Hockey IQ",
  faceoffs: "Faceoffs",
  compete: "Compete",
  reflexes: "Reflexes",
  positioning: "Positioning",
  gloveHands: "Glove/Hands",
  reboundControl: "Rebound Control",
  athleticism: "Athleticism",
  composure: "Composure",
};

// Short column headers for dense tables (Scouting screen, roster compare).
export const ATTR_ABBR: Record<AttrKey, string> = {
  shooting: "SHO",
  passing: "PAS",
  puckControl: "PUC",
  checking: "CHK",
  physicality: "PHY",
  speed: "SPD",
  agility: "AGI",
  hockeyIq: "IQ",
  faceoffs: "FO",
  compete: "CMP",
  reflexes: "REF",
  positioning: "POS",
  gloveHands: "GLV",
  reboundControl: "REB",
  athleticism: "ATH",
  composure: "CPS",
};

// EA-style display groups for the skater card.
export const SKATER_GROUPS: { group: string; keys: (keyof SkaterAttrs)[] }[] = [
  { group: "Offense", keys: ["shooting", "passing", "puckControl"] },
  { group: "Defense", keys: ["checking", "physicality"] },
  { group: "Skating", keys: ["speed", "agility"] },
  { group: "Sense", keys: ["hockeyIq", "faceoffs"] },
  { group: "Mental", keys: ["compete"] },
];

// ---------------------------------------------------------------------------
// OVR weights (position/role-weighted roll-up, docs/15 §3)
// ---------------------------------------------------------------------------

export const SKATER_OVR_WEIGHTS: Record<
  "C" | "W" | "D",
  Record<keyof SkaterAttrs, number>
> = {
  C: {
    shooting: 1.1,
    passing: 1.3,
    puckControl: 1.2,
    checking: 0.9,
    physicality: 0.7,
    speed: 1.0,
    agility: 0.9,
    hockeyIq: 1.3,
    faceoffs: 0.8,
    compete: 0.8,
  },
  W: {
    shooting: 1.4,
    passing: 1.0,
    puckControl: 1.3,
    checking: 0.7,
    physicality: 0.8,
    speed: 1.2,
    agility: 1.0,
    hockeyIq: 1.0,
    faceoffs: 0.1,
    compete: 0.8,
  },
  D: {
    shooting: 0.6,
    passing: 1.0,
    puckControl: 0.8,
    checking: 1.5,
    physicality: 1.2,
    speed: 1.0,
    agility: 1.0,
    hockeyIq: 1.4,
    faceoffs: 0.1,
    compete: 0.9,
  },
};

export const GOALIE_OVR_WEIGHTS: Record<keyof GoalieAttrs, number> = {
  reflexes: 1.4,
  positioning: 1.3,
  gloveHands: 1.1,
  reboundControl: 1.0,
  athleticism: 1.0,
  composure: 0.9,
};

// ---------------------------------------------------------------------------
// Player Styles (docs/15 §3): assigned at generation, biasing distribution
// ---------------------------------------------------------------------------

export const STYLES_BY_POSITION: Record<PlayerPosition, PlayerStyle[]> = {
  C: ["Sniper", "Playmaker", "Two-Way", "Power Forward", "Grinder"],
  W: ["Sniper", "Playmaker", "Two-Way", "Power Forward", "Grinder"],
  D: ["Offensive D", "Two-Way D", "Defensive D", "Enforcer"],
  G: ["Butterfly", "Hybrid", "Standup"],
};

// Multiplicative bias per attribute at generation (unlisted keys = 1.0).
// Kept moderate: a style shapes a player, it doesn't cartoon him.
export const STYLE_BIAS: Record<PlayerStyle, Partial<Record<AttrKey, number>>> = {
  Sniper: { shooting: 1.25, puckControl: 1.1, checking: 0.85, physicality: 0.9 },
  Playmaker: { passing: 1.25, hockeyIq: 1.15, shooting: 0.9, physicality: 0.85 },
  "Two-Way": { checking: 1.12, hockeyIq: 1.1, compete: 1.1, shooting: 0.95 },
  "Power Forward": { physicality: 1.25, shooting: 1.1, checking: 1.05, agility: 0.85 },
  Grinder: { compete: 1.25, checking: 1.15, physicality: 1.1, shooting: 0.8, passing: 0.85 },
  "Offensive D": { passing: 1.2, puckControl: 1.15, shooting: 1.15, checking: 0.85, physicality: 0.9 },
  "Two-Way D": { checking: 1.1, hockeyIq: 1.12, passing: 1.05 },
  "Defensive D": { checking: 1.25, physicality: 1.12, hockeyIq: 1.1, shooting: 0.75, puckControl: 0.85 },
  Enforcer: { physicality: 1.3, checking: 1.08, compete: 1.1, speed: 0.85, passing: 0.8, shooting: 0.8 },
  Butterfly: { reflexes: 1.15, positioning: 1.12, athleticism: 1.05, gloveHands: 0.95 },
  Hybrid: { composure: 1.05 },
  Standup: { positioning: 1.2, composure: 1.12, gloveHands: 1.05, athleticism: 0.88, reflexes: 0.92 },
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  C: "Center",
  W: "Wing",
  D: "Defense",
  G: "Goalie",
};

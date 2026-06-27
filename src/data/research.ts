import type { ResearchDef } from "../types/game";

export const RESEARCH: ResearchDef[] = [
  {
    id: "basic-skating",
    name: "Basic Skating",
    description: "Standing up, then moving. Revolutionary.",
    cost: 10,
    requiredTechIds: [],
    unlocks: [],
    flavor: "Everyone agrees standing up is a competitive advantage.",
    eraId: "pond-hockey",
  },
  {
    id: "organized-practice",
    name: "Organized Practice",
    description: "Drills, schedules, and the radical idea of showing up.",
    cost: 14,
    requiredTechIds: [],
    unlocks: [{ type: "card", cardId: "local-coach" }],
    flavor: "The players discover that drills are not optional suggestions.",
    eraId: "pond-hockey",
  },
  {
    id: "scouting-reports",
    name: "Scouting Reports",
    description: "Turning rink rumors into something you can argue about.",
    cost: 12,
    requiredTechIds: [],
    unlocks: [{ type: "deeperDiscovery" }],
    flavor: "Rumors become reports. Reports become arguments.",
    eraId: "pond-hockey",
  },
  {
    id: "youth-development",
    name: "Youth Development",
    description: "Grow your own, before anyone else notices them.",
    cost: 16,
    requiredTechIds: [],
    unlocks: [{ type: "prospectGeneration" }],
    flavor: "The future arrives wearing skates two sizes too big.",
    eraId: "pond-hockey",
  },
  {
    id: "goaltending-theory",
    name: "Goaltending Theory",
    description: "A first, brave attempt to understand the position.",
    cost: 12,
    requiredTechIds: [],
    unlocks: [{ type: "goalieEvents" }],
    flavor: "Nobody understands goalies. This is your first attempt.",
    eraId: "pond-hockey",
  },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);

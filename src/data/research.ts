import type { ResearchDef } from "../types/game";

export const RESEARCH: ResearchDef[] = [
  {
    id: "basic-skating",
    name: "Basic Skating",
    description: "Standing up, then moving. Revolutionary.",
    cost: 4,
    requiredTechIds: [],
    unlocks: [],
    flavor: "Everyone agrees standing up is a competitive advantage.",
    eraId: "pond-hockey",
  },
  {
    id: "organized-practice",
    name: "Organized Practice",
    description: "Drills, schedules, and the radical idea of showing up.",
    cost: 6,
    requiredTechIds: [],
    unlocks: [{ type: "card", cardId: "local-coach" }],
    flavor: "The players discover that drills are not optional suggestions.",
    eraId: "pond-hockey",
  },
  {
    id: "scouting-reports",
    name: "Scouting Reports",
    description: "Turning rink rumors into something you can argue about.",
    cost: 5,
    requiredTechIds: [],
    unlocks: [{ type: "deeperDiscovery" }],
    flavor: "Rumors become reports. Reports become arguments.",
    eraId: "pond-hockey",
  },
  {
    id: "youth-development",
    name: "Youth Development",
    description: "Grow your own, before anyone else notices them.",
    cost: 8,
    requiredTechIds: [],
    unlocks: [{ type: "prospectGeneration" }],
    flavor: "The future arrives wearing skates two sizes too big.",
    eraId: "pond-hockey",
  },
  {
    id: "goaltending-theory",
    name: "Goaltending Theory",
    description: "A first, brave attempt to understand the position.",
    cost: 5,
    requiredTechIds: [],
    unlocks: [{ type: "goalieEvents" }],
    flavor: "Nobody understands goalies. This is your first attempt.",
    eraId: "pond-hockey",
  },

  // ---- Club Formation era: aspirational, gated behind Pond Hockey techs.
  // These open the formal front-office units that already reference them
  // (Recruiter, Regional Scout, Development Envoy) and give the research tier
  // view a real "next era" to grow toward.
  {
    id: "local-recruitment",
    name: "Local Recruitment",
    description: "Turn handshakes and rink gossip into actual commitments.",
    cost: 10,
    requiredTechIds: ["organized-practice"],
    unlocks: [],
    flavor: "A signature on a napkin still counts, technically.",
    eraId: "club-formation",
  },
  {
    id: "regional-scouting-office",
    name: "Regional Scouting Office",
    description: "A desk, a map, and a mandate to cover whole regions.",
    cost: 12,
    requiredTechIds: ["scouting-reports"],
    unlocks: [],
    flavor: "Now the rumors have a filing system.",
    eraId: "club-formation",
  },
  {
    id: "development-partnerships",
    name: "Development Partnerships",
    description: "Formal ties with hockey regions, before anyone says 'pipeline'.",
    cost: 12,
    requiredTechIds: ["youth-development"],
    unlocks: [],
    flavor: "Relationships, carefully not called transactions.",
    eraId: "club-formation",
  },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);

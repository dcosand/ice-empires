import type { UnitDef } from "../types/game";

// Organizational units the Club HQ can produce. These are front-office /
// exploration roster units, NOT movable map-combat units and NOT the world
// Scout granted at founding (that lives on the map in world.scout).
//
// Requirement model:
//   requiredTechIds     — ALL listed techs must be completed
//   requiredFacilityIds — ALL listed facilities must be built
//   requiredAnyOf       — ANY one listed tech-or-facility id satisfies it ("X OR Y")
// Units with requirements that reference not-yet-implemented techs (e.g.
// "local-recruitment") simply show as locked, which is intended — they create
// aspiration for later eras.
//
// Cost model: `cost.operations` is the production total funded by Operations
// income each month (like facilities). Any `cost.budget` / `cost.reputation`
// is a small upfront cost charged when production starts.

export const UNITS: UnitDef[] = [
  {
    id: "pond-scout",
    name: "Pond Scout",
    category: "exploration",
    eraId: "pond-hockey",
    description:
      "Your first set of eyes on the unknown — finds terrain, pond-hockey encounters, and rough rumors.",
    cost: { operations: 8 },
    buildMonths: 2,
    // No hard gate: early exploration should be available from the start.
    effects: [{ type: "improveDiscovery" }, { type: "improveEncounters" }],
    abilitySummary: "Improves your next discovery result (future assignment).",
    flavor:
      "Armed with bad directions and worse skates, the scout sets out to discover whether hockey exists elsewhere.",
  },
  {
    id: "rink-evangelist",
    name: "Rink Evangelist",
    category: "recruiting",
    eraId: "pond-hockey",
    description:
      "Spreads the idea of hockey so wanderers and local believers are likelier to join the club. Not a formal recruiter.",
    cost: { operations: 10, reputation: 2 },
    buildMonths: 2,
    // Local Notice Board OR Basic Skating — whichever the player reached first.
    requiredAnyOf: ["local-notice-board", "basic-skating"],
    effects: [{ type: "improveEncounters" }],
    abilitySummary:
      "Raises the chance random wanderers join your club (future assignment).",
    flavor:
      "Carries sticks, rules nobody understands, and the bold claim that standing on ice can become a civilization.",
  },
  {
    id: "basic-scout",
    name: "Basic Scout",
    category: "scouting",
    eraId: "pond-hockey",
    description:
      "Turns rink rumors into real reports, improving scouting outcomes and region information.",
    cost: { operations: 10 },
    buildMonths: 2,
    requiredTechIds: ["scouting-reports"],
    effects: [{ type: "improveDiscovery" }],
    abilitySummary: "Improves the quality of region reports (future assignment).",
    flavor: "Rumors become reports. Reports become arguments.",
  },
  {
    id: "local-coach",
    name: "Local Coach",
    category: "development",
    eraId: "pond-hockey",
    description:
      "Drills, whistles, and the radical notion of improvement. Boosts development and your hockey knowledge.",
    cost: { operations: 12, budget: 2 },
    buildMonths: 2,
    // Outdoor Rink OR Organized Practice.
    requiredAnyOf: ["outdoor-rink", "organized-practice"],
    // Wired this milestone: better development reads through as Hockey Knowledge.
    effects: [
      { type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 },
      { type: "teamAttribute", attribute: "skating", amount: 1 },
    ],
    abilitySummary:
      "+1 Hockey Knowledge / month, and will improve team attributes once those exist.",
    flavor: "He owns three whistles and uses all of them.",
  },
  {
    id: "recruiter",
    name: "Recruiter",
    category: "recruiting",
    eraId: "club-formation",
    description:
      "The formal recruitment unit — later establishes Recruitment Influence in regions.",
    cost: { operations: 14, budget: 4 },
    buildMonths: 2,
    // Gated behind a not-yet-implemented tech, so it reads as a locked goal.
    requiredTechIds: ["local-recruitment"],
    effects: [{ type: "improveEncounters" }],
    abilitySummary:
      "Establishes formal recruitment in regions (requires Local Recruitment).",
    flavor: "Turns rumors, handshakes, and rink gossip into commitments.",
  },
  {
    id: "regional-scout",
    name: "Regional Scout",
    category: "scouting",
    eraId: "scouting-network",
    description:
      "Knows every rink and every shortcut — extends scouting coverage across a whole region.",
    cost: { operations: 20, budget: 6 },
    buildMonths: 3,
    requiredTechIds: ["regional-scouting-office"],
    effects: [{ type: "improveDiscovery" }],
    abilitySummary: "Future unit: wide-area scouting coverage.",
    flavor: "Knows every rink, every shortcut, and three versions of the truth.",
  },
  {
    id: "development-envoy",
    name: "Development Envoy",
    category: "development",
    eraId: "scouting-network",
    description:
      "Builds relationships with hockey regions before anyone dares call them pipelines.",
    cost: { operations: 18, budget: 6 },
    buildMonths: 3,
    requiredTechIds: ["development-partnerships"],
    effects: [{ type: "teamAttribute", attribute: "chemistry", amount: 1 }],
    abilitySummary: "Future unit: builds development relationships with regions.",
    flavor: "Builds relationships before anyone calls them pipelines.",
  },
];

export const UNITS_BY_ID: Record<string, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u]),
);

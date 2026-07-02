import type { UnitDef } from "../types/game";

// Organizational units the Club HQ can produce. Most are front-office roster
// units; defs with `spawnsMapUnit` ALSO place a movable unit on the world map
// when production completes (scout or builder).
//
// Requirement model:
//   requiredTechIds     — ALL listed techs must be completed
//   requiredFacilityIds — ALL listed facilities must be built
//   requiredAnyOf       — ANY one listed id satisfies it ("X OR Y"). Accepts
//                         tech ids, facility ids, or the pseudo-id "club-rink"
//                         (>=1 rink within the club's HQ radius).
//
// Cost model: `cost.funds` is the production total funded by Funds income each
// month (like facilities).

export const UNITS: UnitDef[] = [
  {
    id: "pond-scout",
    name: "Pond Scout",
    category: "exploration",
    eraId: "pond-hockey",
    description:
      "Your first set of eyes on the unknown — finds terrain, pond-hockey encounters, and rough rumors.",
    cost: { funds: 8 },
    buildMonths: 2,
    // No hard gate: early exploration should be available from the start.
    effects: [{ type: "improveDiscovery" }, { type: "improveEncounters" }],
    spawnsMapUnit: "scout",
    abilitySummary: "Explores the map, revealing terrain, rivals, and independents.",
    flavor:
      "Armed with bad directions and worse skates, the scout sets out to discover whether hockey exists elsewhere.",
  },
  {
    id: "rink-rats",
    name: "Rink Rats",
    category: "construction",
    eraId: "pond-hockey",
    description:
      "A shovel-armed work crew that clears ponds, builds outdoor rinks, and cuts branches into playable sticks.",
    cost: { funds: 8 },
    buildMonths: 2,
    requiredTechIds: ["ice-surveying"],
    spawnsMapUnit: "builder",
    abilitySummary:
      "Map crew: clears frozen ponds, builds Level 1 rinks, harvests stickwood.",
    flavor:
      "They can't skate backwards yet, but they own four shovels and a dream.",
  },
  {
    id: "rink-evangelist",
    name: "Rink Evangelist",
    category: "recruiting",
    eraId: "pond-hockey",
    description:
      "Spreads the idea of hockey so wanderers and local believers are likelier to join the club. Not a formal recruiter.",
    cost: { funds: 10 },
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
    eraId: "club-formation",
    description:
      "Turns rink rumors into real reports, improving scouting outcomes and region information.",
    cost: { funds: 10 },
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
    cost: { funds: 14 },
    buildMonths: 2,
    // A club rink on the map OR Organized Practice.
    requiredAnyOf: ["club-rink", "organized-practice"],
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
    cost: { funds: 18 },
    buildMonths: 2,
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
    eraId: "hockey-operations",
    description:
      "Knows every rink and every shortcut — extends scouting coverage across a whole region.",
    cost: { funds: 26 },
    buildMonths: 3,
    requiredTechIds: ["regional-scouting"],
    effects: [{ type: "improveDiscovery" }],
    abilitySummary: "Future unit: wide-area scouting coverage.",
    flavor: "Knows every rink, every shortcut, and three versions of the truth.",
  },
  {
    id: "development-envoy",
    name: "Development Envoy",
    category: "development",
    eraId: "hockey-operations",
    description:
      "Builds relationships with hockey regions before anyone dares call them pipelines.",
    cost: { funds: 24 },
    buildMonths: 3,
    requiredTechIds: ["development-partnership"],
    effects: [{ type: "teamAttribute", attribute: "chemistry", amount: 1 }],
    abilitySummary: "Future unit: builds development relationships with regions.",
    flavor: "Builds relationships before anyone calls them pipelines.",
  },
];

export const UNITS_BY_ID: Record<string, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u]),
);

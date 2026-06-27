import type { FacilityDef } from "../types/game";

export const FACILITIES: FacilityDef[] = [
  {
    id: "outdoor-rink",
    name: "Outdoor Rink",
    description: "Your first sheet of real, club-owned ice.",
    cost: { operations: 9 },
    buildMonths: 3,
    effects: [{ type: "monthlyIncome", resource: "operations", amount: 2 }],
    unlocks: [{ type: "cardPool", poolId: "local-coach" }],
    flavor: "It is not much, but it is ice. And ice is enough.",
    eraId: "pond-hockey",
  },
  {
    id: "equipment-shed",
    name: "Equipment Shed",
    description: "Somewhere to keep the sticks, pucks, and broken dreams.",
    cost: { operations: 6 },
    buildMonths: 2,
    effects: [{ type: "unlockRecruitment" }],
    unlocks: [],
    flavor: "Half the sticks are too short. The dream is regulation size.",
    eraId: "pond-hockey",
  },
  {
    id: "clubhouse",
    name: "Clubhouse",
    description: "A roof, a kettle, and a place to belong.",
    cost: { operations: 9 },
    buildMonths: 3,
    effects: [{ type: "monthlyIncome", resource: "reputation", amount: 1 }],
    unlocks: [],
    flavor: "A place for arguments, line charts, and bad coffee.",
    eraId: "pond-hockey",
  },
  {
    id: "volunteer-coaching-bench",
    name: "Volunteer Coaching Bench",
    description: "Unpaid, overqualified, and weirdly passionate.",
    cost: { operations: 6 },
    buildMonths: 2,
    effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
    unlocks: [],
    flavor: "Your players have discovered cones.",
    eraId: "pond-hockey",
  },
  {
    id: "local-notice-board",
    name: "Local Notice Board",
    description: "Cork, thumbtacks, and the power of a good flyer.",
    cost: { operations: 3 },
    buildMonths: 1,
    effects: [{ type: "improveRecruitmentEvents" }],
    unlocks: [],
    flavor: "Tryouts Saturday. Bring skates. Or courage.",
    eraId: "pond-hockey",
  },
];

export const FACILITIES_BY_ID: Record<string, FacilityDef> = Object.fromEntries(
  FACILITIES.map((f) => [f.id, f]),
);

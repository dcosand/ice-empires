import type { EraDef, EraRequirement } from "../types/game";

// The five-act arc. Each era answers one core question (see docs/13_ERA_ARC.md).
export const PUND_HOCKEY_ERA_ID = "pond-hockey";
export const CLUB_FORMATION_ERA_ID = "club-formation";
export const COMPETITIVE_HOCKEY_ERA_ID = "competitive-hockey";
export const HOCKEY_OPERATIONS_ERA_ID = "hockey-operations";
export const DYNASTY_ERA_ID = "dynasty";

// Progression order. A club advances to the next era when the CURRENT era's
// requirement checklist is fully met (per-club milestones, Humankind-style —
// not a global clock). Rivals advance on their own seeded schedule.
export const ERA_ORDER: string[] = [
  PUND_HOCKEY_ERA_ID,
  CLUB_FORMATION_ERA_ID,
  COMPETITIVE_HOCKEY_ERA_ID,
  HOCKEY_OPERATIONS_ERA_ID,
  DYNASTY_ERA_ID,
];

export const ERAS: Record<string, EraDef> = {
  [PUND_HOCKEY_ERA_ID]: {
    id: PUND_HOCKEY_ERA_ID,
    name: "Pond Hockey Era",
    description: "Can we make hockey exist?",
  },
  [CLUB_FORMATION_ERA_ID]: {
    id: CLUB_FORMATION_ERA_ID,
    name: "Club Formation Era",
    description: "Can we become a real club?",
  },
  [COMPETITIVE_HOCKEY_ERA_ID]: {
    id: COMPETITIVE_HOCKEY_ERA_ID,
    name: "Competitive Hockey Era",
    description: "Can we beat other clubs?",
  },
  [HOCKEY_OPERATIONS_ERA_ID]: {
    id: HOCKEY_OPERATIONS_ERA_ID,
    name: "Hockey Operations Era",
    description: "Can we build the machine: scouting, recruiting, development, affiliates?",
  },
  [DYNASTY_ERA_ID]: {
    id: DYNASTY_ERA_ID,
    name: "Dynasty Era",
    description: "Can we sustain greatness?",
  },
};

// Requirements to EXIT each era (advance to the next). Later eras ship with
// empty lists = "not yet designed"; an empty list never advances.
export const ERA_REQUIREMENTS: Record<string, EraRequirement[]> = {
  [PUND_HOCKEY_ERA_ID]: [
    { id: "rival-contact", label: "Make first contact with a major club" },
    { id: "independent-contact", label: "Make first contact with an independent" },
    { id: "rink-built", label: "Build a Level 1 outdoor rink" },
    { id: "rules-of-the-game", label: "Research Rules of the Game" },
    {
      id: "full-roster",
      label: "Ice a full line: 6 geared players including a goalie",
    },
  ],
  [CLUB_FORMATION_ERA_ID]: [],
  [COMPETITIVE_HOCKEY_ERA_ID]: [],
  [HOCKEY_OPERATIONS_ERA_ID]: [],
  [DYNASTY_ERA_ID]: [],
};

// Log/banner copy when a club enters each era (name is prefixed at call site).
export const ERA_UNLOCK_MESSAGES: Record<string, string> = {
  [CLUB_FORMATION_ERA_ID]:
    "has entered the Club Formation Era. The club is no longer just a dream. It has ice, people, arguments, and a schedule.",
  [COMPETITIVE_HOCKEY_ERA_ID]:
    "has entered the Competitive Hockey Era. Other clubs are no longer rumors — they are opponents.",
  [HOCKEY_OPERATIONS_ERA_ID]:
    "has entered the Hockey Operations Era. Scouting, recruiting, development: the machine takes shape.",
  [DYNASTY_ERA_ID]:
    "has entered the Dynasty Era. Greatness is no longer the goal. Sustaining it is.",
};

import type { EraDef, EraRequirement } from "../types/game";

export const PUND_HOCKEY_ERA_ID = "pond-hockey";
export const CLUB_FORMATION_ERA_ID = "club-formation";

export const ERAS: Record<string, EraDef> = {
  [PUND_HOCKEY_ERA_ID]: {
    id: PUND_HOCKEY_ERA_ID,
    name: "Pond Hockey Era",
    description:
      "A club that exists mostly as an idea, some ice, and a lot of stubbornness.",
  },
  [CLUB_FORMATION_ERA_ID]: {
    id: CLUB_FORMATION_ERA_ID,
    name: "Club Formation Era",
    description:
      "The club is no longer just a dream. It has ice, people, arguments, and a schedule.",
  },
};

// Requirements to advance from Pond Hockey -> Club Formation.
export const CLUB_FORMATION_REQUIREMENTS: EraRequirement[] = [
  { id: "club-founded", label: "Club HQ founded" },
  { id: "outdoor-rink-complete", label: "Outdoor Rink completed" },
  { id: "research-complete", label: "At least 1 research completed" },
  { id: "two-regions-discovered", label: "At least 2 regions discovered" },
  { id: "first-card-acquired", label: "At least 1 staff/prospect/player acquired" },
];

export const CLUB_FORMATION_UNLOCK_MESSAGE =
  "Arizona Monsoon has entered the Club Formation Era. The club is no longer just a dream. It has ice, people, arguments, and a schedule.";

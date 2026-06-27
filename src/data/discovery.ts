import type { DiscoveryPriorityDef } from "../types/game";

// Early-game "Local Hockey Search". The club has no formal scouts yet, so these
// are grassroots, hands-on actions by the founding group.
export const DISCOVERY_PRIORITIES: DiscoveryPriorityDef[] = [
  {
    id: "find-local-players",
    name: "Find Local Players",
    description: "Hunt for raw local talent worth a look.",
    flavor: "Somebody's kid is always 'pretty good, actually.'",
  },
  {
    id: "ask-around-the-rinks",
    name: "Ask Around the Rinks",
    description: "Work the local rinks for tips, gossip, and goodwill.",
    flavor: "Buy the coffee, ask the questions, hear the rumors.",
  },
  {
    id: "search-for-playable-ice",
    name: "Search for Playable Ice",
    description: "Look for nearby ice and hockey regions to map.",
    flavor: "Any sheet of ice is a lead worth chasing.",
  },
  {
    id: "recruit-volunteers",
    name: "Recruit Volunteers",
    description: "Find helpers, organizers, and would-be staff.",
    flavor: "Hockey runs on people who say 'sure, I'll help.'",
  },
  {
    id: "host-an-open-skate",
    name: "Host an Open Skate",
    description: "Throw open the doors and see who shows up.",
    flavor: "Bring skates. Or courage. Both is better.",
  },
  {
    id: "follow-a-local-rumor",
    name: "Follow a Local Rumor",
    description: "Chase a strange story toward an unusual region.",
    flavor: "The weird leads are where a desert club has an edge.",
  },
];

export const DISCOVERY_BY_ID: Record<string, DiscoveryPriorityDef> =
  Object.fromEntries(DISCOVERY_PRIORITIES.map((d) => [d.id, d]));

export const DEFAULT_DISCOVERY_PRIORITY = "search-for-playable-ice" as const;

// Shown while formal scouting is still locked.
export const FORMAL_SCOUT_LOCK_HINT =
  "Formal scouts unlock after Scouting Reports and basic club infrastructure.";

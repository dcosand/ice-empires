import type { DiscoveryPriorityDef } from "../types/game";

export const DISCOVERY_PRIORITIES: DiscoveryPriorityDef[] = [
  {
    id: "survey-nearby-ice",
    name: "Survey Nearby Ice",
    description: "Reveal a hidden nearby region.",
    flavor: "Someone has to be the first to skate out and look.",
  },
  {
    id: "follow-prospect-rumor",
    name: "Follow Prospect Rumor",
    description: "Chance to reveal a prospect or a region clue.",
    flavor: "A name keeps coming up at the rink. You go find out why.",
  },
  {
    id: "listen-local-rinks",
    name: "Listen to Local Rinks",
    description: "Generate Reputation or a local staff/player event.",
    flavor: "Buy the coffee, ask the questions, hear the gossip.",
  },
  {
    id: "study-strange-culture",
    name: "Study Strange Hockey Culture",
    description: "Better chance to reveal an unusual region.",
    flavor: "The weird places are where your club has an edge.",
  },
  {
    id: "build-relationships",
    name: "Build Relationships",
    description: "Chance to reveal a partner region, staff, or diplomacy hint.",
    flavor: "Hockey is a small world. Be the person people call.",
  },
];

export const DISCOVERY_BY_ID: Record<string, DiscoveryPriorityDef> =
  Object.fromEntries(DISCOVERY_PRIORITIES.map((d) => [d.id, d]));

export const DEFAULT_DISCOVERY_PRIORITY = "survey-nearby-ice" as const;

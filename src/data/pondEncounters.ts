import type { PondEncounter } from "../types/game";

// PLACEHOLDER DATA — not wired into any system yet. See PondEncounter in
// types/game.ts. These are Civ-style "goodie huts": one-time early discoveries
// the Scout / Pond Scout can stumble onto in the Pond Hockey Era. They are
// deliberately distinct from the persistent, city-state-like Hockey Regions in
// /data/regions.ts.
//
// NEXT ITERATION: roll one of these when an exploration unit reveals new ground,
// weight outcomes by whether a Pond Scout / Rink Evangelist is owned, then apply
// possibleEffects (grant a card, nudge a resource, etc.) via a new
// encounterSystem.ts and log the result.

export const POND_ENCOUNTERS: PondEncounter[] = [
  {
    id: "frozen-lake-wanderer",
    name: "The Frozen-Lake Wanderer",
    kind: "wanderer",
    description:
      "A frozen-lake wanderer agrees to stand in net. Nobody is sure why.",
    possibleEffects: [
      { type: "addCard", cardId: "local-coach" },
      { type: "flavorOnly" },
    ],
  },
  {
    id: "garage-rink-kid",
    name: "Garage-Rink Kid",
    kind: "wanderer",
    description:
      "A garage-rink kid joins practice and immediately becomes your best skater.",
    possibleEffects: [{ type: "teamAttribute", attribute: "skating", amount: 2 }],
  },
  {
    id: "suspicious-equipment",
    name: "A Suspicious Bag of Gear",
    kind: "equipment",
    description:
      "The stranger brought three sticks, two usable skates, and one deeply suspicious puck.",
    possibleEffects: [
      { type: "addResource", resource: "operations", amount: 2 },
      { type: "setback", message: "The puck was, in fact, cursed." },
    ],
  },
  {
    id: "local-believer",
    name: "A Local Believer",
    kind: "local-believer",
    description:
      "Someone in town genuinely thinks this could work, and brings friends.",
    possibleEffects: [{ type: "addResource", resource: "reputation", amount: 1 }],
  },
  {
    id: "offsides-tough-guy",
    name: "The Tough Guy",
    kind: "mishap",
    description: "A local tough guy joins, then asks what offsides means.",
    possibleEffects: [{ type: "flavorOnly" }],
  },
];

export const POND_ENCOUNTERS_BY_ID: Record<string, PondEncounter> =
  Object.fromEntries(POND_ENCOUNTERS.map((e) => [e.id, e]));

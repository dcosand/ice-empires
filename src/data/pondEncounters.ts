import type { PondEncounter } from "../types/game";

// One-time early discoveries the Scout / Pond Scout can investigate in the Pond
// Hockey Era. These are the Civ-style "goodie huts": they are generated with
// the world, shown as small rink/barn markers, and disappear after investigation.
// They are deliberately distinct from persistent Independent Hockey Associations
// and from city-state-like Hockey Regions in /data/regions.ts.

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
  {
    id: "rink-map-rumor",
    name: "The Rink Map Rumor",
    kind: "rumor",
    description:
      "A smudged diner placemat claims there is playable ice three towns over.",
    possibleEffects: [{ type: "flavorOnly" }],
  },
];

export const POND_ENCOUNTERS_BY_ID: Record<string, PondEncounter> =
  Object.fromEntries(POND_ENCOUNTERS.map((e) => [e.id, e]));

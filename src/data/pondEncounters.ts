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
      {
        type: "setback",
        message: "Half the gear was junk and the rest cost you to haul off.",
        resource: "budget",
        amount: 2,
      },
    ],
  },
  {
    id: "abandoned-playbook",
    name: "An Abandoned Playbook",
    kind: "rumor",
    description:
      "Tucked in a warming hut: a weathered notebook of drills nobody around here recognizes.",
    possibleEffects: [
      { type: "grantTech", techId: "organized-practice" },
      { type: "addResource", resource: "hockeyKnowledge", amount: 2 },
    ],
  },
  {
    id: "frozen-creditor",
    name: "A Debt Comes Due",
    kind: "mishap",
    description:
      "A man on the ice insists your club already owes him for last winter's ice time.",
    possibleEffects: [
      {
        type: "setback",
        message: "You quietly settle up to make him go away.",
        resource: "budget",
        amount: 3,
      },
      { type: "flavorOnly" },
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

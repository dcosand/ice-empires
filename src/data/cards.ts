import type { CardDef } from "../types/game";

export const CARDS: CardDef[] = [
  {
    id: "local-coach",
    type: "staff",
    name: "Local Coach",
    role: "Coach",
    effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
    flavor: "He owns three whistles and uses all of them.",
  },
  {
    id: "volunteer-trainer",
    type: "staff",
    name: "Volunteer Trainer",
    role: "Trainer",
    effects: [{ type: "reduceInjuryEvents" }],
    flavor: "Not officially certified, but oddly effective.",
  },
  {
    id: "raw-desert-winger",
    type: "prospect",
    name: "Raw Desert Winger",
    position: "F",
    potential: "medium-high",
    risk: "high",
    effects: [{ type: "flavorOnly" }],
    flavor:
      "Skates like he learned in a parking lot. Hands like he learned in a dream.",
  },
  {
    id: "quiet-lake-goalie",
    type: "prospect",
    name: "Quiet Lake Goalie",
    position: "G",
    potential: "high",
    risk: "unknown",
    effects: [{ type: "flavorOnly" }],
    flavor: "Says almost nothing. Tracks pucks like a rumor.",
  },
  {
    id: "prairie-defenseman",
    type: "prospect",
    name: "Prairie Defenseman",
    position: "D",
    potential: "medium",
    risk: "low",
    effects: [{ type: "flavorOnly" }],
    flavor: "Not flashy. Not fun to play against.",
  },
];

export const CARDS_BY_ID: Record<string, CardDef> = Object.fromEntries(
  CARDS.map((c) => [c.id, c]),
);

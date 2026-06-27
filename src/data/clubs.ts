import type { ClubDef } from "../types/game";

export const arizonaMonsoon: ClubDef = {
  id: "arizona-monsoon",
  name: "Arizona Monsoon HC",
  cityRegion: "Arizona",
  leaderArchetype: "The Desert Visionary",
  philosophy: "Nontraditional hockey growth",
  startingBonusId: "nontraditional-market",
  startingResources: {
    budget: 8,
    operations: 8,
    hockeyKnowledge: 5,
    reputation: 9,
  },
  monthlyBaseIncome: {
    budget: 2,
    operations: 3,
    hockeyKnowledge: 1,
    reputation: 1,
  },
  identityText:
    "A storm is gathering in the desert. There is no arena, no league, no pipeline — just ice, stubbornness, and the belief that hockey can grow anywhere.",
  foundingFlavor:
    "Bonus — Nontraditional Market: discovering unusual hockey regions earns extra Reputation.",
};

export const CLUBS: Record<string, ClubDef> = {
  [arizonaMonsoon.id]: arizonaMonsoon,
};

export const DEFAULT_CLUB_ID = arizonaMonsoon.id;

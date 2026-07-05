import type { ResourceSet } from "../types/game";

export const EMPTY_RESOURCES: ResourceSet = {
  funds: 0,
  hockeyKnowledge: 0,
  reputation: 0,
};

export const RESOURCE_LABELS: Record<keyof ResourceSet, string> = {
  funds: "Funds",
  hockeyKnowledge: "Hockey Knowledge",
  reputation: "Reputation",
};

export function addResources(a: ResourceSet, b: Partial<ResourceSet>): ResourceSet {
  return {
    funds: a.funds + (b.funds ?? 0),
    hockeyKnowledge: a.hockeyKnowledge + (b.hockeyKnowledge ?? 0),
    reputation: a.reputation + (b.reputation ?? 0),
  };
}

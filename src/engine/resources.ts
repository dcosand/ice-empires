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

// Reputation is a standing stat, not a wallet — costs should never charge it
// (canAfford/subtract still handle it defensively for old data).
export function canAfford(have: ResourceSet, cost: Partial<ResourceSet>): boolean {
  return (
    have.funds >= (cost.funds ?? 0) &&
    have.hockeyKnowledge >= (cost.hockeyKnowledge ?? 0) &&
    have.reputation >= (cost.reputation ?? 0)
  );
}

export function subtractResources(
  a: ResourceSet,
  cost: Partial<ResourceSet>,
): ResourceSet {
  return {
    funds: a.funds - (cost.funds ?? 0),
    hockeyKnowledge: a.hockeyKnowledge - (cost.hockeyKnowledge ?? 0),
    reputation: a.reputation - (cost.reputation ?? 0),
  };
}

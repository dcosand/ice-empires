import type { ResourceSet } from "../types/game";

export const EMPTY_RESOURCES: ResourceSet = {
  budget: 0,
  operations: 0,
  hockeyKnowledge: 0,
  reputation: 0,
};

export const RESOURCE_LABELS: Record<keyof ResourceSet, string> = {
  budget: "Budget",
  operations: "Operations",
  hockeyKnowledge: "Hockey Knowledge",
  reputation: "Reputation",
};

export function addResources(a: ResourceSet, b: Partial<ResourceSet>): ResourceSet {
  return {
    budget: a.budget + (b.budget ?? 0),
    operations: a.operations + (b.operations ?? 0),
    hockeyKnowledge: a.hockeyKnowledge + (b.hockeyKnowledge ?? 0),
    reputation: a.reputation + (b.reputation ?? 0),
  };
}

export function canAfford(have: ResourceSet, cost: Partial<ResourceSet>): boolean {
  return (
    have.budget >= (cost.budget ?? 0) &&
    have.operations >= (cost.operations ?? 0) &&
    have.hockeyKnowledge >= (cost.hockeyKnowledge ?? 0) &&
    have.reputation >= (cost.reputation ?? 0)
  );
}

export function subtractResources(
  a: ResourceSet,
  cost: Partial<ResourceSet>,
): ResourceSet {
  return {
    budget: a.budget - (cost.budget ?? 0),
    operations: a.operations - (cost.operations ?? 0),
    hockeyKnowledge: a.hockeyKnowledge - (cost.hockeyKnowledge ?? 0),
    reputation: a.reputation - (cost.reputation ?? 0),
  };
}

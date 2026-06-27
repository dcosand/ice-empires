import type { GameState, ResourceKey } from "../types/game";
import { getMonthlyIncome } from "../engine/selectors";
import { RESOURCE_LABELS } from "../engine/resources";

const ORDER: ResourceKey[] = [
  "budget",
  "operations",
  "hockeyKnowledge",
  "reputation",
];

// Short caption + tooltip so each resource reads as a role, not just a number.
const RESOURCE_META: Record<ResourceKey, { caption: string; tip: string }> = {
  budget: {
    caption: "Money & sponsorship",
    tip: "The club's money. Earned monthly; spent on future costs.",
  },
  operations: {
    caption: "Production → builds",
    tip: "Production. Each month it flows into your active build project.",
  },
  hockeyKnowledge: {
    caption: "Research → techs",
    tip: "Hockey know-how. Each month it flows into your active research.",
  },
  reputation: {
    caption: "Standing in hockey",
    tip: "Your club's reputation. Grows by discovering regions and good deeds.",
  },
};

export function ResourceBar({ state }: { state: GameState }) {
  const income = getMonthlyIncome(state);
  return (
    <div className="resource-bar">
      {ORDER.map((key) => (
        <div className="resource" key={key} title={RESOURCE_META[key].tip}>
          <div className="label">{RESOURCE_LABELS[key]}</div>
          <div className="value">{state.resources[key]}</div>
          <div className="income">+{income[key]}/mo</div>
          <div className="resource-caption">{RESOURCE_META[key].caption}</div>
        </div>
      ))}
    </div>
  );
}

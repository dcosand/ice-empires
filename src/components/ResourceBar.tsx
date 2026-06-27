import type { GameState, ResourceKey } from "../types/game";
import { getMonthlyIncome } from "../engine/selectors";
import { RESOURCE_LABELS } from "../engine/resources";

const ORDER: ResourceKey[] = [
  "budget",
  "operations",
  "hockeyKnowledge",
  "reputation",
];

export function ResourceBar({ state }: { state: GameState }) {
  const income = getMonthlyIncome(state);
  return (
    <div className="resource-bar">
      {ORDER.map((key) => (
        <div className="resource" key={key}>
          <div className="label">{RESOURCE_LABELS[key]}</div>
          <div className="value">{state.resources[key]}</div>
          <div className="income">+{income[key]}/mo</div>
        </div>
      ))}
    </div>
  );
}

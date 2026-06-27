import type { Dispatch } from "react";
import type { GameAction, GameState, ResourceSet } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { getAvailableFacilities } from "../engine/selectors";
import { canAfford } from "../engine/resources";
import { ProgressBar } from "./ProgressBar";

export function BuildPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const available = getAvailableFacilities(state);
  const active = state.activeBuild;
  const activeDef = active ? FACILITIES_BY_ID[active.facilityId] : null;

  return (
    <div className="panel">
      <h3>Build</h3>
      <div className="panel-sub">One project at a time. Cost is paid upfront.</div>

      {active && activeDef && (
        <div className="active-banner">
          <div className="active-name">Building: {activeDef.name}</div>
          <ProgressBar
            fraction={active.progressMonths / activeDef.buildMonths}
            left={`${active.monthsRemaining} month${active.monthsRemaining === 1 ? "" : "s"} left`}
            right={`${active.progressMonths}/${activeDef.buildMonths}`}
          />
        </div>
      )}

      {available.map((f) => {
        const affordable = canAfford(state.resources, f.cost);
        const blocked = !!active || !affordable;
        return (
          <div className={`option${blocked ? " disabled" : ""}`} key={f.id}>
            <div className="option-head">
              <span className="option-name">{f.name}</span>
              <span className="cost">{costLabel(f.cost)} · {f.buildMonths}mo</span>
            </div>
            <div className="option-flavor">{f.flavor}</div>
            <button
              className="btn btn-block"
              disabled={blocked}
              onClick={() => dispatch({ type: "SELECT_BUILD", facilityId: f.id })}
            >
              {active ? "Build in progress" : affordable ? "Start building" : "Not enough Operations"}
            </button>
          </div>
        );
      })}
      {available.length === 0 && !active && (
        <div className="faint">Everything is built. The desert has a hockey club.</div>
      )}
    </div>
  );
}

function costLabel(cost: Partial<ResourceSet>): string {
  const parts: string[] = [];
  if (cost.operations) parts.push(`${cost.operations} Ops`);
  if (cost.budget) parts.push(`${cost.budget} Budget`);
  if (cost.hockeyKnowledge) parts.push(`${cost.hockeyKnowledge} HK`);
  if (cost.reputation) parts.push(`${cost.reputation} Rep`);
  return parts.join(" + ");
}

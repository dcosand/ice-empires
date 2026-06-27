import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { getAvailableFacilities, getMonthlyIncome } from "../engine/selectors";
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
  const opsPerMonth = getMonthlyIncome(state).operations;

  const monthsFor = (cost: number, fromProgress = 0) =>
    opsPerMonth > 0 ? Math.ceil((cost - fromProgress) / opsPerMonth) : Infinity;

  return (
    <div className="panel">
      <h3>Build</h3>
      <div className="panel-sub">
        Operations production (+{opsPerMonth}/mo) flows into your active build.
      </div>

      {active && activeDef && (
        <div className="active-banner">
          <div className="active-name">Building: {activeDef.name}</div>
          {(() => {
            const cost = activeDef.cost.operations ?? 0;
            const left = monthsFor(cost, active.progressOperations);
            return (
              <ProgressBar
                fraction={active.progressOperations / cost}
                left={`${active.progressOperations}/${cost} Operations`}
                right={
                  left === Infinity
                    ? "needs production"
                    : `~${left} mo left`
                }
              />
            );
          })()}
        </div>
      )}

      {available.map((f) => {
        const cost = f.cost.operations ?? 0;
        return (
          <div className={`option${active ? " disabled" : ""}`} key={f.id}>
            <div className="option-head">
              <span className="option-name">{f.name}</span>
              <span className="cost">
                {cost} Ops ·{" "}
                {opsPerMonth > 0 ? `~${monthsFor(cost)} mo` : "needs production"}
              </span>
            </div>
            <div className="option-flavor">{f.flavor}</div>
            <button
              className="btn btn-block"
              disabled={!!active}
              onClick={() => dispatch({ type: "SELECT_BUILD", facilityId: f.id })}
            >
              {active ? "Build in progress" : "Start building"}
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

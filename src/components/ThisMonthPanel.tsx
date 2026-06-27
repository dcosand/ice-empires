import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { DISCOVERY_BY_ID } from "../data/discovery";

// First-turn guidance. Strong emphasis on Month 1 (teaches the loop), lighter
// afterward. The End Month action is the final step of the checklist.
export function ThisMonthPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const firstMonth = state.month === 1;
  const buildChosen = !!state.activeBuild || state.facilities.length > 0;
  const researchChosen =
    !!state.activeResearch || state.completedResearch.length > 0;
  const focus = DISCOVERY_BY_ID[state.discovery.activePriorityId];

  const steps = [
    {
      key: "build",
      label: "Choose a build project",
      done: buildChosen,
      hint: firstMonth
        ? "Local Notice Board is cheapest (3 Operations) and finishes in 1 month."
        : undefined,
    },
    {
      key: "research",
      label: "Choose a research project",
      done: researchChosen,
      hint: firstMonth ? "Basic Skating is the quickest first tech." : undefined,
    },
    {
      key: "discovery",
      label: "Set your Local Hockey Search",
      done: true,
      hint: `Currently: ${focus?.name}.`,
    },
  ];

  const endLabel =
    state.month >= state.maxMonths
      ? `End Month ${state.month} →`
      : `End Month ${state.month}`;

  return (
    <div className={`panel this-month${firstMonth ? " emphasis" : ""}`}>
      <h3>{firstMonth ? "Your First Month" : "This Month"}</h3>
      <div className="panel-sub">
        {firstMonth
          ? "Make your opening decisions, then end the month."
          : "Adjust your plans, then end the month."}
      </div>

      {steps.map((s) => (
        <div className={`tm-step${s.done ? " done" : ""}`} key={s.key}>
          <span className="tm-box">{s.done ? "✓" : ""}</span>
          <div>
            <div className="tm-label">{s.label}</div>
            {s.hint && <div className="tm-hint">{s.hint}</div>}
          </div>
        </div>
      ))}

      <div className="tm-step end-step">
        <span className="tm-box arrow">▶</span>
        <div style={{ flex: 1 }}>
          <div className="tm-label">End the month</div>
          <button
            className="btn btn-gold btn-block"
            style={{ marginTop: 6 }}
            onClick={() => dispatch({ type: "END_MONTH" })}
          >
            {endLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

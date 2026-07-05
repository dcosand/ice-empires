import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import {
  getAvailableFacilities,
  getAvailableResearch,
} from "../engine/selectors";

// First-turn guidance + turn discipline. The month cannot end until a research
// project is active (an empty tech slot wastes HK income). Production is a
// SUGGESTION, not a gate: costs are paid upfront (D30), so ending the month
// without building — saving for something bigger — is a legitimate play.
export function ThisMonthPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const firstMonth = state.month === 1;

  const buildOptions = getAvailableFacilities(state).length;
  const researchOptions = getAvailableResearch(state).length;

  // "Ready" = an active project OR nothing left to choose.
  const buildReady = !!state.activeProduction || buildOptions === 0;
  const researchReady = !!state.activeResearch || researchOptions === 0;
  const canEndMonth = researchReady;

  const steps = [
    {
      key: "build",
      label: state.activeProduction
        ? "Build project selected"
        : buildOptions === 0
          ? "All builds complete"
          : "Choose a build project (optional)",
      done: buildReady,
      hint:
        !buildReady && firstMonth
          ? "Local Notice Board is cheapest (3 Funds) and finishes in 1 turn."
          : !buildReady
            ? "Costs are paid upfront — it's fine to save Funds and build later."
            : undefined,
    },
    {
      key: "research",
      label: state.activeResearch
        ? "Research project selected"
        : researchOptions === 0
          ? "All research complete"
          : "Choose a research project",
      done: researchReady,
      hint:
        !researchReady && firstMonth
          ? "Basic Skating is the quickest first tech."
          : !researchReady
            ? "Last tech finished — pick the next research."
            : undefined,
    },
  ];

  const missing: string[] = [];
  if (!researchReady) missing.push("a research project");

  const endLabel =
    state.month >= state.maxMonths
      ? "End Turn →"
      : "End Turn";

  return (
    <div className={`panel this-month${firstMonth ? " emphasis" : ""}`}>
      <h3>{firstMonth ? "Your First Turn" : "This Turn"}</h3>
      <div className="panel-sub">
        {firstMonth
          ? "Make your opening decisions, then end the turn."
          : "Adjust your plans, then end the turn."}
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
          <div className="tm-label">End the turn</div>
          <button
            className="btn btn-gold btn-block"
            style={{ marginTop: 6 }}
            disabled={!canEndMonth}
            onClick={() => dispatch({ type: "END_MONTH" })}
          >
            {endLabel}
          </button>
          {!canEndMonth && (
            <div className="tm-blocked">
              Choose {missing.join(" and ")} before ending the turn.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

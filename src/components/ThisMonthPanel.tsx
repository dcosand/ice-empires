import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { DISCOVERY_BY_ID } from "../data/discovery";
import {
  getAvailableFacilities,
  getAvailableResearch,
} from "../engine/selectors";

// First-turn guidance + turn discipline. The month cannot end until a build and
// a research project are active (a Local Hockey Search always has a default).
// If a project completed last month, its slot is empty again and must be re-set.
// If no options remain (not expected in year-one content), the slot is satisfied.
export function ThisMonthPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const firstMonth = state.month === 1;
  const focus = DISCOVERY_BY_ID[state.discovery.activePriorityId];

  const buildOptions = getAvailableFacilities(state).length;
  const researchOptions = getAvailableResearch(state).length;

  // "Ready" = an active project OR nothing left to choose.
  const buildReady = !!state.activeProduction || buildOptions === 0;
  const researchReady = !!state.activeResearch || researchOptions === 0;
  const discoveryReady = !!focus;
  const canEndMonth = buildReady && researchReady && discoveryReady;

  const steps = [
    {
      key: "build",
      label: state.activeProduction
        ? "Build project selected"
        : buildOptions === 0
          ? "All builds complete"
          : "Choose a build project",
      done: buildReady,
      hint:
        !buildReady && firstMonth
          ? "Local Notice Board is cheapest (3 Operations) and finishes in 1 month."
          : !buildReady
            ? "Last project finished — pick the next build."
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
    {
      key: "discovery",
      label: "Set your Local Hockey Search",
      done: discoveryReady,
      hint: `Currently: ${focus?.name}.`,
    },
  ];

  const missing: string[] = [];
  if (!buildReady) missing.push("a build project");
  if (!researchReady) missing.push("a research project");

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
            disabled={!canEndMonth}
            onClick={() => dispatch({ type: "END_MONTH" })}
          >
            {endLabel}
          </button>
          {!canEndMonth && (
            <div className="tm-blocked">
              Choose {missing.join(" and ")} before ending the month.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

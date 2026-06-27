import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { RESEARCH_BY_ID } from "../data/research";
import { getAvailableResearch, getMonthlyIncome } from "../engine/selectors";
import { ProgressBar } from "./ProgressBar";

export function ResearchPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const available = getAvailableResearch(state);
  const active = state.activeResearch;
  const activeDef = active ? RESEARCH_BY_ID[active.techId] : null;
  const hkPerMonth = getMonthlyIncome(state).hockeyKnowledge;

  return (
    <div className="panel">
      <h3>Research</h3>
      <div className="panel-sub">
        Funded by Hockey Knowledge (+{hkPerMonth}/mo applied to active research).
      </div>

      {active && activeDef && (
        <div className="active-banner">
          <div className="active-name">Researching: {activeDef.name}</div>
          <ProgressBar
            fraction={active.progressKnowledge / activeDef.cost}
            left={`${active.progressKnowledge}/${activeDef.cost} Hockey Knowledge`}
            right={
              hkPerMonth > 0
                ? `~${Math.ceil(active.knowledgeRemaining / hkPerMonth)} mo left`
                : "needs knowledge"
            }
          />
        </div>
      )}

      {available.map((r) => (
        <div className={`option${active ? " disabled" : ""}`} key={r.id}>
          <div className="option-head">
            <span className="option-name">{r.name}</span>
            <span className="cost">
              {r.cost} HK ·{" "}
              {hkPerMonth > 0 ? `~${Math.ceil(r.cost / hkPerMonth)} mo` : "needs HK"}
            </span>
          </div>
          <div className="option-flavor">{r.flavor}</div>
          <button
            className="btn btn-block"
            disabled={!!active}
            onClick={() => dispatch({ type: "SELECT_RESEARCH", techId: r.id })}
          >
            {active ? "Research in progress" : "Begin research"}
          </button>
        </div>
      ))}
      {available.length === 0 && !active && (
        <div className="faint">All early hockey knowledge has been mastered.</div>
      )}
    </div>
  );
}

import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { ERAS } from "../data/eras";

export function TopBar({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const era = ERAS[state.eraId];
  const monthLabel =
    state.month > state.maxMonths
      ? `Month ${state.month}`
      : `Month ${state.month} of ${state.maxMonths}`;

  return (
    <div className="topbar">
      <div>
        <div className="club-name">{state.club?.name}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          {state.club?.leaderArchetype}
        </div>
      </div>
      <div className="meta">
        <span className="pill">
          <strong>{monthLabel}</strong>
        </span>
        <span className="pill pill-era">{era?.name}</span>
        <button className="btn" onClick={() => dispatch({ type: "RESTART" })}>
          Restart
        </button>
      </div>
    </div>
  );
}

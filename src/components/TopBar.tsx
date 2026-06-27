import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";

export function TopBar({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const era = ERAS[state.eraId];
  const club = state.club;
  const monthLabel =
    state.month > state.maxMonths
      ? `Month ${state.month}`
      : `Month ${state.month} of ${state.maxMonths}`;

  return (
    <div className="topbar">
      <div className="topbar-club">
        {club && (
          <img
            className="topbar-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} logo`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div>
          <div className="club-name">{club?.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {club?.leaderArchetype}
          </div>
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

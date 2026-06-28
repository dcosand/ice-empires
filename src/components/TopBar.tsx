import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";

export function TopBar({
  state,
  dispatch,
  onOpenHQ,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenHQ?: () => void;
}) {
  const era = ERAS[state.eraId];
  const club = state.club;
  const monthLabel =
    state.month > state.maxMonths
      ? `Month ${state.month}`
      : `Month ${state.month} of ${state.maxMonths}`;

  const themeStyle = {
    "--club-primary": club?.palette.primary ?? "#0f1d2c",
    "--club-secondary": club?.palette.secondary ?? "#38bdf8",
    "--club-light": club?.palette.light ?? "#eef6fb",
  } as CSSProperties;

  return (
    <div className="topbar" style={themeStyle}>
      <button
        className="topbar-club"
        onClick={onOpenHQ}
        disabled={!onOpenHQ}
        title="Open Club HQ"
      >
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
        <div className="topbar-club-text">
          <div className="club-name">{club?.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {club?.leaderArchetype}
          </div>
        </div>
      </button>
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

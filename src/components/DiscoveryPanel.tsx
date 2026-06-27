import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import {
  DISCOVERY_PRIORITIES,
  DISCOVERY_BY_ID,
  FORMAL_SCOUT_LOCK_HINT,
} from "../data/discovery";

// Local Hockey Search — grassroots discovery before the club has formal scouts.
// Chip-style so it reads as a directional control, not a form.
export function DiscoveryPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const activeId = state.discovery.activePriorityId;
  const active = DISCOVERY_BY_ID[activeId];

  return (
    <div className="panel scouting-panel">
      <h3>Local Hockey Search →</h3>
      <div className="panel-sub">
        Grassroots legwork by the founding group. Resolves at End Month.
      </div>

      <div className="chip-row">
        {DISCOVERY_PRIORITIES.map((p) => (
          <button
            key={p.id}
            className={`chip${p.id === activeId ? " selected" : ""}`}
            onClick={() =>
              dispatch({ type: "SELECT_DISCOVERY_PRIORITY", priorityId: p.id })
            }
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="scouting-active">
        <strong>{active?.name}:</strong>{" "}
        <span className="muted">{active?.description}</span>
      </div>

      <div className="scout-lock">🔒 {FORMAL_SCOUT_LOCK_HINT}</div>
    </div>
  );
}

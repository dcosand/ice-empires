import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { DISCOVERY_PRIORITIES } from "../data/discovery";

export function DiscoveryPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const activeId = state.discovery.activePriorityId;

  return (
    <div className="panel">
      <h3>Discovery</h3>
      <div className="panel-sub">
        Choose where to point your attention. It resolves at End Month.
      </div>

      {DISCOVERY_PRIORITIES.map((p) => {
        const selected = p.id === activeId;
        return (
          <div
            className={`option${selected ? " selected" : ""}`}
            key={p.id}
            onClick={() =>
              dispatch({ type: "SELECT_DISCOVERY_PRIORITY", priorityId: p.id })
            }
            style={{ cursor: "pointer" }}
          >
            <div className="option-head">
              <span className="option-name">{p.name}</span>
              {selected && <span className="cost">● selected</span>}
            </div>
            <div className="option-flavor">{p.description}</div>
          </div>
        );
      })}
    </div>
  );
}

import type { GameState } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";

export function ClubHQPanel({ state }: { state: GameState }) {
  return (
    <div className="panel">
      <h3>Club HQ</h3>
      <div className="panel-sub">{state.club?.philosophy}</div>

      <p className="flavor" style={{ margin: "0 0 14px" }}>
        {state.club?.identityText}
      </p>

      <div className="muted" style={{ fontWeight: 700, marginBottom: 6 }}>
        Facilities
      </div>
      {state.facilities.length === 0 ? (
        <div className="faint">No facilities yet. The ice is bare.</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {state.facilities.map((id) => (
            <li key={id}>{FACILITIES_BY_ID[id]?.name ?? id}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

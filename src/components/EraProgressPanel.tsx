import type { GameState } from "../types/game";
import { getEraProgress } from "../engine/selectors";
import { ERAS } from "../data/eras";

export function EraProgressPanel({ state }: { state: GameState }) {
  const reqs = getEraProgress(state);
  const met = reqs.filter((r) => r.met).length;
  const nextEra = ERAS["club-formation"];

  return (
    <div className="panel">
      <h3>Era Progress</h3>
      <div className="panel-sub">
        Toward the {nextEra.name} — {met}/{reqs.length} complete
      </div>

      {reqs.map((r) => (
        <div className={`req${r.met ? " met" : ""}`} key={r.id}>
          <span className="box">{r.met ? "✓" : ""}</span>
          <span>{r.label}</span>
        </div>
      ))}

      {state.nextEraUnlocked && (
        <div className="muted" style={{ marginTop: 10, color: "var(--gold)" }}>
          Era reached. The club is real now.
        </div>
      )}
    </div>
  );
}

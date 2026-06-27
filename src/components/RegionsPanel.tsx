import type { GameState } from "../types/game";
import { REGIONS } from "../data/regions";

export function RegionsPanel({ state }: { state: GameState }) {
  const known = REGIONS.filter((r) => {
    const s = state.discovery.regionStates[r.id];
    return s && s !== "hidden";
  });
  const hiddenCount = REGIONS.length - known.length;

  return (
    <div className="panel">
      <h3>Hockey World</h3>
      <div className="panel-sub">
        {known.length} discovered · {hiddenCount} still hidden
      </div>

      {known.length === 0 && (
        <div className="faint">
          The map is rumor and fog. Scout to reveal regions.
        </div>
      )}

      {known.map((r) => {
        const stateValue = state.discovery.regionStates[r.id];
        const rumored = stateValue === "rumored";
        return (
          <div className={`region${rumored ? " hidden" : ""}`} key={r.id}>
            <div className="region-name">
              {rumored ? "❄ Rumor: " : ""}
              {r.name}
            </div>
            <div className="region-resource">{r.hockeyResource}</div>
            <div className="region-report">{r.scoutReport}</div>
            <div className="state-tag">
              {stateValue}
              {r.unusual ? " · unusual" : ""}
            </div>
          </div>
        );
      })}

      {hiddenCount > 0 && (
        <div className="faint" style={{ marginTop: 8 }}>
          + {hiddenCount} hidden region{hiddenCount === 1 ? "" : "s"} waiting to be
          found.
        </div>
      )}
    </div>
  );
}

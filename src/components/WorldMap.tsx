import { useState } from "react";
import type { GameState } from "../types/game";
import { REGIONS, REGIONS_BY_ID } from "../data/regions";
import { DISCOVERY_BY_ID } from "../data/discovery";

const HQ = { x: 29, y: 63 };

// Stylized 2D world. Not a real tile grid or pathfinding — region nodes are hand
// placed (region.map) and revealed by the discovery system over months.
export function WorldMap({ state }: { state: GameState }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const stateOf = (id: string) =>
    state.discovery.regionStates[id] ?? "hidden";

  const focus = DISCOVERY_BY_ID[state.discovery.activePriorityId];
  const hiddenRemain = REGIONS.some((r) => stateOf(r.id) === "hidden");

  const selected = selectedId ? REGIONS_BY_ID[selectedId] : null;
  const selectedState = selected ? stateOf(selected.id) : null;

  return (
    <div className="panel map-panel">
      <div className="map-header">
        <div>
          <h3 style={{ margin: 0 }}>Mythic Hockey World</h3>
          <div className="panel-sub" style={{ margin: 0 }}>
            Your club's place in an unmapped hockey universe.
          </div>
        </div>
        <div className="map-focus-flag">
          <span className="compass">🧭</span>
          <div>
            <div className="map-focus-label">Local Hockey Search</div>
            <div className="map-focus-name">{focus?.name}</div>
          </div>
        </div>
      </div>

      <div className="worldmap">
        {/* scouting route lines from HQ to known regions */}
        <svg className="map-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          {REGIONS.filter((r) => stateOf(r.id) !== "hidden").map((r) => (
            <line
              key={r.id}
              x1={HQ.x}
              y1={HQ.y}
              x2={r.map.x}
              y2={r.map.y}
              className={`route ${stateOf(r.id)}`}
            />
          ))}
        </svg>

        {/* Home club HQ */}
        <button
          className="map-node hq"
          style={{ left: `${HQ.x}%`, top: `${HQ.y}%` }}
          onClick={() => setSelectedId(null)}
          title={state.club?.name}
        >
          <span className="node-glyph">🏒</span>
          <span className="node-label hq-label">{state.club?.name}</span>
        </button>

        {/* Region nodes */}
        {REGIONS.map((r) => {
          const ds = stateOf(r.id);
          const hidden = ds === "hidden";
          const rumored = ds === "rumored";
          return (
            <button
              key={r.id}
              className={`map-node region ${ds}${
                selectedId === r.id ? " active" : ""
              }${hidden && hiddenRemain ? " scanning" : ""}`}
              style={{ left: `${r.map.x}%`, top: `${r.map.y}%` }}
              onClick={() => setSelectedId(r.id)}
              title={hidden ? "Unknown territory" : r.name}
            >
              <span className="node-glyph">
                {hidden ? "?" : rumored ? "❄" : r.unusual ? "✦" : "📍"}
              </span>
              <span className="node-label">
                {hidden ? "Fog" : rumored ? `Rumor: ${r.name}` : r.name}
              </span>
            </button>
          );
        })}

        {hiddenRemain && (
          <div className="map-fog-hint">
            Fog of war — your Local Hockey Search reveals new regions at End Month.
          </div>
        )}
      </div>

      {/* Region detail */}
      <div className="map-detail">
        {!selected && (
          <div className="faint">
            Select a region marker to inspect it. Foggy markers are unknown until
            you scout them.
          </div>
        )}
        {selected && selectedState === "hidden" && (
          <div>
            <strong>Unknown territory</strong>
            <div className="muted">
              Point your Local Hockey Search at the fog and End Month to reveal
              what lies here.
            </div>
          </div>
        )}
        {selected && selectedState !== "hidden" && (
          <div>
            <div className="detail-head">
              <strong>
                {selectedState === "rumored" ? "Rumor: " : ""}
                {selected.name}
              </strong>
              <span className="region-resource">{selected.hockeyResource}</span>
            </div>
            <div className="region-report">{selected.scoutReport}</div>
            <div className="state-tag">
              {selectedState}
              {selected.unusual ? " · unusual market" : ""} · {selected.terrain}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

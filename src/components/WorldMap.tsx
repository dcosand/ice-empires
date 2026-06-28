import { useState } from "react";
import type { Dispatch } from "react";
import type { GameAction, GameState, DiscoveryStateValue } from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import { DISCOVERY_BY_ID } from "../data/discovery";
import {
  moveableTilesFor,
  regionIdAtTile,
  tileAt,
  tileKey,
} from "../engine/world";
import { canRecruitScout, surveyableRegionId } from "../engine/scoutSystem";
import {
  canEstablishConnection,
  CONNECTION_MONTHS,
} from "../engine/regionDevelopment";

const TERRAIN_GLYPH: Record<string, string> = {
  desert: "🏜",
  ice: "🧊",
  plains: "🌾",
  water: "🌊",
};

const REGION_GLYPH: Record<DiscoveryStateValue, string> = {
  hidden: "",
  rumored: "❄",
  discovered: "📍",
  surveyed: "🔎",
  influenced: "🚩",
};

export function WorldMap({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const world = state.world;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (!world) return null;

  const focus = DISCOVERY_BY_ID[state.discovery.activePriorityId];
  const scout = world.scout;
  const moveable = world.scoutSelected
    ? moveableTilesFor(world, scout)
    : new Set<string>();
  const regionStateOf = (id: string): DiscoveryStateValue =>
    state.discovery.regionStates[id] ?? "hidden";
  const isContested = (id: string) => state.discovery.contested.includes(id);

  const selected = selectedKey
    ? (() => {
        const [sx, sy] = selectedKey.split(",").map(Number);
        return { x: sx, y: sy };
      })()
    : null;
  const selectedRegionId = selected
    ? regionIdAtTile(selected.x, selected.y)
    : null;

  function onTile(x: number, y: number) {
    const key = tileKey(x, y);
    if (scout && world!.scoutSelected && moveable.has(key)) {
      dispatch({ type: "MOVE_SCOUT", x, y });
      return;
    }
    if (scout && scout.x === x && scout.y === y) {
      dispatch({ type: "SELECT_SCOUT" });
    }
    setSelectedKey(key);
  }

  return (
    <div className="panel map-panel">
      <div className="map-header">
        <div>
          <h3 style={{ margin: 0 }}>Hockey World</h3>
          <div className="panel-sub" style={{ margin: 0 }}>
            One persistent map — your HQ, fog, and discoveries all live here.
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

      <div
        className="fm-grid worldmap-grid"
        style={{ gridTemplateColumns: `repeat(${world.width}, var(--tile))` }}
      >
        {Array.from({ length: world.height }).map((_, y) =>
          Array.from({ length: world.width }).map((__, x) => {
            const key = tileKey(x, y);
            const revealed = world.revealed.includes(key);
            const tile = tileAt(world, x, y);
            const isHQ = !!world.hqTile && world.hqTile.x === x && world.hqTile.y === y;
            const isScout = !!scout && scout.x === x && scout.y === y;
            const regionId = regionIdAtTile(x, y);
            const rState = regionId ? regionStateOf(regionId) : "hidden";
            const showRegion = regionId && revealed && rState !== "hidden";

            const classes = ["fm-tile"];
            if (!revealed) classes.push("fog");
            else classes.push(`terrain-${tile?.terrain}`);
            if (moveable.has(key)) classes.push("moveable");
            if (selectedKey === key) classes.push("selected");
            if (isScout && world.scoutSelected) classes.push("scout-selected");

            return (
              <button
                key={key}
                className={classes.join(" ")}
                onClick={() => onTile(x, y)}
                title={revealed ? tile?.terrain : "Unexplored"}
              >
                {!revealed && <span className="fm-fog-glyph">·</span>}
                {revealed && !isHQ && !isScout && (
                  <span className="fm-terrain-glyph">
                    {TERRAIN_GLYPH[tile?.terrain ?? "plains"]}
                  </span>
                )}
                {showRegion && (
                  <span className="tile-region">{REGION_GLYPH[rState]}</span>
                )}
                {showRegion && regionId && isContested(regionId) && (
                  <span className="tile-contested" title="Contested">
                    ⚔
                  </span>
                )}
                {isHQ && <span className="tile-hq">🏒</span>}
                {isScout && <span className="tile-scout">🔍</span>}
              </button>
            );
          }),
        )}
      </div>

      <ScoutBar state={state} dispatch={dispatch} />

      <TileDetail
        state={state}
        dispatch={dispatch}
        regionId={selectedRegionId}
        selected={selected}
      />
    </div>
  );
}

function ScoutBar({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const scout = state.world?.scout;
  if (scout) {
    return (
      <div className="scout-bar">
        <span>
          🔍 <strong>Scout</strong> · {scout.movesRemaining}/{scout.movesPerTurn}{" "}
          moves
        </span>
        <button
          className={`btn${state.world?.scoutSelected ? " btn-primary" : ""}`}
          onClick={() => dispatch({ type: "SELECT_SCOUT" })}
        >
          {state.world?.scoutSelected ? "Selected — click a tile" : "Select Scout"}
        </button>
      </div>
    );
  }
  if (canRecruitScout(state)) {
    return (
      <div className="scout-bar">
        <span>Scouting Reports done — a formal Scout is available.</span>
        <button
          className="btn btn-gold"
          onClick={() => dispatch({ type: "RECRUIT_SCOUT" })}
        >
          Recruit Scout
        </button>
      </div>
    );
  }
  return (
    <div className="scout-bar locked">
      🔒 Scout unlocks after Scouting Reports research and a built facility.
    </div>
  );
}

function TileDetail({
  state,
  dispatch,
  regionId,
  selected,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  regionId: string | null;
  selected: { x: number; y: number } | null;
}) {
  if (!selected) {
    return (
      <div className="map-detail faint">
        Click a tile to inspect it. Discover regions via Local Hockey Search,
        then send your Scout to survey them.
      </div>
    );
  }

  const region = regionId ? REGIONS_BY_ID[regionId] : null;
  const rState = regionId
    ? state.discovery.regionStates[regionId] ?? "hidden"
    : null;
  const revealed = state.world?.revealed.includes(
    `${selected.x},${selected.y}`,
  );

  if (!region || !revealed || rState === "hidden") {
    return (
      <div className="map-detail">
        {revealed ? (
          <span className="muted">
            Open terrain. Nothing of hockey interest here yet.
          </span>
        ) : (
          <span className="faint">Unexplored — shrouded in fog.</span>
        )}
      </div>
    );
  }

  const contested = state.discovery.contested.includes(region.id);
  const canSurvey = surveyableRegionId(state) === region.id;
  const canConnect = canEstablishConnection(state, region.id);
  const connecting = state.discovery.connection?.regionId === region.id;

  return (
    <div className="map-detail">
      <div className="detail-head">
        <strong>{region.name}</strong>
        <span className="region-resource">{region.hockeyResource}</span>
      </div>
      <div className="region-report">{region.scoutReport}</div>
      <div className="state-tag">
        {rState}
        {region.unusual ? " · unusual market" : ""}
        {contested ? " · ⚔ contested" : ""}
      </div>

      <div className="detail-actions">
        {canSurvey && (
          <button
            className="btn btn-primary btn-block"
            onClick={() => dispatch({ type: "SURVEY_REGION", regionId: region.id })}
          >
            Survey Region (Scout is here)
          </button>
        )}
        {rState === "discovered" && !canSurvey && (
          <div className="faint">
            Move your Scout onto this tile to survey it.
          </div>
        )}
        {canConnect && (
          <button
            className="btn btn-gold btn-block"
            onClick={() =>
              dispatch({ type: "ESTABLISH_CONNECTION", regionId: region.id })
            }
          >
            Establish Local Connection ({CONNECTION_MONTHS} mo)
          </button>
        )}
        {connecting && (
          <div className="muted">
            Building local ties — {state.discovery.connection?.monthsRemaining}{" "}
            month(s) to go.
          </div>
        )}
        {rState === "surveyed" &&
          !canConnect &&
          !connecting &&
          state.discovery.connection && (
            <div className="faint">
              Finish your current Local Connection first.
            </div>
          )}
        {rState === "influenced" && (
          <div className="influenced-note">
            🚩 Influenced — part of your hockey empire (+1 Reputation/month).
          </div>
        )}
      </div>
    </div>
  );
}

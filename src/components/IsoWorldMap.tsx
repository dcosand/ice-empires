import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Application, Container, Graphics } from "pixi.js";
import type {
  GameAction,
  GameState,
  DiscoveryStateValue,
  WorldState,
} from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import {
  moveableTilesFor,
  regionIdAtTile,
  tileAt,
  tileKey,
} from "../engine/world";
import { surveyableRegionId } from "../engine/scoutSystem";
import {
  canEstablishConnection,
  CONNECTION_MONTHS,
} from "../engine/regionDevelopment";

// ---- Isometric geometry --------------------------------------------------
const TILE_W = 64; // diamond width
const TILE_H = 32; // diamond height (2:1 iso)
const LIFT = 13; // extruded "thickness" of land tiles (SimCity-2000 chunk)

const isoX = (gx: number, gy: number) => (gx - gy) * (TILE_W / 2);
const isoY = (gx: number, gy: number) => (gx + gy) * (TILE_H / 2);

// Terrain palette (hockey-world flavored: green plains, tan desert, pale ice).
const TERRAIN: Record<string, { top: number; side: number }> = {
  plains: { top: 0x6f9350, side: 0x52703b },
  desert: { top: 0xd8b673, side: 0xb2904c },
  ice: { top: 0xcfe8f5, side: 0xa3cadd },
  water: { top: 0x2f6f9e, side: 0x244f6f },
};
const FOG = { top: 0x111c28, side: 0x0a1119 };

const PIN_COLOR: Record<DiscoveryStateValue, number> = {
  hidden: 0x000000,
  rumored: 0x8aa0b4,
  discovered: 0xf2c14e,
  surveyed: 0x38bdf8,
  influenced: 0x5fd08a,
};

function accentNumber(hex: string | undefined): number {
  if (!hex) return 0xf2c14e;
  const n = parseInt(hex.replace("#", ""), 16);
  return Number.isNaN(n) ? 0xf2c14e : n;
}

const diamond = (h = TILE_H): number[] => [0, -h / 2, TILE_W / 2, 0, 0, h / 2, -TILE_W / 2, 0];

// Centroid offset so the map draws centered around the world container origin.
function centroid(w: WorldState) {
  return { x: isoX((w.width - 1) / 2, (w.height - 1) / 2), y: isoY((w.width - 1) / 2, (w.height - 1) / 2) };
}

// ---- Scene drawing -------------------------------------------------------
function drawScene(layer: Container, state: GameState, selectedKey: string | null) {
  layer.removeChildren().forEach((c) => c.destroy());
  const world = state.world;
  if (!world) return;
  const c = centroid(world);
  const accent = accentNumber(state.club?.accent);
  const scout = world.scout;
  const moveable = world.scoutSelected ? moveableTilesFor(world, scout) : new Set<string>();

  for (let gy = 0; gy < world.height; gy++) {
    for (let gx = 0; gx < world.width; gx++) {
      const key = tileKey(gx, gy);
      const tile = tileAt(world, gx, gy)!;
      const revealed = world.revealed.includes(key);
      const pal = revealed ? TERRAIN[tile.terrain] ?? TERRAIN.plains : FOG;
      const lift = tile.terrain === "water" ? 4 : LIFT;

      const g = new Graphics();
      g.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
      g.zIndex = gx + gy;

      // extruded side faces
      g.poly([-TILE_W / 2, 0, 0, TILE_H / 2, 0, TILE_H / 2 + lift, -TILE_W / 2, lift]).fill(pal.side);
      g.poly([TILE_W / 2, 0, 0, TILE_H / 2, 0, TILE_H / 2 + lift, TILE_W / 2, lift]).fill(
        darken(pal.side),
      );
      // top face
      g.poly(diamond()).fill(pal.top).stroke({ width: 1, color: 0x0a1018, alpha: 0.3 });

      if (moveable.has(key)) {
        g.poly(diamond()).fill({ color: 0x38bdf8, alpha: 0.32 });
      }
      if (selectedKey === key) {
        g.poly(diamond()).stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 });
      }
      layer.addChild(g);

      // ---- markers on top of the tile ----
      const regionId = regionIdAtTile(gx, gy);
      const rState = regionId ? state.discovery.regionStates[regionId] ?? "hidden" : "hidden";
      if (revealed && regionId && rState !== "hidden") {
        const pin = new Graphics();
        pin.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
        pin.zIndex = gx + gy + 0.4;
        const col = PIN_COLOR[rState];
        pin.poly([-4, -14, 4, -14, 0, -5]).fill(col);
        pin.circle(0, -20, 7).fill(col).stroke({ width: 2, color: 0x05121c });
        pin.circle(0, -20, 2.5).fill(0xffffff);
        if (state.discovery.contested.includes(regionId)) {
          pin.circle(0, -20, 11).stroke({ width: 2, color: 0xef6f6f });
        }
        layer.addChild(pin);
      }

      const isHQ = world.hqTile && world.hqTile.x === gx && world.hqTile.y === gy;
      if (isHQ) layer.addChild(hqMarker(gx, gy, c, accent));

      if (scout && scout.x === gx && scout.y === gy) {
        layer.addChild(scoutMarker(gx, gy, c, world.scoutSelected, accent));
      }
    }
  }
}

function hqMarker(gx: number, gy: number, c: { x: number; y: number }, accent: number) {
  const m = new Graphics();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 0.5;
  // plinth + building + roof in club accent
  m.poly([-18, 2, 0, 11, 18, 2, 0, -7]).fill(0x05121c); // shadow base
  m.rect(-14, -24, 28, 26).fill(accent).stroke({ width: 2, color: 0x1a1304 });
  m.poly([-16, -24, 0, -36, 16, -24]).fill(darken(accent)).stroke({ width: 2, color: 0x1a1304 });
  m.rect(-5, -14, 10, 16).fill(0x1a1304); // door
  // flag
  m.rect(14, -44, 2, 20).fill(0xffffff);
  m.poly([16, -44, 30, -39, 16, -34]).fill(accent);
  return m;
}

// The Scout: a hockey exec in his 30s in a team-colored polo, holding a
// clipboard. Drawn billboard-style (facing camera) as vector art so it stays
// crisp at any zoom. `accent` is the club color, so the polo matches the team.
const SKIN = 0xe7b48b;
const SKIN_SHADE = 0xc8946a;
const HAIR = 0x4a3526;
const PANTS = 0x33404f;
const SHOE = 0x14181f;

function scoutMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  selected: boolean | undefined,
  accent: number,
) {
  const s = new Graphics();
  s.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  s.zIndex = gx + gy + 0.6;

  const polo = accent;
  const poloShade = darken(accent);
  const collar = lighten(accent, 0.45);

  // selected ground ring + contact shadow
  if (selected) {
    s.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  s.ellipse(0, 1, 11, 4).fill({ color: 0x000000, alpha: 0.35 });

  // legs + shoes
  s.roundRect(-5, -13, 4, 11, 1.5).fill(PANTS);
  s.roundRect(1, -13, 4, 11, 1.5).fill(PANTS);
  s.roundRect(-6.5, -3, 6, 3, 1).fill(SHOE);
  s.roundRect(0.5, -3, 6, 3, 1).fill(SHOE);

  // polo torso + short sleeves
  s.roundRect(-8, -27, 16, 15, 4).fill(polo);
  s.roundRect(2.5, -26, 5, 13, 3).fill({ color: poloShade, alpha: 0.55 }); // shading
  s.roundRect(-11.5, -26.5, 5.5, 7, 2.5).fill(polo); // left sleeve
  s.roundRect(6, -26.5, 5.5, 7, 2.5).fill(polo); // right sleeve

  // forearms angle in to hold the clipboard
  s.poly([-9.5, -20, -6, -20, -4.5, -9.5, -8, -9.5]).fill(SKIN);
  s.poly([9.5, -20, 6, -20, 4.5, -9.5, 8, -9.5]).fill(SKIN);

  // clipboard held at the chest
  s.roundRect(-5, -19, 10, 11, 1.5).fill(0xeae4d2).stroke({ width: 1.2, color: 0x4a4636 });
  s.roundRect(-1.6, -20, 3.2, 2, 0.6).fill(0x9aa0a6); // clip
  s.rect(-3, -16, 6, 1).fill(0xb6bac0);
  s.rect(-3, -14, 6, 1).fill(0xb6bac0);
  s.rect(-3, -12, 4.5, 1).fill(0xb6bac0);
  s.circle(-5.5, -9, 2.1).fill(SKIN); // hands
  s.circle(5.5, -9, 2.1).fill(SKIN);

  // collar + placket
  s.poly([-4, -27, -1, -27, -1, -22.5]).fill(collar);
  s.poly([4, -27, 1, -27, 1, -22.5]).fill(collar);
  s.roundRect(-1.1, -27, 2.2, 8, 1).fill(poloShade);

  // neck + head + hair
  s.roundRect(-2, -31, 4, 4, 1).fill(SKIN_SHADE);
  s.circle(0, -34.2, 5.8).fill(HAIR); // hair back
  s.circle(-5, -33, 1.3).fill(SKIN); // ears
  s.circle(5, -33, 1.3).fill(SKIN);
  s.circle(0, -33.2, 5.2).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE }); // face
  s.circle(-2, -33.6, 0.85).fill(0x2a2320); // eyes
  s.circle(2, -33.6, 0.85).fill(0x2a2320);
  return s;
}

function lighten(color: number, amt = 0.4): number {
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt);
  return (mix((color >> 16) & 0xff) << 16) | (mix((color >> 8) & 0xff) << 8) | mix(color & 0xff);
}

function darken(color: number): number {
  const r = ((color >> 16) & 0xff) * 0.8;
  const g = ((color >> 8) & 0xff) * 0.8;
  const b = (color & 0xff) * 0.8;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ---- Component -----------------------------------------------------------
export function IsoWorldMap({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRef = useRef<Container | null>(null);
  const readyRef = useRef(false);
  const clickRef = useRef<(gx: number, gy: number) => void>(() => {});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Always-fresh click handler (captures latest state/selection).
  clickRef.current = (gx: number, gy: number) => {
    const w = state.world;
    if (!w) return;
    if (!tileAt(w, gx, gy)) return;
    const key = tileKey(gx, gy);
    const scout = w.scout;
    const moveable = w.scoutSelected ? moveableTilesFor(w, scout) : new Set<string>();
    if (scout && w.scoutSelected && moveable.has(key)) {
      dispatch({ type: "MOVE_SCOUT", x: gx, y: gy });
      return;
    }
    if (scout && scout.x === gx && scout.y === gy) {
      dispatch({ type: "SELECT_SCOUT" });
    }
    setSelectedKey(key);
  };

  // Mount Pixi once.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let canvasEl: HTMLCanvasElement | null = null;
    const app = new Application();

    app
      .init({
        resizeTo: host,
        background: 0x0a1018,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      })
      .then(() => {
        if (cancelled) {
          app.destroy();
          return;
        }
        canvasEl = app.canvas;
        host.appendChild(canvasEl);

        const layer = new Container();
        layer.sortableChildren = true;
        app.stage.addChild(layer);
        layer.position.set(app.screen.width / 2, app.screen.height / 2 - 60);
        layerRef.current = layer;
        appRef.current = app;
        readyRef.current = true;

        // Pan + click handling on the stage.
        app.stage.eventMode = "static";
        app.stage.hitArea = app.screen;
        let down = false;
        let moved = false;
        const start = { x: 0, y: 0 };
        const last = { x: 0, y: 0 };
        app.stage.on("pointerdown", (e) => {
          down = true;
          moved = false;
          start.x = last.x = e.global.x;
          start.y = last.y = e.global.y;
        });
        app.stage.on("pointermove", (e) => {
          if (!down) return;
          if (Math.abs(e.global.x - start.x) + Math.abs(e.global.y - start.y) > 5) moved = true;
          if (moved) {
            layer.x += e.global.x - last.x;
            layer.y += e.global.y - last.y;
          }
          last.x = e.global.x;
          last.y = e.global.y;
        });
        const endDrag = (e: { global: { x: number; y: number } }) => {
          if (down && !moved) {
            const lp = layer.toLocal({ x: e.global.x, y: e.global.y });
            const w = state.world;
            if (w) {
              const cen = centroid(w);
              const a = (lp.x + cen.x) / (TILE_W / 2);
              const b = (lp.y + cen.y) / (TILE_H / 2);
              const gx = Math.round((a + b) / 2);
              const gy = Math.round((b - a) / 2);
              clickRef.current(gx, gy);
            }
          }
          down = false;
        };
        app.stage.on("pointerup", endDrag);
        app.stage.on("pointerupoutside", () => {
          down = false;
        });

        // Wheel zoom around the cursor.
        const onWheel = (ev: WheelEvent) => {
          ev.preventDefault();
          const rect = canvasEl!.getBoundingClientRect();
          const px = ev.clientX - rect.left;
          const py = ev.clientY - rect.top;
          const old = layer.scale.x;
          const next = Math.min(2.4, Math.max(0.55, old * (ev.deltaY < 0 ? 1.1 : 0.9)));
          const wx = (px - layer.x) / old;
          const wy = (py - layer.y) / old;
          layer.scale.set(next);
          layer.position.set(px - wx * next, py - wy * next);
        };
        canvasEl.addEventListener("wheel", onWheel, { passive: false });
        (app as unknown as { _onWheel?: (e: WheelEvent) => void })._onWheel = onWheel;

        drawScene(layer, state, selectedKey);
      });

    return () => {
      cancelled = true;
      readyRef.current = false;
      const a = appRef.current;
      if (canvasEl) {
        const w = a as unknown as { _onWheel?: (e: WheelEvent) => void };
        if (w?._onWheel) canvasEl.removeEventListener("wheel", w._onWheel);
        if (canvasEl.parentNode === host) host.removeChild(canvasEl);
      }
      if (a) a.destroy();
      appRef.current = null;
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever the world or selection changes.
  useEffect(() => {
    if (readyRef.current && layerRef.current) {
      drawScene(layerRef.current, state, selectedKey);
    }
  }, [state, selectedKey]);

  return (
    <div className="panel iso-panel">
      <div className="iso-map-header">
        <div>
          <h3 style={{ margin: 0 }}>Hockey World</h3>
          <div className="panel-sub" style={{ margin: 0 }}>
            Drag to pan · scroll to zoom · click a tile. Your HQ, fog, and scout
            all live on one map.
          </div>
        </div>
      </div>
      <div ref={hostRef} className="iso-canvas" />
      <MapControls state={state} dispatch={dispatch} selectedKey={selectedKey} />
    </div>
  );
}

// ---- Side controls (scout + selected-tile detail) ------------------------
function MapControls({
  state,
  dispatch,
  selectedKey,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  selectedKey: string | null;
}) {
  const scout = state.world?.scout;
  const sel = selectedKey ? selectedKey.split(",").map(Number) : null;
  const regionId = sel ? regionIdAtTile(sel[0], sel[1]) : null;
  const region = regionId ? REGIONS_BY_ID[regionId] : null;
  const rState = regionId ? state.discovery.regionStates[regionId] ?? "hidden" : null;
  const revealed = sel ? state.world?.revealed.includes(`${sel[0]},${sel[1]}`) : false;

  const canSurvey = region ? surveyableRegionId(state) === region.id : false;
  const canConnect = region ? canEstablishConnection(state, region.id) : false;
  const connecting = region ? state.discovery.connection?.regionId === region.id : false;
  const contested = region ? state.discovery.contested.includes(region.id) : false;

  return (
    <div className="iso-controls">
      {scout && (
        <div className="scout-bar">
          <span>
            🔍 <strong>Scout</strong> · {scout.movesRemaining}/{scout.movesPerTurn} moves
          </span>
          <button
            className={`btn${state.world?.scoutSelected ? " btn-primary" : ""}`}
            onClick={() => dispatch({ type: "SELECT_SCOUT" })}
          >
            {state.world?.scoutSelected ? "Selected — click a tile" : "Select Scout"}
          </button>
        </div>
      )}

      {!sel && (
        <div className="map-detail faint">
          Click a tile to inspect it. Move your Scout into the fog to reveal land
          and discover hockey regions.
        </div>
      )}

      {sel && !(region && revealed && rState !== "hidden") && (
        <div className="map-detail">
          {revealed ? (
            <span className="muted">Open terrain — nothing of hockey interest here yet.</span>
          ) : (
            <span className="faint">Unexplored — shrouded in fog.</span>
          )}
        </div>
      )}

      {sel && region && revealed && rState !== "hidden" && (
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
              <div className="faint">Move your Scout onto this tile to survey it.</div>
            )}
            {canConnect && (
              <button
                className="btn btn-gold btn-block"
                onClick={() => dispatch({ type: "ESTABLISH_CONNECTION", regionId: region.id })}
              >
                Establish Local Connection ({CONNECTION_MONTHS} mo)
              </button>
            )}
            {connecting && (
              <div className="muted">
                Building local ties — {state.discovery.connection?.monthsRemaining} month(s) to go.
              </div>
            )}
            {rState === "influenced" && (
              <div className="influenced-note">
                🚩 Influenced — part of your hockey empire (+1 Reputation/month).
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

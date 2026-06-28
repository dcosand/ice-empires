import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import type {
  GameAction,
  GameState,
  DiscoveryStateValue,
  WorldState,
  WorldTerrain,
  WorldTile,
} from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import type { ClubDef } from "../types/game";
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
const BASE_THICK = 11; // constant chunk below every tile's top diamond
const MAX_RISE = 50; // pixels a full-elevation (1.0) tile rises above ground
const FOG_RISE = 7; // unexplored tiles sit low and flat

const isoX = (gx: number, gy: number) => (gx - gy) * (TILE_W / 2);
const isoY = (gx: number, gy: number) => (gx + gy) * (TILE_H / 2);

// Terrain palette (hockey-world flavored: green plains, tan desert, pale ice).
const TERRAIN: Record<WorldTerrain, { top: number; side: number; detail: number }> = {
  coastal: { top: 0xbfd07d, side: 0x829257, detail: 0x2d7fa6 },
  desert: { top: 0xd8b673, side: 0xb2904c, detail: 0xf1d28e },
  "high-desert": { top: 0xb78f62, side: 0x876942, detail: 0x6f7d55 },
  ice: { top: 0xcfe8f5, side: 0xa3cadd, detail: 0x83c7e3 },
  mountain: { top: 0x7d8c8d, side: 0x59696d, detail: 0xd7e5e7 },
  plains: { top: 0x6f9350, side: 0x52703b, detail: 0x9dbb70 },
  tropical: { top: 0x3f9862, side: 0x2d7048, detail: 0x88c96d },
  water: { top: 0x2f6f9e, side: 0x244f6f, detail: 0x7ccceb },
};
const FOG = { top: 0x111c28, side: 0x0a1119, detail: 0x1c2b3d };

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

function getActiveClub(state: GameState): ClubDef | null {
  return state.club ?? (state.selectedClubId ? CLUBS[state.selectedClubId] : null);
}

function shortClubLabel(club: ClubDef): string {
  return club.name.replace(/\s+HC$/, "").split(/\s+/)[0] ?? club.cityRegion;
}

const diamond = (h = TILE_H): number[] => [0, -h / 2, TILE_W / 2, 0, 0, h / 2, -TILE_W / 2, 0];

// Centroid offset so the map draws centered around the world container origin.
function centroid(w: WorldState) {
  return { x: isoX((w.width - 1) / 2, (w.height - 1) / 2), y: isoY((w.width - 1) / 2, (w.height - 1) / 2) };
}

// ---- Scene drawing -------------------------------------------------------
function drawScene(
  layer: Container,
  state: GameState,
  selectedKey: string | null,
  logoTexture: Texture | null,
) {
  layer.removeChildren().forEach((c) => c.destroy());
  const world = state.world;
  if (!world) return;
  const c = centroid(world);
  const activeClub = getActiveClub(state);
  const accent = accentNumber(activeClub?.accent);
  const clubLabel = activeClub ? shortClubLabel(activeClub) : "";
  const scout = world.scout;
  const founder = world.founder;
  const moveable =
    world.founderSelected && !world.hqTile
      ? moveableTilesFor(world, founder)
      : world.scoutSelected
        ? moveableTilesFor(world, scout)
        : new Set<string>();
  const revealedSet = new Set(world.revealed);

  for (let gy = 0; gy < world.height; gy++) {
    for (let gx = 0; gx < world.width; gx++) {
      const key = tileKey(gx, gy);
      const tile = tileAt(world, gx, gy)!;
      const revealed = revealedSet.has(key);
      const pal = revealed ? TERRAIN[tile.terrain] ?? TERRAIN.plains : FOG;
      const rise = revealed ? tileRise(tile) : FOG_RISE;
      const topColor = revealed ? variantTopColor(tile, pal.top) : pal.top;

      // --- extruded cliff sides (anchored at the shared ground plane) ---
      const gSide = new Graphics();
      gSide.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
      gSide.zIndex = gx + gy;
      // The top edge is lifted by `rise`; the base stays at a constant depth so
      // every tile shares one ground plane and taller tiles show taller cliffs.
      gSide
        .poly([-TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, -TILE_W / 2, BASE_THICK])
        .fill(pal.side);
      gSide
        .poly([TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, TILE_W / 2, BASE_THICK])
        .fill(darken(pal.side));
      // A rim highlight where the lifted top meets the cliff sells the height.
      if (revealed && rise > 16) {
        gSide
          .poly([-TILE_W / 2, -rise, 0, TILE_H / 2 - rise, TILE_W / 2, -rise])
          .stroke({ width: 1, color: lighten(pal.side, 0.22), alpha: 0.5 });
      }
      layer.addChild(gSide);

      // --- top face, raised by `rise` and drawn just above its own sides ---
      const gTop = new Graphics();
      gTop.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
      gTop.zIndex = gx + gy + 0.05;
      gTop.poly(diamond()).fill(topColor).stroke({ width: 1, color: 0x0a1018, alpha: 0.3 });
      if (revealed) drawTerrainDetails(gTop, tile, pal);
      if (moveable.has(key)) drawMoveHint(gTop);
      if (selectedKey === key) {
        gTop.poly(diamond()).stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 });
      }
      layer.addChild(gTop);

      // ---- markers on top of the tile ----
      const regionId = regionIdAtTile(gx, gy);
      const rState = regionId ? state.discovery.regionStates[regionId] ?? "hidden" : "hidden";
      if (revealed && regionId && rState !== "hidden") {
        const pin = new Graphics();
        pin.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
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
      if (isHQ) {
        const mk = hqMarker(gx, gy, c, accent, clubLabel, logoTexture);
        mk.position.y -= rise;
        layer.addChild(mk);
      }

      if (founder && founder.x === gx && founder.y === gy) {
        const mk = founderMarker(gx, gy, c, world.founderSelected, accent);
        mk.position.y -= rise;
        layer.addChild(mk);
      }

      if (scout && scout.x === gx && scout.y === gy) {
        const mk = scoutMarker(gx, gy, c, world.scoutSelected, accent);
        mk.position.y -= rise;
        layer.addChild(mk);
      }
    }
  }
}

function founderMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  selected: boolean | undefined,
  accent: number,
) {
  const m = new Graphics();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 0.65;

  if (selected) {
    m.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  m.ellipse(0, 1, 12, 4).fill({ color: 0x000000, alpha: 0.35 });

  // Founding Group: a simple expedition pennant and bundled hockey sticks.
  m.rect(-2, -36, 3, 34).fill(0xe6eef6);
  m.poly([1, -36, 20, -31, 1, -25]).fill(accent).stroke({ width: 1.5, color: 0x05121c });
  m.roundRect(-12, -22, 24, 18, 4).fill(0x18293b).stroke({ width: 2, color: accent });
  m.circle(0, -27, 7).fill(0xe7b48b).stroke({ width: 1, color: 0xc8946a });
  m.circle(-2.5, -28, 0.8).fill(0x2a2320);
  m.circle(2.5, -28, 0.8).fill(0x2a2320);
  m.roundRect(-14, -14, 5, 16, 2).fill(0x33404f);
  m.roundRect(9, -14, 5, 16, 2).fill(0x33404f);
  m.poly([-18, 0, -16, 0, -10, -33, -12, -33]).fill(0xd8b673);
  m.poly([18, 0, 16, 0, 10, -33, 12, -33]).fill(0xd8b673);
  return m;
}

function hqMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  accent: number,
  label: string,
  logoTexture: Texture | null,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  // HQ is a key landmark and carries a name label that hangs below the pin, so
  // keep the whole marker above neighbouring tile tops (which would otherwise
  // paint over the lower half of the label).
  m.zIndex = gx + gy + 50;

  const base = new Graphics();
  base.ellipse(0, 1, 20, 7).fill({ color: 0x000000, alpha: 0.35 });
  base.poly([-18, 0, 0, 9, 18, 0, 0, -9]).fill(0x05121c).stroke({ width: 2, color: accent });
  base.circle(0, -23, 17).fill(0x0f1824).stroke({ width: 3, color: accent });
  base.circle(0, -23, 12).fill(0xe6eef6);
  base.rect(16, -45, 2, 23).fill(0xe6eef6);
  base.poly([18, -45, 34, -40, 18, -35]).fill(accent).stroke({ width: 1.5, color: 0x05121c });
  m.addChild(base);

  if (logoTexture) {
    const logo = new Sprite(logoTexture);
    logo.anchor.set(0.5);
    logo.position.set(0, -23);
    const scale = Math.min(22 / logoTexture.width, 22 / logoTexture.height);
    logo.scale.set(scale);
    m.addChild(logo);
  } else {
    const fallback = new Graphics();
    fallback.poly([-7, -30, 7, -30, 9, -18, 0, -12, -9, -18]).fill(accent);
    m.addChild(fallback);
  }

  if (label) {
    const text = new Text({
      text: label,
      style: {
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 12,
        fontWeight: "800",
        fill: 0xe6eef6,
        stroke: { color: 0x05121c, width: 4 },
      },
    });
    text.anchor.set(0.5, 0);
    text.position.set(0, 8);
    m.addChild(text);
  }

  return m;
}

// How far a tile's top rises above the shared ground plane, in pixels. Driven
// by the per-tile elevation field so two plains tiles (or two mountains) can sit
// at noticeably different heights. Falls back to a terrain estimate for any
// world saved before elevation existed.
function tileRise(tile: WorldTile): number {
  const e = tile.elevation ?? fallbackElevation(tile);
  return Math.round(e * MAX_RISE);
}

function fallbackElevation(tile: WorldTile): number {
  const jitter = (tile.variant ?? 0) * 0.05;
  switch (tile.terrain) {
    case "water":
      return 0;
    case "coastal":
      return 0.08;
    case "mountain":
      return 0.78 + jitter;
    case "high-desert":
      return 0.42 + jitter;
    case "ice":
      return 0.3 + jitter;
    default:
      return 0.22 + jitter;
  }
}

function variantTopColor(tile: WorldTile, base: number): number {
  const v = tile.variant ?? 0;
  if (tile.feature === "river" || tile.feature === "pond") return mixColor(base, 0x7dd3fc, 0.1);
  if (tile.feature === "lake") return mixColor(base, 0x2f6f9e, 0.38);
  const amt = [-0.08, 0.04, 0.1, -0.03][v] ?? 0;
  return amt >= 0 ? lighten(base, amt) : darkenBy(base, Math.abs(amt));
}

function drawMoveHint(g: Graphics) {
  g.poly([-24, -12, -12, -16, -8, -14]).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.9 });
  g.poly([24, 12, 12, 16, 8, 14]).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.9 });
  g.circle(0, 0, 3).fill({ color: 0x7dd3fc, alpha: 0.72 });
}

function drawTerrainDetails(
  g: Graphics,
  tile: WorldTile,
  pal: { top: number; side: number; detail: number },
) {
  const v = tile.variant ?? 0;

  switch (tile.terrain) {
    case "water":
      drawWater(g, v, pal.detail);
      break;
    case "ice":
      drawIce(g, v, pal.detail);
      break;
    case "desert":
      drawDesert(g, v, pal.detail);
      break;
    case "high-desert":
      drawHighDesert(g, v, pal.detail);
      break;
    case "coastal":
      drawCoastal(g, v, pal.detail);
      break;
    case "tropical":
      drawTropical(g, v, pal.detail);
      break;
    case "mountain":
      drawMountain(g, v, pal.detail);
      break;
    case "plains":
    default:
      drawPlains(g, v, pal.detail);
      break;
  }

  if (tile.feature === "river") drawRiver(g, v);
  if (tile.feature === "pond") drawPond(g, v, false);
  if (tile.feature === "lake") drawPond(g, v, true);
}

function drawWater(g: Graphics, v: number, color: number) {
  const y = -5 + v * 2;
  g.poly([-18, y, -7, y - 4, 5, y - 1, 17, y - 5]).stroke({ width: 2, color, alpha: 0.55 });
  g.poly([-12, y + 8, 0, y + 4, 12, y + 7]).stroke({ width: 2, color, alpha: 0.42 });
}

function drawIce(g: Graphics, v: number, color: number) {
  g.poly([-20, -4 + v, -8, -2, 0, -8, 9, -5]).stroke({ width: 1.5, color, alpha: 0.55 });
  g.poly([-5, 7, 3, 1, 15, 2]).stroke({ width: 1.2, color: 0xffffff, alpha: 0.45 });
  if (v % 2 === 0) g.circle(11, -4, 3).fill({ color: 0xffffff, alpha: 0.22 });
}

function drawDesert(g: Graphics, v: number, color: number) {
  g.poly([-25, -3, -13, -8, -2, -5, 11, -10, 25, -6]).stroke({ width: 2.4, color, alpha: 0.48 });
  g.poly([-24, 6, -12, 2, 0, 4, 14, -1, 24, 2]).stroke({ width: 1.9, color: 0x9f7a3d, alpha: 0.36 });
  g.poly([-18, 13 - v, -8, 8 - v, 5, 10 - v]).stroke({ width: 1.7, color: 0xf4d894, alpha: 0.38 });
  g.circle(13 - v * 4, -1 + v, 2.2).fill({ color: 0x8b6a3a, alpha: 0.72 });
}

function drawHighDesert(g: Graphics, v: number, color: number) {
  g.poly([-24, 3, -12, -3, 1, 0, 16, -6, 25, -4]).stroke({ width: 2, color, alpha: 0.55 });
  g.poly([-19, 12, -7, 6, 5, 9, 18, 3]).stroke({ width: 1.6, color: 0x80613e, alpha: 0.45 });
  g.circle(-12 + v * 7, 4, 2.2).fill({ color: 0x5d6d4a, alpha: 0.75 });
  g.poly([9, 8, 13, 0, 17, 8]).stroke({ width: 2, color: 0x54613e, alpha: 0.8 });
  if (v > 1) g.poly([-18, -3, -14, -10, -10, -3]).stroke({ width: 1.6, color: 0x65754d, alpha: 0.7 });
}

function drawCoastal(g: Graphics, v: number, color: number) {
  g.poly([-30, 0, -15, 7, 0, 12, 15, 7, 30, 0, 16, 4, 0, 8, -16, 4]).fill({ color: 0xe6ca89, alpha: 0.5 });
  g.poly([-19, -3 + v, -7, -7 + v, 8, -5 + v, 19, -9 + v]).stroke({ width: 2, color, alpha: 0.5 });
}

function drawTropical(g: Graphics, v: number, color: number) {
  const x = -10 + v * 6;
  g.circle(x, -2, 4).fill({ color, alpha: 0.75 });
  g.circle(x + 5, 1, 4).fill({ color: 0x2f7a3f, alpha: 0.75 });
  g.circle(x - 4, 3, 3).fill({ color: 0x9ed36d, alpha: 0.65 });
  g.poly([10, 7, 14, 0, 18, 7]).stroke({ width: 1.5, color, alpha: 0.8 });
  g.poly([-22, 8, -8, 2, 6, 6, 21, 0]).stroke({ width: 1.4, color: 0x1f6a45, alpha: 0.48 });
}

function drawMountain(g: Graphics, v: number, color: number) {
  const offset = v % 2 === 0 ? -3 : 3;
  g.poly([-18, 5, -7 + offset, -18, 5, 5]).fill(0x5f6d70).stroke({ width: 1, color: 0x334044, alpha: 0.7 });
  g.poly([-7 + offset, -18, -2 + offset, -7, -11 + offset, -7]).fill(color);
  g.poly([0, 8, 11 - offset, -13, 21, 8]).fill(0x6e7b7c).stroke({ width: 1, color: 0x334044, alpha: 0.7 });
  g.poly([11 - offset, -13, 15 - offset, -4, 7 - offset, -4]).fill(0xe6eef6);
}

function drawPlains(g: Graphics, v: number, color: number) {
  g.poly([-24, -3, -12, -7, 2, -4, 18, -10]).stroke({ width: 1.7, color, alpha: 0.42 });
  g.poly([-22, 8, -10, 4, 4, 7, 20, 1]).stroke({ width: 1.5, color: 0x517c45, alpha: 0.38 });
  g.poly([-13 + v * 2, 10, -10 + v * 2, 3, -7 + v * 2, 10]).stroke({ width: 1.7, color, alpha: 0.68 });
  if (v > 1) g.circle(11, 2, 2.4).fill({ color: 0x426c3c, alpha: 0.62 });
}

function drawRiver(g: Graphics, v: number) {
  const y = v % 2 === 0 ? 0 : -2;
  g.poly([-32, y - 1, -16, y + 5, 0, y + 1, 16, y + 5, 32, y - 1, 32, y + 4, 16, y + 9, 0, y + 5, -16, y + 9, -32, y + 4]).fill({
    color: 0x4bb4d8,
    alpha: 0.68,
  });
  g.poly([-24, y + 1, -10, y + 5, 6, y + 3, 22, y + 6]).stroke({ width: 1.2, color: 0xcfe8f5, alpha: 0.55 });
}

function drawPond(g: Graphics, v: number, lake: boolean) {
  const rx = lake ? 15 : 9;
  const ry = lake ? 6 : 4;
  g.ellipse(v % 2 === 0 ? -3 : 4, 1, rx, ry).fill({ color: 0x3da5c9, alpha: lake ? 0.8 : 0.62 }).stroke({
    width: 1,
    color: 0xcfe8f5,
    alpha: 0.55,
  });
}

// The Scout: a hockey exec bundled for the field in a team-colored, fur-trimmed
// parka, glassing the horizon through binoculars. Drawn billboard-style (facing
// camera) as vector art so it stays crisp at any zoom. `accent` is the club
// color, so the parka matches the team.
const SKIN = 0xe7b48b;
const SKIN_SHADE = 0xc8946a;
const FUR = 0xe9ddc6;
const FUR_SHADE = 0xc9bca0;
const BOOT = 0x20242c;
const SNOWPANT = 0x3a4654;

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

  const parka = accent;
  const parkaDark = darkenBy(accent, 0.3);
  const parkaLight = lighten(accent, 0.28);

  // selected ground ring + contact shadow
  if (selected) {
    s.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  s.ellipse(0, 1, 11, 4).fill({ color: 0x000000, alpha: 0.35 });

  // chunky snow boots + insulated legs
  s.roundRect(-6.5, -4, 6.5, 4, 1.5).fill(BOOT);
  s.roundRect(0, -4, 6.5, 4, 1.5).fill(BOOT);
  s.roundRect(-5, -14, 4.5, 11, 2).fill(SNOWPANT);
  s.roundRect(0.5, -14, 4.5, 11, 2).fill(SNOWPANT);
  s.roundRect(0.5, -14, 4.5, 11, 2).fill({ color: 0x000000, alpha: 0.18 }); // leg shading

  // parka body with fur-trimmed hem
  s.roundRect(-9.5, -31, 19, 20, 6).fill(parka);
  s.roundRect(3, -30, 6, 18, 4).fill({ color: parkaDark, alpha: 0.5 }); // right-side shade
  s.roundRect(-9.5, -16, 19, 4, 2).fill(FUR); // fur hem
  s.roundRect(-9.5, -16, 19, 1.6, 2).fill({ color: FUR_SHADE, alpha: 0.7 });
  // center zip + a pocket flap
  s.roundRect(-0.8, -30, 1.6, 16, 0.6).fill({ color: parkaDark, alpha: 0.85 });
  s.roundRect(-7, -21, 5, 3.5, 1).fill({ color: parkaDark, alpha: 0.4 });

  // raised sleeves (arms up to hold the binoculars at the eyes)
  s.roundRect(-13, -31, 6, 11, 3).fill(parka);
  s.roundRect(-13, -31, 2.4, 11, 2).fill({ color: parkaLight, alpha: 0.4 });
  s.roundRect(7, -31, 6, 11, 3).fill(parka);
  s.roundRect(10.6, -31, 2.4, 11, 2).fill({ color: parkaDark, alpha: 0.45 });
  // forearms angling up toward the face
  s.poly([-11.5, -30, -8, -31, -4.5, -37, -7.5, -38]).fill(parka);
  s.poly([11.5, -30, 8, -31, 4.5, -37, 7.5, -38]).fill(parka);
  // mittened hands gripping the binoculars
  s.circle(-5.5, -37.5, 2.4).fill(parkaDark);
  s.circle(5.5, -37.5, 2.4).fill(parkaDark);

  // hood: fur ruff ringing the face
  s.circle(0, -39, 8.4).fill(FUR);
  s.arc(0, -39, 8.4, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 2.4, color: FUR_SHADE, alpha: 0.6 });
  s.circle(0, -39, 5.9).fill(parkaDark); // hood interior shadow
  // face peeking out of the hood
  s.circle(0, -38.4, 5).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE });

  // binoculars raised to the eyes
  s.roundRect(-5, -40.5, 10, 4, 1.8).fill(0x171b22);
  s.roundRect(-1.2, -40, 2.4, 3, 0.8).fill(0x2a2f38); // bridge
  s.circle(-3.6, -38.7, 2.1).fill(0x10141a).stroke({ width: 0.8, color: 0x3a4150 });
  s.circle(3.6, -38.7, 2.1).fill(0x10141a).stroke({ width: 0.8, color: 0x3a4150 });
  s.circle(-4.1, -39.3, 0.7).fill({ color: 0x7fc7e3, alpha: 0.8 }); // lens glints
  s.circle(3.1, -39.3, 0.7).fill({ color: 0x7fc7e3, alpha: 0.8 });

  // faint puff of cold breath
  s.circle(7, -36, 1.6).fill({ color: 0xffffff, alpha: 0.16 });
  s.circle(9, -35, 1.1).fill({ color: 0xffffff, alpha: 0.1 });
  return s;
}

function lighten(color: number, amt = 0.4): number {
  const mix = (ch: number) => Math.round(ch + (255 - ch) * amt);
  return (mix((color >> 16) & 0xff) << 16) | (mix((color >> 8) & 0xff) << 8) | mix(color & 0xff);
}

function darkenBy(color: number, amt = 0.2): number {
  const mix = (ch: number) => Math.round(ch * (1 - amt));
  return (mix((color >> 16) & 0xff) << 16) | (mix((color >> 8) & 0xff) << 8) | mix(color & 0xff);
}

function darken(color: number): number {
  return darkenBy(color, 0.2);
}

function mixColor(a: number, b: number, amt: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * amt);
  return (mix(ar, br) << 16) | (mix(ag, bg) << 8) | mix(ab, bb);
}

// ---- Component -----------------------------------------------------------
export function IsoWorldMap({
  state,
  dispatch,
  onOpenHQ,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenHQ?: () => void;
}) {
  const activeClub = getActiveClub(state);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRef = useRef<Container | null>(null);
  const readyRef = useRef(false);
  const clickRef = useRef<(gx: number, gy: number) => void>(() => {});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [logoTexture, setLogoTexture] = useState<Texture | null>(null);

  // Always-fresh click handler (captures latest state/selection).
  clickRef.current = (gx: number, gy: number) => {
    const w = state.world;
    if (!w) return;
    if (!tileAt(w, gx, gy)) return;
    const key = tileKey(gx, gy);
    const founder = w.founder;
    const founderMoveable =
      founder && w.founderSelected && !w.hqTile
        ? moveableTilesFor(w, founder)
        : new Set<string>();
    if (founder && w.founderSelected && founderMoveable.has(key)) {
      dispatch({ type: "MOVE_FOUNDING_UNIT", x: gx, y: gy });
      setSelectedKey(key);
      return;
    }
    if (founder && founder.x === gx && founder.y === gy) {
      dispatch({ type: "SELECT_FOUNDING_UNIT" });
      setSelectedKey(key);
      return;
    }

    const scout = w.scout;
    const moveable = w.scoutSelected ? moveableTilesFor(w, scout) : new Set<string>();
    if (scout && w.scoutSelected && moveable.has(key)) {
      dispatch({ type: "MOVE_SCOUT", x: gx, y: gy });
      setSelectedKey(key);
      return;
    }

    // Clicking the HQ tile opens the Club HQ screen (unless the scout is being
    // moved onto it, handled above).
    if (w.hqTile && w.hqTile.x === gx && w.hqTile.y === gy) {
      setSelectedKey(key);
      onOpenHQ?.();
      return;
    }

    if (scout && scout.x === gx && scout.y === gy) {
      dispatch({ type: "SELECT_SCOUT" });
      setSelectedKey(key);
      return;
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

        drawScene(layer, state, selectedKey, logoTexture);
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

  useEffect(() => {
    let cancelled = false;
    if (!activeClub) {
      setLogoTexture(null);
      return;
    }
    setLogoTexture(null);
    Assets.load<Texture>(clubAsset(activeClub, "logo"))
      .then((texture) => {
        if (!cancelled) setLogoTexture(texture);
      })
      .catch(() => {
        if (!cancelled) setLogoTexture(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeClub?.assetKey]);

  // Redraw whenever the world, selection, or logo texture changes.
  useEffect(() => {
    if (readyRef.current && layerRef.current) {
      drawScene(layerRef.current, state, selectedKey, logoTexture);
    }
  }, [state, selectedKey, logoTexture]);

  return (
    <div className="panel iso-panel">
      <div className="iso-map-header">
        <div>
          <h3 style={{ margin: 0 }}>Hockey World</h3>
          <div className="panel-sub" style={{ margin: 0 }}>
            Drag to pan · scroll to zoom · click a tile. The founding expedition,
            HQ, fog, and scout all live on this same generated world.
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
  const founder = state.world?.founder;
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
      {founder && !state.world?.hqTile && (
        <div className="scout-bar">
          <span>
            🧭 <strong>Founding Group</strong> · {founder.movesRemaining}/{founder.movesPerTurn} moves
          </span>
          <button
            className={`btn${state.world?.founderSelected ? " btn-primary" : ""}`}
            onClick={() => dispatch({ type: "SELECT_FOUNDING_UNIT" })}
          >
            {state.world?.founderSelected ? "Selected — click a tile" : "Select Founding Group"}
          </button>
        </div>
      )}

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
          Click a tile to inspect it. Moving a unit reveals the destination and
          the surrounding sightline.
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

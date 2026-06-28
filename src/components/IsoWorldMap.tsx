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
const FLAT_RISE = 10; // every revealed tile shares one flat ground height
const FOG_RISE = 7; // unexplored tiles sit slightly lower than explored land

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
  registerScout: (node: Container | null, baseY: number) => void,
) {
  layer.removeChildren().forEach((c) => c.destroy());
  registerScout(null, 0);
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
      const revealed = state.devRevealAll || revealedSet.has(key);
      const pal = revealed ? TERRAIN[tile.terrain] ?? TERRAIN.plains : FOG;
      const rise = revealed ? tileRise(tile) : FOG_RISE;
      const topColor = revealed ? variantTopColor(tile, pal.top) : pal.top;

      // --- extruded cliff sides (anchored at the shared ground plane) ---
      const gSide = new Graphics();
      gSide.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
      gSide.zIndex = gx + gy;
      // The top edge is lifted by a uniform `rise`; the base stays at a constant
      // depth so every revealed tile shares one flat ground plane and presents an
      // even slab edge.
      gSide
        .poly([-TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, -TILE_W / 2, BASE_THICK])
        .fill(pal.side);
      gSide
        .poly([TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, TILE_W / 2, BASE_THICK])
        .fill(darken(pal.side));
      // A rim highlight along the slab's top edge keeps the ground plane crisp.
      if (revealed) {
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
      if (revealed) drawGroundTexture(gTop, tile, pal);
      if (moveable.has(key)) drawMoveHint(gTop);
      if (selectedKey === key) {
        gTop.poly(diamond()).stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 });
      }
      layer.addChild(gTop);

      // --- standing features: trees, peaks, mesas, cacti and rocks that rise
      // off the tile top so taller terrain visibly towers over flat ground.
      // Drawn as their own z-ordered object so tiles in front overlap the bases
      // of features behind them (true iso depth), exactly like the unit sprites.
      if (revealed) {
        const feat = new Graphics();
        feat.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
        feat.zIndex = gx + gy + 0.1;
        if (drawStandingFeatures(feat, tile, pal)) layer.addChild(feat);
        else feat.destroy();
      }

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
        // When the Scout shares the HQ tile, draw him in front of the HQ pin so
        // the player can see he's there and ready to be moved.
        if (isHQ) mk.zIndex = gx + gy + 51;
        layer.addChild(mk);
        registerScout(mk, mk.position.y);
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

// Every revealed tile sits on the same flat ground plane now — the world reads
// as a level slab. All sense of height comes from what stands *on* the tile
// (mountain peaks, hill mounds, forests, rocks), not from the ground itself.
function tileRise(_tile: WorldTile): number {
  return FLAT_RISE;
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

// Per-tile deterministic randomness. Lets every tile pick a stable variant and
// orientation purely from its (x, y) — no change to world generation needed.
// Two same-terrain tiles still differ because they seed different variants and
// mirroring. salt selects an independent stream (variant / mirror / jitter).
function tileRand(x: number, y: number, salt: number): number {
  let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (salt * 83492791), 2654435761);
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967295;
}

type TileLook = { v: number; mirror: boolean; jx: number };

// A tile's "look": one of 5 art variants, an optional left-right mirror, and a
// small horizontal jitter. Shared by ground texture + standing features so the
// two stay consistent. Five variants × mirror ≈ ten distinct silhouettes per
// terrain so neighbours rarely look identical.
function tileLook(tile: WorldTile): TileLook {
  return {
    v: Math.floor(tileRand(tile.x, tile.y, 1) * 5),
    mirror: tileRand(tile.x, tile.y, 2) > 0.5,
    jx: (tileRand(tile.x, tile.y, 3) - 0.5) * 12,
  };
}

// ---- Flat ground cover (painted onto the tile's top diamond) --------------
function drawGroundTexture(
  g: Graphics,
  tile: WorldTile,
  pal: { top: number; side: number; detail: number },
) {
  const { v } = tileLook(tile);
  switch (tile.terrain) {
    case "water":
      groundWater(g, v, pal.detail);
      break;
    case "ice":
      groundIce(g, v, pal.detail);
      break;
    case "desert":
      groundDesert(g, v, pal.detail);
      break;
    case "high-desert":
      groundHighDesert(g, v, pal.detail);
      break;
    case "coastal":
      groundCoastal(g, v, pal.detail);
      break;
    case "tropical":
      groundGrass(g, v, 0x2f7a3f, 0x88c96d);
      break;
    case "mountain":
      groundRock(g, v, pal.side);
      break;
    case "plains":
    default:
      groundGrass(g, v, pal.side, pal.detail);
      break;
  }

  if (tile.feature === "river") drawRiver(g, v);
  if (tile.feature === "pond") drawPond(g, v, false);
  if (tile.feature === "lake") drawPond(g, v, true);
}

function groundGrass(g: Graphics, v: number, dark: number, light: number) {
  const blades: [number, number][] = [
    [-16, 6], [-4, 9], [8, 5], [16, 8], [-10, -2], [4, -4], [14, -1],
  ];
  blades.forEach((b, i) => {
    const col = (i + v) % 2 ? light : dark;
    g.poly([b[0], b[1], b[0] - 2, b[1] - 5, b[0] + 1, b[1] - 3]).stroke({ width: 1.2, color: col, alpha: 0.5 });
  });
}

function groundWater(g: Graphics, v: number, color: number) {
  const y = -5 + v;
  g.poly([-18, y, -7, y - 4, 5, y - 1, 17, y - 5]).stroke({ width: 2, color, alpha: 0.55 });
  g.poly([-12, y + 8, 0, y + 4, 12, y + 7]).stroke({ width: 2, color, alpha: 0.42 });
}

function groundIce(g: Graphics, v: number, color: number) {
  g.poly([-20, -4 + v, -8, -2, 0, -8, 9, -5]).stroke({ width: 1.5, color, alpha: 0.55 });
  g.poly([-5, 7, 3, 1, 15, 2]).stroke({ width: 1.2, color: 0xffffff, alpha: 0.45 });
  if (v % 2 === 0) g.circle(11, -4, 3).fill({ color: 0xffffff, alpha: 0.22 });
}

function groundDesert(g: Graphics, v: number, color: number) {
  g.poly([-25, -3, -13, -8, -2, -5, 11, -10, 25, -6]).stroke({ width: 2.4, color, alpha: 0.48 });
  g.poly([-24, 6, -12, 2, 0, 4, 14, -1, 24, 2]).stroke({ width: 1.9, color: 0x9f7a3d, alpha: 0.36 });
  g.poly([-18, 13 - v, -8, 8 - v, 5, 10 - v]).stroke({ width: 1.7, color: 0xf4d894, alpha: 0.38 });
}

function groundHighDesert(g: Graphics, v: number, color: number) {
  g.poly([-24, 3, -12, -3, 1, 0, 16, -6, 25, -4]).stroke({ width: 2, color, alpha: 0.5 });
  g.poly([-19, 12, -7, 6, 5, 9, 18, 3]).stroke({ width: 1.6, color: 0x80613e, alpha: 0.42 });
  if (v % 2 === 0) g.poly([-14, -2, 14, -4]).stroke({ width: 1, color: 0x80613e, alpha: 0.3 });
}

function groundCoastal(g: Graphics, v: number, color: number) {
  g.poly([-30, 0, -15, 7, 0, 12, 15, 7, 30, 0, 16, 4, 0, 8, -16, 4]).fill({ color: 0xe6ca89, alpha: 0.5 });
  g.poly([-19, -3 + v, -7, -7 + v, 8, -5 + v, 19, -9 + v]).stroke({ width: 2, color, alpha: 0.5 });
}

function groundRock(g: Graphics, v: number, color: number) {
  g.poly([-20, 2 + v, -6, -3, 6, 1, 20, -2]).stroke({ width: 1, color: darkenBy(color, 0.15), alpha: 0.4 });
  g.poly([-14, 9, 0, 5, 16, 8]).stroke({ width: 1, color: darkenBy(color, 0.25), alpha: 0.35 });
}

// ---- Standing features (rise off the tile, z-ordered for real depth) -------
// Returns true if anything was drawn (so empty tiles can skip the object).
function drawStandingFeatures(
  g: Graphics,
  tile: WorldTile,
  pal: { top: number; side: number; detail: number },
): boolean {
  const look = tileLook(tile);
  if (look.mirror) g.scale.x = -1;

  switch (tile.terrain) {
    case "mountain":
      mountainPeaks(g, look, pal);
      return true;
    case "high-desert":
      return mesaField(g, look, pal);
    case "desert":
      return desertFeatures(g, look);
    case "ice":
      return iceFeatures(g, look);
    case "tropical":
      tropicalGrove(g, look);
      return true;
    case "coastal":
      return coastalFeatures(g, look);
    case "plains":
    default:
      return plainsFeatures(g, look, tile);
  }
}

// --- reusable props ---
function shadow(g: Graphics, x: number, base: number, w: number) {
  g.ellipse(x, base, w, w * 0.32).fill({ color: 0x000000, alpha: 0.18 });
}

// Conifer: stacked triangle tiers on a short trunk. snow caps the top tier.
function pine(
  g: Graphics,
  x: number,
  base: number,
  h: number,
  w: number,
  leaf: number,
  leafDark: number,
  snow = false,
) {
  shadow(g, x, base, w * 0.5);
  const trunkH = h * 0.2;
  g.rect(x - h * 0.045, base - trunkH, h * 0.09, trunkH + 1).fill(0x6b4a2f);
  let ty = base - trunkH;
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const tw = w * (1 - i * 0.22);
    const th = (h - trunkH) * 0.46;
    g.poly([x - tw / 2, ty, x + tw / 2, ty, x, ty - th]).fill(i === 0 ? leafDark : leaf);
    g.poly([x, ty, x + tw / 2, ty, x, ty - th]).fill({ color: leafDark, alpha: 0.4 });
    if (i === tiers - 1 && snow) {
      g.poly([x - tw * 0.22, ty - th * 0.45, x + tw * 0.22, ty - th * 0.45, x, ty - th]).fill(0xf2f7fb);
    }
    ty -= th * 0.62;
  }
}

// Round-canopy broadleaf tree, built from overlapping blobs.
function broadleaf(
  g: Graphics,
  x: number,
  base: number,
  h: number,
  w: number,
  leaf: number,
  leafDark: number,
) {
  shadow(g, x, base, w * 0.55);
  const trunkH = h * 0.38;
  g.rect(x - h * 0.045, base - trunkH, h * 0.09, trunkH + 1).fill(0x6b4a2f);
  const cy = base - h * 0.6;
  g.circle(x - w * 0.24, cy + 3, w * 0.34).fill(leafDark);
  g.circle(x + w * 0.26, cy + 2, w * 0.32).fill(leafDark);
  g.circle(x, cy - w * 0.18, w * 0.38).fill(leaf);
  g.circle(x - w * 0.12, cy - w * 0.04, w * 0.3).fill(lighten(leaf, 0.12));
}

// Palm: a leaning tapered trunk with drooping fronds and two coconuts.
function palm(g: Graphics, x: number, base: number, h: number) {
  const frond = 0x4fae5c;
  const frondDark = 0x2f7a3f;
  shadow(g, x, base, 6);
  const tx = x + h * 0.16;
  const ty = base - h;
  g.poly([x - 1.6, base, x + 1.6, base, tx + 1.6, ty, tx - 1.6, ty]).fill(0x8a6a43);
  g.poly([x + 0.3, base, x + 1.6, base, tx + 1.6, ty, tx + 0.3, ty]).fill({ color: 0x5e4628, alpha: 0.5 });
  const angles = [-2.5, -1.7, -0.6, 0.6, 1.5];
  angles.forEach((a, i) => {
    const ex = tx + Math.cos(a) * 16;
    const ey = ty + Math.sin(a) * 14 - 2;
    const mx = (tx + ex) / 2 - Math.sin(a) * 4;
    const my = (ty + ey) / 2 + Math.cos(a) * 4;
    g.poly([tx, ty - 1, mx, my, ex, ey]).fill(i === 0 || i === angles.length - 1 ? frondDark : frond);
  });
  g.circle(tx - 2, ty + 2, 1.6).fill(0x7a5a2c);
  g.circle(tx + 2, ty + 3, 1.6).fill(0x7a5a2c);
}

// Rounded boulder with a lit top-left face and shadowed right face.
function rock(g: Graphics, x: number, base: number, s: number, lit: number, shade: number) {
  shadow(g, x, base, s * 1.1);
  g.poly([x - s, base, x - s * 0.6, base - s * 0.9, x + s * 0.2, base - s, x + s, base - s * 0.3, x + s * 0.7, base]).fill(shade);
  g.poly([x - s, base, x - s * 0.6, base - s * 0.9, x + s * 0.2, base - s, x - s * 0.1, base]).fill(lit);
}

// A sine-arc dome used for landform mounds (grassy hills). Flat-bottomed so it
// reads as ground swelling up off the level slab.
function dome(g: Graphics, x: number, base: number, h: number, w: number, color: number) {
  const pts: number[] = [];
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push(x - w / 2 + t * w, base - Math.sin(t * Math.PI) * h);
  }
  pts.push(x + w / 2, base, x - w / 2, base);
  g.poly(pts).fill(color);
}

// Grassy hill: a mound rising off the flat ground, crowned with trees/rock.
// This is how "hills" gain their height now that the base ground is uniform.
function hill(g: Graphics, x: number, base: number, h: number, w: number, look: TileLook) {
  const lit = 0x6fa14f;
  const shade = 0x4a6f37;
  const leaf = 0x4f9a4a;
  const leafDark = 0x356b35;
  shadow(g, x, base, w * 0.5);
  dome(g, x, base, h, w, shade);
  dome(g, x - w * 0.12, base, h * 0.86, w * 0.74, lit);
  // a crown of trees / boulder on top of the rise
  const crown = base - h * 0.78;
  broadleaf(g, x - w * 0.16, crown + 4, 15, 12, leaf, leafDark);
  if (look.v % 2 === 0) broadleaf(g, x + w * 0.18, crown + 6, 13, 10, leaf, leafDark);
  else rock(g, x + w * 0.2, crown + 6, 4, 0x9aa0a6, 0x6c7176);
}

// A single rocky peak with two shaded faces and a snow cap.
function peak(g: Graphics, x: number, base: number, h: number, w: number, lit: number, shade: number) {
  shadow(g, x, base, w * 0.5);
  const apexY = base - h;
  g.poly([x, apexY, x + w / 2, base, x - w * 0.1, base]).fill(shade);
  g.poly([x, apexY, x - w / 2, base, x - w * 0.1, base]).fill(lit);
  const capH = h * 0.34;
  const capW = w * 0.34;
  g.poly([x, apexY, x - capW / 2, apexY + capH, x - capW * 0.1, apexY + capH * 0.7, x + capW * 0.18, apexY + capH, x + capW / 2, apexY + capH * 0.8]).fill(0xf2f7fb);
  g.poly([x, apexY, x + capW / 2, apexY + capH * 0.8, x + capW * 0.18, apexY + capH]).fill({ color: 0xcdddea, alpha: 0.7 });
}

// Flat-topped mesa / butte (high desert), reddish with strata lines.
function mesa(g: Graphics, x: number, base: number, h: number, w: number, lit: number, shade: number) {
  shadow(g, x, base, w * 0.55);
  const topY = base - h;
  const topW = w * 0.82;
  g.poly([x - w / 2, base, x - topW / 2, topY, x + topW / 2, topY, x + w / 2, base]).fill(shade);
  g.poly([x - w / 2, base, x - topW / 2, topY, x - topW * 0.05, topY, x - w * 0.05, base]).fill(lit);
  g.poly([x - topW / 2, topY, x + topW / 2, topY, x + topW / 2 - 3, topY - 3, x - topW / 2 + 3, topY - 3]).fill(lighten(lit, 0.12));
  g.poly([x - w * 0.42, base - h * 0.5, x + w * 0.42, base - h * 0.5]).stroke({ width: 1, color: darkenBy(shade, 0.2), alpha: 0.5 });
  g.poly([x - w * 0.38, base - h * 0.78, x + w * 0.3, base - h * 0.78]).stroke({ width: 1, color: darkenBy(shade, 0.2), alpha: 0.4 });
}

function cactus(g: Graphics, x: number, base: number, h: number) {
  const green = 0x4f8b54;
  const dk = 0x356b3c;
  shadow(g, x, base, 5);
  g.roundRect(x - 2.5, base - h, 5, h, 2.5).fill(green);
  g.roundRect(x - 2.5, base - h, 1.7, h, 1).fill(dk);
  g.roundRect(x - 7, base - h * 0.58, 4.5, 2.6, 1.2).fill(green);
  g.roundRect(x - 7, base - h * 0.58 - 6, 2.6, 8, 1.2).fill(green);
  g.roundRect(x + 2.6, base - h * 0.72, 4.5, 2.6, 1.2).fill(green);
  g.roundRect(x + 4.6, base - h * 0.72 - 7, 2.6, 9, 1.2).fill(green);
}

// Angular ice crystal / pressure-ridge shard.
function shard(g: Graphics, x: number, base: number, h: number, w: number) {
  g.poly([x - w / 2, base, x, base - h, x + w * 0.15, base - h * 0.4, x + w / 2, base]).fill(0xbfe6f5);
  g.poly([x, base - h, x + w * 0.15, base - h * 0.4, x + w / 2, base]).fill(0x9bd0e8);
  g.poly([x, base - h, x - w * 0.18, base - h * 0.5, x - w / 2, base]).fill(0xe7f6fc);
}

// --- per-terrain compositions ---
function mountainPeaks(g: Graphics, look: TileLook, pal: { top: number; side: number; detail: number }) {
  const lit = lighten(pal.top, 0.06);
  const shade = darkenBy(pal.side, 0.12);
  const big = 38 + look.v * 2.5;
  peak(g, -14 + look.jx * 0.25, 4, big * 0.6, 22, lit, shade);
  if (look.v >= 2) peak(g, 15 + look.jx * 0.25, 5, big * 0.72, 24, lit, shade);
  peak(g, 1 + look.jx * 0.25, 7, big, 34, lit, shade);
}

function mesaField(g: Graphics, look: TileLook, pal: { top: number; side: number; detail: number }): boolean {
  const lit = lighten(pal.top, 0.08);
  const shade = darkenBy(pal.side, 0.05);
  mesa(g, look.jx * 0.4, 7, 20 + look.v * 3, 30, lit, shade);
  if (look.v >= 3) mesa(g, -17 + look.jx * 0.3, 6, 12, 18, lit, shade);
  if (look.v === 1) cactus(g, 15, 8, 12);
  return true;
}

function desertFeatures(g: Graphics, look: TileLook): boolean {
  switch (look.v) {
    case 2:
      cactus(g, look.jx, 8, 16);
      return true;
    case 3:
      rock(g, look.jx, 7, 5, 0xc9a86a, 0x9a7c46);
      rock(g, look.jx + 11, 6, 3.5, 0xc9a86a, 0x9a7c46);
      return true;
    case 4:
      cactus(g, -8 + look.jx * 0.3, 8, 13);
      rock(g, 11, 6, 4, 0xc9a86a, 0x9a7c46);
      return true;
    default:
      return false; // open dune — ground ripples carry it
  }
}

function iceFeatures(g: Graphics, look: TileLook): boolean {
  switch (look.v) {
    case 2:
      shard(g, -6 + look.jx * 0.3, 7, 14, 12);
      shard(g, 7, 6, 9, 8);
      return true;
    case 3:
      pine(g, look.jx, 7, 20, 13, 0x4f7a5c, 0x32563f, true);
      return true;
    case 4:
      shard(g, 9, 7, 11, 9);
      pine(g, -8 + look.jx * 0.3, 7, 17, 11, 0x4f7a5c, 0x32563f, true);
      return true;
    default:
      return false; // smooth snowfield
  }
}

function tropicalGrove(g: Graphics, look: TileLook) {
  if (look.v >= 3) {
    palm(g, -9 + look.jx * 0.3, 8, 24);
    palm(g, 8, 7, 20);
  } else {
    palm(g, look.jx * 0.5, 8, 26);
  }
  broadleaf(g, 12, 8, 12, 11, 0x4fae5c, 0x2f7a3f);
}

function coastalFeatures(g: Graphics, look: TileLook): boolean {
  if (look.v === 4) {
    rock(g, look.jx, 6, 4.5, 0xb7b0a2, 0x827b6d);
    return true;
  }
  if (look.v === 3) {
    palm(g, look.jx * 0.5, 7, 18);
    return true;
  }
  return false; // open beach
}

function plainsFeatures(g: Graphics, look: TileLook, tile: WorldTile): boolean {
  const leaf = 0x4f9a4a;
  const leafDark = 0x356b35;
  // Highland grassland (from the elevation field) rises as an actual hill mound
  // off the flat ground; lowland grassland stays flat with trees/rocks. The
  // elevation field now only *selects* where hills appear, never the ground height.
  const hilly = (tile.elevation ?? 0) > 0.42;
  if (hilly) {
    hill(g, look.jx * 0.4, 9, 17 + look.v * 1.5, 34, look);
    return true;
  }
  switch (look.v) {
    case 2:
      broadleaf(g, look.jx, 8, 20, 16, leaf, leafDark);
      return true;
    case 3:
      broadleaf(g, -8 + look.jx * 0.3, 8, 16, 12, leaf, leafDark);
      broadleaf(g, 9, 7, 21, 15, leaf, leafDark);
      return true;
    case 4:
      rock(g, look.jx, 7, 5, 0x9aa0a6, 0x6c7176);
      return true;
    default:
      return false; // open grassland — ground blades carry it
  }
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
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const activeClub = getActiveClub(state);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layerRef = useRef<Container | null>(null);
  const readyRef = useRef(false);
  const clickRef = useRef<(gx: number, gy: number) => void>(() => {});
  const pickRef = useRef<(localX: number, localY: number) => { gx: number; gy: number } | null>(
    () => null,
  );
  const keyMoveRef = useRef<(dx: number, dy: number) => void>(() => {});
  const scoutAnimRef = useRef<{ node: Container; baseY: number } | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [logoTexture, setLogoTexture] = useState<Texture | null>(null);

  // drawScene hands the live Scout node here so the ticker can animate it.
  const registerScout = (node: Container | null, baseY: number) => {
    scoutAnimRef.current = node ? { node, baseY } : null;
  };

  // Tile picking against the raised slab. The flat iso inverse only gives a
  // rough guess because every tile top is lifted by a uniform rise, so we
  // hit-test the actual raised top-diamonds of nearby tiles and keep the
  // frontmost (highest draw order) one the click lands on.
  pickRef.current = (localX: number, localY: number) => {
    const w = state.world;
    if (!w) return null;
    const cen = centroid(w);
    const a = (localX + cen.x) / (TILE_W / 2);
    const b = (localY + cen.y) / (TILE_H / 2);
    const gxGuess = Math.round((a + b) / 2);
    const gyGuess = Math.round((b - a) / 2);
    const revealedSet = new Set(w.revealed);
    let best: { gx: number; gy: number; score: number } | null = null;
    // Raised tops sit higher on screen, so the true tile is at a larger gx+gy
    // than the flat guess; search a window biased toward the front.
    for (let gy = gyGuess - 2; gy <= gyGuess + 6; gy++) {
      for (let gx = gxGuess - 2; gx <= gxGuess + 6; gx++) {
        const tile = tileAt(w, gx, gy);
        if (!tile) continue;
        const rise =
          state.devRevealAll || revealedSet.has(tileKey(gx, gy)) ? tileRise(tile) : FOG_RISE;
        const dx = localX - (isoX(gx, gy) - cen.x);
        const dy = localY - (isoY(gx, gy) - cen.y - rise);
        if (Math.abs(dx) / (TILE_W / 2) + Math.abs(dy) / (TILE_H / 2) <= 1) {
          const score = gx + gy;
          if (!best || score > best.score) best = { gx, gy, score };
        }
      }
    }
    return best ? { gx: best.gx, gy: best.gy } : { gx: gxGuess, gy: gyGuess };
  };

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
    if (scout && scout.x === gx && scout.y === gy) {
      dispatch({ type: "SELECT_SCOUT" });
      setSelectedKey(key);
      return;
    }
    setSelectedKey(key);
  };

  // Always-fresh keyboard mover. (dx, dy) is a grid step; the selected unit
  // walks one tile if that neighbour is reachable. Direction mapping lives in
  // the keydown listener so the arrow/numpad keys read in *screen* space.
  keyMoveRef.current = (dx: number, dy: number) => {
    const w = state.world;
    if (!w) return;
    const founder = w.founder;
    if (founder && w.founderSelected && !w.hqTile) {
      const x = founder.x + dx;
      const y = founder.y + dy;
      if (moveableTilesFor(w, founder).has(tileKey(x, y))) {
        dispatch({ type: "MOVE_FOUNDING_UNIT", x, y });
        setSelectedKey(tileKey(x, y));
      }
      return;
    }
    const scout = w.scout;
    if (scout && w.scoutSelected) {
      const x = scout.x + dx;
      const y = scout.y + dy;
      if (moveableTilesFor(w, scout).has(tileKey(x, y))) {
        dispatch({ type: "MOVE_SCOUT", x, y });
        setSelectedKey(tileKey(x, y));
      }
    }
  };

  // Civ-II-style keyboard movement. Arrows move along the four *screen*
  // diagonals; the numpad adds the in-between directions (7/9/1/3). Each maps to
  // a grid step because the board is isometric (screen-up == grid -x,-y, etc.).
  useEffect(() => {
    const DIRS: Record<string, [number, number]> = {
      ArrowUp: [-1, -1],
      ArrowDown: [1, 1],
      ArrowLeft: [-1, 1],
      ArrowRight: [1, -1],
      Numpad8: [-1, -1],
      Numpad2: [1, 1],
      Numpad4: [-1, 1],
      Numpad6: [1, -1],
      Numpad7: [-1, 0],
      Numpad9: [0, -1],
      Numpad1: [0, 1],
      Numpad3: [1, 0],
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const d = DIRS[e.code];
      if (!d) return;
      e.preventDefault();
      keyMoveRef.current(d[0], d[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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
            const hit = pickRef.current(lp.x, lp.y);
            if (hit) clickRef.current(hit.gx, hit.gy);
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

        // Idle "alive" animation: the Scout gently bobs and sways so the player
        // can tell at a glance he's a unit that can be activated and moved —
        // especially when he's parked on the HQ tile.
        app.ticker.add(() => {
          const sa = scoutAnimRef.current;
          if (!sa) return;
          const t = performance.now() / 1000;
          sa.node.position.y = sa.baseY + Math.sin(t * 2.6) * 1.3;
          sa.node.rotation = Math.sin(t * 1.7) * 0.03;
        });

        drawScene(layer, state, selectedKey, logoTexture, registerScout);
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
      drawScene(layerRef.current, state, selectedKey, logoTexture, registerScout);
    }
  }, [state, selectedKey, logoTexture]);

  return (
    <div className="panel iso-panel">
      <div className="iso-map-header">
        <div>
          <h3 style={{ margin: 0 }}>Hockey World</h3>
          <div className="panel-sub" style={{ margin: 0 }}>
            Drag to pan · scroll to zoom · click a tile. Select a unit, then use
            the arrow keys (or numpad) to move it across the world.
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

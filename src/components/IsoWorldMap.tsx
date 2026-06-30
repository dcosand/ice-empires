import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import {
  Application,
  Assets,
  CanvasSource,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import type {
  GameAction,
  GameState,
  DiscoveryStateValue,
  WorldState,
  WorldTerrain,
  WorldTile,
} from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { cachedClubTexture } from "../data/clubTextures";
import type { ClubDef } from "../types/game";
import { ItemArt } from "./ItemArt";
import { REGIONS_BY_ID } from "../data/regions";
import {
  hasMesaLandform,
  hockeyOrgDisplayName,
  moveableTilesFor,
  regionIdAtTile,
  tileAt,
  tileKey,
  tileVisualRand,
  visibleTiles,
} from "../engine/world";
import {
  activeScout,
  allScouts,
  surveyableRegionId,
} from "../engine/scoutSystem";
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
  water: { top: 0x153f5e, side: 0x0d2942, detail: 0x356f95 },
};
const FOG = { top: 0x111c28, side: 0x0a1119, detail: 0x1c2b3d };
// Explored-but-not-currently-visible tiles render their real terrain, then get
// multiplied by this cool, dark tint so they read as dim "memory" — desaturated
// and bluish, with no live markers — versus full-color tiles you can see now.
const MEMORY_TINT = 0x5a6e86;
const MEMORY_ALPHA = 0.86;

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

// Synchronously read any rival-club Leader portraits already in Pixi's cache, so
// rival HQs can render their portrait on the first frame instead of waiting.
function seedRivalPortraits(
  rivals: { clubId: string }[] | undefined,
): Record<string, Texture> {
  const map: Record<string, Texture> = {};
  for (const r of rivals ?? []) {
    const club = CLUBS[r.clubId];
    if (!club) continue;
    const tex = cachedClubTexture(clubAsset(club, "leader"));
    if (tex) map[r.clubId] = tex;
  }
  return map;
}

const diamond = (h = TILE_H): number[] => [0, -h / 2, TILE_W / 2, 0, 0, h / 2, -TILE_W / 2, 0];

// Dim a display object to "explored memory": a cool, dark multiply tint plus a
// touch of transparency. Works uniformly on Graphics and Sprites (both carry
// tint/alpha), so terrain slabs, standing features, landform/vegetation sprites
// and region pins all read consistently as remembered-not-seen.
function applyMemory(obj: { tint: number; alpha: number }, memory: boolean) {
  if (!memory) return;
  obj.tint = MEMORY_TINT;
  obj.alpha = MEMORY_ALPHA;
}

// Centroid offset so the map draws centered around the world container origin.
function centroid(w: WorldState) {
  return { x: isoX((w.width - 1) / 2, (w.height - 1) / 2), y: isoY((w.width - 1) / 2, (w.height - 1) / 2) };
}

// ---- Scene drawing -------------------------------------------------------
function drawScene(
  layer: Container,
  state: GameState,
  selectedKey: string | null,
  leaderTexture: Texture | null,
  rivalPortraits: Record<string, Texture>,
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
  const scouts = allScouts(world);
  const selectedScout = activeScout(world);
  const founder = world.founder;
  const moveable =
    world.founderSelected && !world.hqTile
      ? moveableTilesFor(world, founder)
      : selectedScout
        ? moveableTilesFor(world, selectedScout)
        : new Set<string>();
  const revealedSet = new Set(world.revealed);
  const visibleSet = visibleTiles(world);

  for (let gy = 0; gy < world.height; gy++) {
    for (let gx = 0; gx < world.width; gx++) {
      const key = tileKey(gx, gy);
      const tile = tileAt(world, gx, gy)!;
      // Three fog tiers: unseen (never explored) → dark fog; explored (seen
      // before, not in current vision) → remembered terrain, dimmed, no live
      // markers; visible (in current vision) → full color and live info.
      const explored = state.devRevealAll || revealedSet.has(key);
      const visible = state.devRevealAll || visibleSet.has(key);
      const memory = explored && !visible;
      const pal = explored ? TERRAIN[tile.terrain] ?? TERRAIN.plains : FOG;
      const rise = explored ? tileRise(tile) : FOG_RISE;
      const topColor = explored ? variantTopColor(tile, pal.top) : pal.top;

      // --- extruded cliff sides (anchored at the shared ground plane) ---
      const gSide = new Graphics();
      gSide.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
      gSide.zIndex = gx + gy;
      // The top edge is lifted by a uniform `rise`; the base stays at a constant
      // depth so every revealed tile shares one flat ground plane and presents an
      // even slab edge. Each face gets a solid base color then a shared vertical
      // shade overlay for ambient-occluded depth.
      // Three flat tones down each cliff face (lit band, base, shadow base) for
      // grounded depth without a gradient.
      const leftFace = [-TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, -TILE_W / 2, BASE_THICK];
      const rightFace = [TILE_W / 2, -rise, 0, TILE_H / 2 - rise, 0, TILE_H / 2 + BASE_THICK, TILE_W / 2, BASE_THICK];
      gSide.poly(leftFace).fill(pal.side);
      gSide.poly(rightFace).fill(darken(pal.side));
      // A darker flat band along the bottom of both faces reads as ground contact.
      gSide.poly([-TILE_W / 2, BASE_THICK - 3, 0, TILE_H / 2 + BASE_THICK - 3, 0, TILE_H / 2 + BASE_THICK, -TILE_W / 2, BASE_THICK]).fill(darkenBy(pal.side, 0.35));
      gSide.poly([TILE_W / 2, BASE_THICK - 3, 0, TILE_H / 2 + BASE_THICK - 3, 0, TILE_H / 2 + BASE_THICK, TILE_W / 2, BASE_THICK]).fill(darkenBy(pal.side, 0.45));
      // A rim highlight along the slab's top edge keeps the ground plane crisp.
      if (explored) {
        gSide
          .poly([-TILE_W / 2, -rise, 0, TILE_H / 2 - rise, TILE_W / 2, -rise])
          .stroke({ width: 1, color: lighten(pal.side, 0.22), alpha: 0.5 });
      }
      applyMemory(gSide, memory);
      layer.addChild(gSide);

      // --- top face, raised by `rise` and drawn just above its own sides ---
      const gTop = new Graphics();
      gTop.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
      gTop.zIndex = gx + gy + 0.05;
      // Solid base color; the ground texture adds flat multi-tone color patches.
      gTop.poly(diamond()).fill(topColor);
      if (explored) drawGroundTexture(gTop, tile, pal, topColor);
      // Soft seam (was a hard dark grid line, which read as a board game).
      gTop.poly(diamond()).stroke({ width: 1, color: 0x0c1722, alpha: 0.12 });
      applyMemory(gTop, memory);
      if (moveable.has(key)) drawMoveHint(gTop);
      if (selectedKey === key) {
        gTop.poly(diamond()).stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 });
      }
      layer.addChild(gTop);

      // --- standing features: trees, peaks, mesas, cacti and rocks that rise
      // off the tile top so taller terrain visibly towers over flat ground.
      // Drawn as their own z-ordered object so tiles in front overlap the bases
      // of features behind them (true iso depth), exactly like the unit sprites.
      if (explored) {
        const feat = new Graphics();
        feat.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
        feat.zIndex = gx + gy + 0.1;
        if (drawStandingFeatures(feat, tile)) {
          applyMemory(feat, memory);
          layer.addChild(feat);
        } else feat.destroy();

        // Raster landforms (mountains, mesas, desert hills) as billboard sprites.
        const lf = landformSprite(tile);
        if (lf) {
          lf.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise + 8);
          lf.zIndex = gx + gy + 0.12;
          applyMemory(lf, memory);
          layer.addChild(lf);
        }
        const veg = vegetationSprite(tile);
        if (veg) {
          veg.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise + 8);
          veg.zIndex = gx + gy + 0.14;
          applyMemory(veg, memory);
          layer.addChild(veg);
        }
      }

      // ---- markers on top of the tile ----
      const regionId = regionIdAtTile(gx, gy);
      const rState = regionId ? state.discovery.regionStates[regionId] ?? "hidden" : "hidden";
      if (explored && regionId && rState !== "hidden") {
        const pin = new Graphics();
        pin.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y - rise);
        pin.zIndex = gx + gy + 0.4;
        const col = PIN_COLOR[rState];
        pin.poly([-4, -14, 4, -14, 0, -5]).fill(col);
        pin.circle(0, -20, 7).fill(col).stroke({ width: 2, color: 0x05121c });
        pin.circle(0, -20, 2.5).fill(0xffffff);
        // "Contested" is live intel — only trust it where you currently have eyes.
        if (visible && state.discovery.contested.includes(regionId)) {
          pin.circle(0, -20, 11).stroke({ width: 2, color: 0xef6f6f });
        }
        applyMemory(pin, memory);
        layer.addChild(pin);
      }

      const org = world.hockeyOrgs.find((o) => o.x === gx && o.y === gy);
      if (explored && org) {
        const mk = hockeyOrgMarker(gx, gy, c, org.archetype, hockeyOrgDisplayName(org));
        mk.position.y -= rise;
        applyMemory(mk, memory);
        layer.addChild(mk);
      }

      const pond = world.pondMarkers.find(
        (m) => !m.investigated && m.x === gx && m.y === gy,
      );
      if (explored && pond) {
        const mk = pondMarker(gx, gy, c, pond.kind);
        mk.position.y -= rise;
        applyMemory(mk, memory);
        layer.addChild(mk);
      }

      const isHQ = world.hqTile && world.hqTile.x === gx && world.hqTile.y === gy;
      if (isHQ) {
        const mk = hqMarker(gx, gy, c, accent, clubLabel, leaderTexture);
        mk.position.y -= rise;
        layer.addChild(mk);
      }

      // Rival clubs, drawn with the SAME art as the human (club-colored): the HQ
      // banner marker and the parka scout sprite. A rival HQ is a fixed landmark
      // (like a hockey org): shown on any EXPLORED tile, dimmed to "memory" when
      // out of sightline. Rival units MOVE every month, so they only render where
      // the player has CURRENT vision — never leaking live positions from memory.
      if (explored) {
        for (const rival of world.rivals) {
          const rClub = CLUBS[rival.clubId];
          const rAccent = accentNumber(rClub?.accent);
          if (rival.hqTile.x === gx && rival.hqTile.y === gy) {
            const mk = hqMarker(
              gx,
              gy,
              c,
              rAccent,
              rClub ? shortClubLabel(rClub) : "Rival",
              rivalPortraits[rival.clubId] ?? null,
            );
            mk.position.y -= rise;
            applyMemory(mk, memory);
            layer.addChild(mk);
          }
          if (!visible) continue; // live units: current sightline only
          const unitsHere = rival.units.filter((u) => u.x === gx && u.y === gy);
          for (let i = 0; i < unitsHere.length; i++) {
            const mk = scoutMarker(gx, gy, c, false, rAccent);
            mk.position.x += (i - (unitsHere.length - 1) / 2) * 10;
            mk.position.y -= rise;
            layer.addChild(mk);
          }
        }
      }

      if (founder && founder.x === gx && founder.y === gy) {
        const mk = leaderMarker(gx, gy, c, world.founderSelected, accent, leaderTexture);
        mk.position.y -= rise;
        layer.addChild(mk);
      }

      const scoutsHere = scouts.filter((s) => s.x === gx && s.y === gy);
      for (let i = 0; i < scoutsHere.length; i++) {
        const scout = scoutsHere[i];
        const mk = scoutMarker(
          gx,
          gy,
          c,
          !!scout.id && scout.id === world.selectedScoutId,
          accent,
        );
        mk.position.x += (i - (scoutsHere.length - 1) / 2) * 10;
        mk.position.y -= rise;
        // When a Scout shares the HQ tile, draw him in front of the HQ pin so
        // the player can see he's there and ready to be moved.
        if (isHQ) mk.zIndex = gx + gy + 51 + i;
        layer.addChild(mk);
        if (scout.id === world.selectedScoutId || (!world.selectedScoutId && i === 0)) {
          registerScout(mk, mk.position.y);
        }
      }
    }
  }
}

function hockeyOrgMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  archetype: string,
  label: string,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 12;
  const g = new Graphics();
  const accent =
    archetype === "academy"
      ? 0x7cc4e8
      : archetype === "junior-league"
        ? 0xc94b4b
        : archetype === "rink-society"
          ? 0x74b66d
          : 0xf0c65c;

  // Persistent neutral hockey organization: an isometric mini-district with a
  // plaza, low arena, and a few stacked civic buildings. This reads as "place"
  // on the terrain instead of a collectible icon.
  g.ellipse(0, 7, 24, 8).fill({ color: 0x000000, alpha: 0.24 });
  g.poly([-26, 2, -6, -8, 24, 2, 4, 12]).fill({ color: 0x31465b, alpha: 0.5 });
  g.poly([-21, 1, -5, -7, 19, 1, 3, 9]).fill({ color: 0xc7dce3, alpha: 0.88 }).stroke({
    width: 1,
    color: 0x203141,
    alpha: 0.5,
  });
  g.poly([-15, 0, -5, -5, 12, 0, 2, 5]).fill({ color: 0x9fc2d0, alpha: 0.75 });
  drawIsoBlock(g, -14, 3, 9, 12, 0x60747c, accent);
  drawIsoBlock(g, -5, -2, 8, 21, 0x52656d, accent);
  drawIsoBlock(g, 4, 1, 10, 16, 0x6a7d84, accent);
  drawIsoBlock(g, 13, 4, 7, 10, 0x5d7078, accent);
  // Arena roof / civic rink.
  g.ellipse(6, 2, 15, 6).fill(0xdce8ec).stroke({ width: 1.2, color: 0x263746, alpha: 0.75 });
  g.arc(6, 2, 13, Math.PI, 0).stroke({ width: 1.1, color: accent, alpha: 0.9 });
  g.rect(-23, 5, 45, 3).fill({ color: accent, alpha: 0.65 });
  m.addChild(g);

  const text = new Text({
    text: label,
    style: {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: label.length > 16 ? 9 : 10,
      fontWeight: "800",
      fill: 0xe6eef6,
      stroke: { color: 0x07111c, width: 4 },
    },
  });
  text.anchor.set(0.5, 0);
  text.position.set(0, 10);
  m.addChild(text);
  return m;
}

function drawIsoBlock(g: Graphics, x: number, y: number, w: number, h: number, body: number, accent: number) {
  const d = 4;
  const roof = lighten(body, 0.18);
  const side = darkenBy(body, 0.18);
  g.poly([x, y - h, x + w, y - h - d, x + w + d, y - h, x + d, y + d - h]).fill(roof);
  g.poly([x, y - h, x + d, y + d - h, x + d, y, x, y]).fill(body);
  g.poly([x + d, y + d - h, x + w + d, y - h, x + w + d, y, x + d, y]).fill(side);
  g.poly([x, y - h, x + w, y - h - d, x + w + d, y - h, x + w + d, y, x + d, y, x, y]).stroke({
    width: 0.8,
    color: 0x24303a,
    alpha: 0.55,
  });
  for (let yy = y - h + 4; yy < y - 1; yy += 5) {
    g.rect(x + 2, yy, 2, 2).fill({ color: 0xe8d68a, alpha: 0.72 });
    if (w > 8) g.rect(x + 6, yy, 2, 2).fill({ color: 0xe8d68a, alpha: 0.55 });
  }
  g.rect(x + 1, y - h + 1, Math.max(3, w - 2), 1).fill({ color: accent, alpha: 0.75 });
}

function pondMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  kind: string,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 0.45;
  const g = new Graphics();
  const accent =
    kind === "equipment"
      ? 0x8fb2c8
      : kind === "local-believer"
        ? 0x74b66d
        : kind === "mishap"
          ? 0xb65f4b
          : kind === "rumor"
            ? 0xd8c46d
            : 0xb98655;

  // Goodie hut as human activity: campfire, logs, smoke, bedroll/crate. It is
  // deliberately simpler than a rink because the tile footprint is tiny.
  g.ellipse(0, 5, 17, 6).fill({ color: 0x000000, alpha: 0.22 });
  g.poly([-13, 4, -4, 0, 10, 4, 1, 8]).fill({ color: 0x2a3b42, alpha: 0.28 });
  g.roundRect(7, 1, 9, 5, 1.5).fill(darkenBy(accent, 0.12)).stroke({ width: 1, color: 0x1b2b3b, alpha: 0.55 });
  g.poly([7, 1, 11, -2, 16, 1]).fill(lighten(accent, 0.12)).stroke({ width: 0.8, color: 0x1b2b3b, alpha: 0.45 });
  // Crossed logs.
  g.roundRect(-9, 3, 16, 3, 1.5).fill(0x6e4a2c);
  g.roundRect(-7, -1, 15, 3, 1.5).fill(0x815833);
  g.poly([-8, 2, 7, 6]).stroke({ width: 3, color: 0x4d321d, alpha: 0.75 });
  g.poly([7, 2, -8, 6]).stroke({ width: 3, color: 0x4d321d, alpha: 0.75 });
  // Flame with type-colored outer glow and hot core.
  g.circle(0, 2, 8).fill({ color: accent, alpha: 0.18 });
  g.poly([-5, 3, -2, -7, 1, -2, 4, -10, 6, 3]).fill(0xd85d2f);
  g.poly([-3, 3, 0, -4, 3, 3]).fill(0xffc857);
  g.poly([-1, 2, 1, -1, 2, 2]).fill(0xfff2b0);
  // Smoke curls, light enough to stay subtle over any terrain.
  g.poly([-1, -10, -4, -16, -1, -21, 2, -25]).stroke({ width: 1.4, color: 0xc5d0d2, alpha: 0.48 });
  g.poly([3, -9, 7, -15, 5, -20, 9, -24]).stroke({ width: 1.1, color: 0xc5d0d2, alpha: 0.32 });
  g.poly([-12, 6, -8, 9, -3, 8]).stroke({ width: 1.2, color: 0xa7d8e8, alpha: 0.55 });
  m.addChild(g);
  return m;
}

// The Leader: the club's chosen figure, shown as their actual leader.png portrait
// in a team-colored ring, mounted on a small stand on the tile. Billboard-style
// so it stays upright and crisp at any zoom.
function leaderMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  selected: boolean | undefined,
  accent: number,
  leaderTexture: Texture | null,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 0.65;

  const cy = -28; // portrait centre height above the tile
  const R = 16; // portrait radius

  const base = new Graphics();
  base.ellipse(0, 1, 12, 4).fill({ color: 0x000000, alpha: 0.35 });
  if (selected) base.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  base.roundRect(-2.5, cy, 5, -cy - 2, 2).fill(0x2a3645); // stand from ground to portrait
  base.circle(0, cy, R + 2).fill(0x0f1824); // disc backing + ring
  m.addChild(base);

  if (leaderTexture) {
    const sp = new Sprite(leaderTexture);
    // Bias the anchor upward so the face (top-centre of most portraits) sits in
    // the disc rather than the chest.
    sp.anchor.set(0.5, 0.42);
    const s = (R * 2) / Math.min(leaderTexture.width, leaderTexture.height); // cover
    sp.scale.set(s);
    sp.position.set(0, cy);
    const mask = new Graphics();
    mask.circle(0, cy, R).fill(0xffffff);
    m.addChild(mask);
    sp.mask = mask;
    m.addChild(sp);
  } else {
    const fb = new Graphics();
    fb.circle(0, cy, R - 2).fill(0xe7b48b).stroke({ width: 1, color: 0xc8946a });
    fb.circle(-4, cy - 1, 1).fill(0x2a2320);
    fb.circle(4, cy - 1, 1).fill(0x2a2320);
    m.addChild(fb);
  }

  // Team-colored rim drawn on top so the border stays crisp over the portrait.
  const rim = new Graphics();
  rim.circle(0, cy, R).stroke({ width: selected ? 3 : 2.5, color: selected ? 0xffffff : accent });
  rim.circle(0, cy, R + 2).stroke({ width: 2, color: accent });
  m.addChild(rim);

  return m;
}

function hqMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  accent: number,
  label: string,
  portraitTexture: Texture | null,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  // HQ is a key landmark and carries a name label that hangs below the pin, so
  // keep the whole marker above neighbouring tile tops (which would otherwise
  // paint over the lower half of the label).
  m.zIndex = gx + gy + 50;

  const cy = -23; // medallion centre height above the tile
  const R = 13; // portrait radius (sits inside the 17px disc backing)

  const base = new Graphics();
  base.ellipse(0, 1, 20, 7).fill({ color: 0x000000, alpha: 0.35 });
  base.poly([-18, 0, 0, 9, 18, 0, 0, -9]).fill(0x05121c).stroke({ width: 2, color: accent });
  base.circle(0, cy, 17).fill(0x0f1824).stroke({ width: 3, color: accent });
  base.rect(16, -45, 2, 23).fill(0xe6eef6);
  base.poly([18, -45, 34, -40, 18, -35]).fill(accent).stroke({ width: 1.5, color: 0x05121c });
  m.addChild(base);

  // The club's Leader portrait sits in the HQ medallion (same image shown at
  // founding), masked into the disc and biased to the face.
  if (portraitTexture) {
    const sp = new Sprite(portraitTexture);
    sp.anchor.set(0.5, 0.42);
    const s = (R * 2) / Math.min(portraitTexture.width, portraitTexture.height); // cover
    sp.scale.set(s);
    sp.position.set(0, cy);
    const mask = new Graphics();
    mask.circle(0, cy, R).fill(0xffffff);
    m.addChild(mask);
    sp.mask = mask;
    m.addChild(sp);
    const rim = new Graphics();
    rim.circle(0, cy, R).stroke({ width: 2, color: accent });
    m.addChild(rim);
  } else {
    const fallback = new Graphics();
    fallback.circle(0, cy, R).fill(0xe7b48b).stroke({ width: 1.5, color: accent });
    fallback.circle(-4, cy - 1, 1.4).fill(0x2a2320);
    fallback.circle(4, cy - 1, 1.4).fill(0x2a2320);
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
  // Open ocean stays a single uniform deep blue — no per-tile variation.
  if (tile.terrain === "water") return base;
  if (tile.feature === "river" || tile.feature === "pond") return mixColor(base, 0x7dd3fc, 0.1);
  if (tile.feature === "lake") return mixColor(base, 0x2f6f9e, 0.38);
  const amt = [-0.08, 0.04, 0.1, -0.03][v] ?? 0;
  return amt >= 0 ? lighten(base, amt) : darkenBy(base, Math.abs(amt));
}

// A tile the selected unit can step to: a soft inset diamond that traces the
// tile shape (echoing the white selection outline) instead of busy arrows.
function drawMoveHint(g: Graphics) {
  const w = TILE_W * 0.6;
  const h = TILE_H * 0.6;
  const ring = [0, -h / 2, w / 2, 0, 0, h / 2, -w / 2, 0];
  g.poly(ring)
    .fill({ color: 0x7dd3fc, alpha: 0.1 })
    .stroke({ width: 1.5, color: 0x7dd3fc, alpha: 0.7 });
}

// Per-tile deterministic randomness. Lets every tile pick a stable variant and
// orientation purely from its (x, y) — no change to world generation needed.
// Two same-terrain tiles still differ because they seed different variants and
// mirroring. salt selects an independent stream (variant / mirror / jitter).
function tileRand(x: number, y: number, salt: number): number {
  return tileVisualRand(x, y, salt);
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

// Flat patches of nearby tone, kept inside the diamond, so a tile carries 4-5
// colors instead of one flat fill. Deterministic per tile via `v`.
function dapple(g: Graphics, base: number, v: number) {
  const patches: [number, number, number, number, number][] = [
    // x, y, rx, ry, toneAmt (+lighten / -darken) — sized to stay inside the diamond
    [-8, -2, 13, 5, 0.1],
    [8, 4, 11, 4, -0.11],
    [2, -6, 9, 3.5, 0.06],
    [-6, 6, 9, 3, -0.07],
    [13, -2, 6, 2.5, 0.04],
  ];
  patches.forEach((p, i) => {
    if ((i + v) % 3 === 2) return; // vary which patches appear per tile
    const col = p[4] >= 0 ? lighten(base, p[4]) : darkenBy(base, -p[4]);
    g.ellipse(p[0], p[1], p[2], p[3]).fill({ color: col, alpha: 0.5 });
  });
}

// ---- Flat ground cover (painted onto the tile's top diamond) --------------
function drawGroundTexture(
  g: Graphics,
  tile: WorldTile,
  pal: { top: number; side: number; detail: number },
  topColor: number,
) {
  const { v } = tileLook(tile);
  // Multi-tone dapple on solid land (not open water, not bare rock).
  if (tile.terrain !== "water" && tile.terrain !== "mountain") dapple(g, topColor, v);
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
  // Waves only on a minority of tiles so most of the ocean stays calm and flat.
  if (v !== 0) return;
  g.poly([-16, -3, -5, -6, 6, -3, 16, -6]).stroke({ width: 1.5, color, alpha: 0.4 });
  g.poly([-10, 6, 2, 3, 13, 6]).stroke({ width: 1.3, color, alpha: 0.3 });
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
function drawStandingFeatures(g: Graphics, tile: WorldTile): boolean {
  const look = tileLook(tile);
  if (look.mirror) g.scale.x = -1;

  switch (tile.terrain) {
    case "water":
      return false; // open ocean — nothing stands on it (waves are ground cover)
    case "mountain":
    case "high-desert":
      return false; // drawn as raster landform sprites (see landformSprite)
    case "desert":
      return desertFeatures(g, look);
    case "ice":
      return iceFeatures(g, look);
    case "tropical":
      return false; // raster palms/groves are drawn as sprites.
    case "coastal":
      return coastalFeatures(g, look);
    case "plains":
    default:
      return plainsFeatures(g, look);
  }
}

// --- reusable props ---
function shadow(g: Graphics, x: number, base: number, w: number) {
  g.ellipse(x, base, w, w * 0.32).fill({ color: 0x000000, alpha: 0.18 });
}

// Rounded boulder with a lit top-left face and shadowed right face.
function rock(g: Graphics, x: number, base: number, s: number, lit: number, shade: number) {
  shadow(g, x, base, s * 1.1);
  g.poly([x - s, base, x - s * 0.6, base - s * 0.9, x + s * 0.2, base - s, x + s, base - s * 0.3, x + s * 0.7, base]).fill(shade);
  g.poly([x - s, base, x - s * 0.6, base - s * 0.9, x + s * 0.2, base - s, x - s * 0.1, base]).fill(lit);
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

// ===========================================================================
// Procedural raster landforms and foliage
// ---------------------------------------------------------------------------
// Painted once to an offscreen Canvas2D — which gives real soft gradients, blur
// shadows, organic curved silhouettes and grain that flat vector polygons can't
// — then cached as a high-DPI Pixi texture and placed as a billboard Sprite.
// This is the "richer art" path; ground marks remain vector, standing organic
// features move here as the visual style matures.
// ===========================================================================
type Ctx = CanvasRenderingContext2D;
const landformCache = new Map<string, Texture>();

function landformTexture(
  key: string,
  w: number,
  h: number,
  paint: (ctx: Ctx, w: number, h: number) => void,
): Texture {
  const hit = landformCache.get(key);
  if (hit) return hit;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(w * dpr);
  canvas.height = Math.ceil(h * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  paint(ctx, w, h);
  // resolution = dpr so the texture reports logical (w,h) and a Sprite renders
  // at the intended size while staying crisp on retina.
  const tex = new Texture({ source: new CanvasSource({ resource: canvas, resolution: dpr }) });
  landformCache.set(key, tex);
  return tex;
}

// Scatter faint dark/light specks for rock/soil grain (deterministic).
function grain(ctx: Ctx, x0: number, y0: number, w: number, h: number, count: number) {
  for (let i = 0; i < count; i++) {
    const r = ((i * 2654435761) >>> 0) / 4294967295;
    const r2 = ((i * 40503 + 12345) >>> 0) / 4294967295;
    const r3 = ((i * 2246822519) >>> 0) / 4294967295;
    const px = x0 + r * w;
    const py = y0 + r2 * h;
    ctx.fillStyle = r3 > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(px, py, 1, 1);
  }
}

function softBaseShadow(ctx: Ctx, w: number, h: number) {
  const g = ctx.createRadialGradient(w / 2, h - 5, 2, w / 2, h - 5, w * 0.4);
  g.addColorStop(0, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 16, w, 16);
}

// One organic, curved peak with rock gradient, directional shadow and optional
// soft snow cap. cx/baseY in canvas space; peakH up, peakW wide.
function paintPeak(
  ctx: Ctx,
  cx: number,
  baseY: number,
  peakH: number,
  peakW: number,
  lean: number,
  snow: boolean,
) {
  const apexX = cx + lean;
  const apexY = baseY - peakH;
  const left = cx - peakW / 2;
  const right = cx + peakW / 2;

  ctx.beginPath();
  ctx.moveTo(left, baseY);
  ctx.quadraticCurveTo(cx - peakW * 0.22, baseY - peakH * 0.55, apexX - peakW * 0.05, apexY + peakH * 0.05);
  ctx.lineTo(apexX, apexY);
  ctx.quadraticCurveTo(cx + peakW * 0.24, baseY - peakH * 0.5, right, baseY);
  ctx.closePath();

  const rock = ctx.createLinearGradient(0, apexY, 0, baseY);
  rock.addColorStop(0, "#828b8f");
  rock.addColorStop(0.5, "#69726f");
  rock.addColorStop(1, "#525a57");
  ctx.fillStyle = rock;
  ctx.fill();

  // Directional shadow on the right (SE) flank.
  ctx.save();
  ctx.clip();
  const sh = ctx.createLinearGradient(apexX, 0, right, 0);
  sh.addColorStop(0, "rgba(20,26,30,0)");
  sh.addColorStop(1, "rgba(20,26,30,0.26)");
  ctx.fillStyle = sh;
  ctx.fillRect(left, apexY, peakW, peakH);
  grain(ctx, left, apexY, peakW, peakH, Math.round(peakW * 1.2));
  // A couple of soft crevasse striations.
  ctx.strokeStyle = "rgba(0,0,0,0.16)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(apexX - peakW * 0.02, apexY + peakH * 0.12);
  ctx.quadraticCurveTo(cx, baseY - peakH * 0.4, cx + peakW * 0.16, baseY - peakH * 0.05);
  ctx.stroke();
  ctx.restore();

  if (snow) {
    const sy = apexY + peakH * 0.2;
    ctx.beginPath();
    ctx.moveTo(apexX - peakW * 0.14, sy);
    ctx.quadraticCurveTo(apexX - peakW * 0.05, sy - peakH * 0.09, apexX - peakW * 0.01, sy - peakH * 0.02);
    ctx.quadraticCurveTo(apexX + peakW * 0.03, sy - peakH * 0.1, apexX + peakW * 0.08, sy - peakH * 0.03);
    ctx.quadraticCurveTo(apexX + peakW * 0.12, sy + peakH * 0.03, apexX + peakW * 0.14, sy + peakH * 0.01);
    ctx.lineTo(apexX, apexY);
    ctx.closePath();
    const snowG = ctx.createLinearGradient(0, apexY, 0, sy);
    snowG.addColorStop(0, "#eef2f6");
    snowG.addColorStop(1, "#c8d4e0");
    ctx.fillStyle = snowG;
    ctx.fill();
  }
}

// A rounded, curved mound (foothill / desert hill) with a smooth light→dark
// vertical gradient — no hard facets.
function paintMound(ctx: Ctx, cx: number, baseY: number, hgt: number, wid: number, top: string, bottom: string, dark: string) {
  ctx.beginPath();
  ctx.moveTo(cx - wid / 2, baseY);
  ctx.bezierCurveTo(cx - wid * 0.42, baseY - hgt * 1.05, cx + wid * 0.12, baseY - hgt * 1.08, cx + wid * 0.22, baseY - hgt * 0.78);
  ctx.bezierCurveTo(cx + wid * 0.3, baseY - hgt * 0.55, cx + wid * 0.5, baseY - hgt * 0.18, cx + wid / 2, baseY);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, baseY - hgt, 0, baseY);
  g.addColorStop(0, top);
  g.addColorStop(0.6, bottom);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  grain(ctx, cx - wid / 2, baseY - hgt, wid, hgt, Math.round(wid));
  ctx.restore();
}

function paintMountain(ctx: Ctx, w: number, h: number, tier: string, variant: number) {
  softBaseShadow(ctx, w, h);
  const base = h - 4;
  const cx = w / 2;
  const lean = (variant - 1) * 2;
  if (tier === "foothill") {
    paintMound(ctx, cx + 7, base, h * 0.36, w * 0.6, "#77866a", "#647354", "#4d5942");
    paintMound(ctx, cx - 6, base, h * 0.48, w * 0.62, "#828c78", "#6a7958", "#505d44");
  } else if (tier === "mid") {
    paintMound(ctx, cx - 10, base, h * 0.34, w * 0.44, "#7b8580", "#626b67", "#505753");
    paintPeak(ctx, cx + 4 + lean, base, h * 0.62, w * 0.52, lean, variant === 2);
  } else {
    // high peak — a back ridge plus a dominant (sometimes snow-capped) summit
    paintPeak(ctx, cx - w * 0.2, base, h * 0.48, w * 0.4, -2, false);
    if (variant >= 1) paintPeak(ctx, cx + w * 0.22, base, h * 0.52, w * 0.42, 2, false);
    paintPeak(ctx, cx + lean, base, h * 0.72, w * 0.5, lean, true);
  }
}

function paintMesa(ctx: Ctx, w: number, h: number, variant: number) {
  softBaseShadow(ctx, w, h);
  const base = h - 4;
  const cx = w / 2;
  const towers =
    variant === 0
      ? [
          { x: -13, bw: 15, tw: 8, ht: 26 },
          { x: 3, bw: 27, tw: 21, ht: 23 },
          { x: 18, bw: 11, tw: 6, ht: 18 },
        ]
      : variant === 1
        ? [
            { x: -18, bw: 11, tw: 6, ht: 27 },
            { x: -2, bw: 18, tw: 10, ht: 31 },
            { x: 15, bw: 13, tw: 7, ht: 21 },
          ]
        : [
            { x: -16, bw: 24, tw: 18, ht: 22 },
            { x: 6, bw: 10, tw: 5, ht: 30 },
            { x: 19, bw: 15, tw: 8, ht: 24 },
          ];

  for (const [i, t] of towers.entries()) {
    paintMesaTower(ctx, cx + t.x, base - (i === 0 ? 1 : 0), t.bw, t.tw, t.ht, variant + i);
  }
}

function paintMesaTower(ctx: Ctx, cx: number, base: number, baseW: number, topW: number, height: number, variant: number) {
  const topY = base - height;
  const halfB = baseW / 2;
  const halfT = topW / 2;
  // Body with smooth light-to-dark vertical shading and slightly uneven sides.
  ctx.beginPath();
  ctx.moveTo(cx - halfB, base);
  ctx.quadraticCurveTo(cx - halfB * 0.78, base - height * 0.52, cx - halfT, topY);
  ctx.quadraticCurveTo(cx, topY - 2.5, cx + halfT, topY);
  ctx.quadraticCurveTo(cx + halfB * 0.72, base - height * 0.48, cx + halfB, base);
  ctx.closePath();
  const body = ctx.createLinearGradient(0, topY, 0, base);
  body.addColorStop(0, variant % 2 === 0 ? "#c99a66" : "#bd8759");
  body.addColorStop(0.55, "#9a6541");
  body.addColorStop(1, "#70442b");
  ctx.fillStyle = body;
  ctx.fill();

  ctx.save();
  ctx.clip();
  const sh = ctx.createLinearGradient(cx, 0, cx + halfB, 0);
  sh.addColorStop(0, "rgba(40,22,10,0)");
  sh.addColorStop(1, "rgba(40,22,10,0.28)");
  ctx.fillStyle = sh;
  ctx.fillRect(cx - halfB, topY, baseW, height);
  ctx.strokeStyle = "rgba(70,40,20,0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 2; i++) {
    const yy = topY + (height * (i + 1)) / 4;
    ctx.beginPath();
    ctx.moveTo(cx - halfB * 0.82, yy);
    ctx.quadraticCurveTo(cx, yy + ((variant + i) % 2 === 0 ? -1.2 : 1.2), cx + halfB * 0.8, yy);
    ctx.stroke();
  }
  grain(ctx, cx - halfB, topY, baseW, height, Math.round(baseW * 1.8));
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(cx - halfT, topY);
  ctx.quadraticCurveTo(cx, topY - 2.5, cx + halfT, topY);
  ctx.quadraticCurveTo(cx, topY + 2, cx - halfT, topY);
  ctx.fillStyle = variant % 2 === 0 ? "#d4aa75" : "#c99664";
  ctx.fill();
}

function paintDesertHill(ctx: Ctx, w: number, h: number, variant: number) {
  softBaseShadow(ctx, w, h);
  const base = h - 4;
  const cx = w / 2;
  const shift = (variant - 1) * 4;
  paintMound(ctx, cx + 7 + shift, base, h * (0.38 + variant * 0.035), w * 0.54, "#d3b275", "#b89050", "#8f6b3a");
  paintMound(ctx, cx - 8 + shift * 0.5, base, h * (0.46 + variant * 0.035), w * 0.58, "#dcc183", "#be9956", "#98733f");
}

// Map a mountain tile to a tier + variant. Elevation (narrow high band) plus a
// per-tile roll give a gradual foothill→peak buildup across a range.
function mountainTier(tile: WorldTile): { tier: string; variant: number } {
  const e = tile.elevation ?? 0.95;
  const roll = tileRand(tile.x, tile.y, 9);
  const hf = Math.min(1, Math.max(0, (e - 1.0) / 0.12)) * 0.6 + roll * 0.4;
  const variant = Math.floor(tileRand(tile.x, tile.y, 12) * 3);
  const tier = hf < 0.46 ? "foothill" : hf < 0.82 ? "mid" : "peak";
  return { tier, variant };
}

const MTN_SIZE: Record<string, [number, number]> = {
  foothill: [76, 38],
  mid: [90, 56],
  peak: [108, 72],
};

// Build the billboard Sprite for a raster landform tile (or null for others).
function landformSprite(tile: WorldTile): Sprite | null {
  const look = tileLook(tile);
  if (tile.terrain === "mountain") {
    const { tier, variant } = mountainTier(tile);
    const [w, h] = MTN_SIZE[tier];
    const tex = landformTexture(`mtn-${tier}-${variant}`, w, h, (c) => paintMountain(c, w, h, tier, variant));
    const sp = new Sprite(tex);
    sp.anchor.set(0.5, 1);
    sp.alpha = 0.96;
    if (look.mirror) sp.scale.x = -1;
    return sp;
  }
  if (tile.terrain === "high-desert") {
    // Mesas are rare landmarks; desert hills are intermittent so high-desert
    // doesn't become a repeating field of rounded bubbles.
    const isMesa = hasMesaLandform(tile);
    const hasHill = tileRand(tile.x, tile.y, 18) < 0.34;
    if (!isMesa && !hasHill) return null;
    const variant = look.v % 3;
    const sp = isMesa
      ? new Sprite(landformTexture(`mesa-spires-${variant}`, 66, 46, (c) => paintMesa(c, 66, 46, variant)))
      : new Sprite(landformTexture(`dhill-${variant}`, 62, 30, (c) => paintDesertHill(c, 62, 30, variant)));
    sp.anchor.set(0.5, 1);
    sp.alpha = isMesa ? 0.94 : 0.86;
    if (look.mirror) sp.scale.x = -1;
    return sp;
  }
  return null;
}

function treeShadow(ctx: Ctx, x: number, base: number, w: number) {
  const g = ctx.createRadialGradient(x, base, 1, x, base, w * 0.58);
  g.addColorStop(0, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - w * 0.65, base - 5, w * 1.3, 10);
}

function drawBroadleafTree(ctx: Ctx, x: number, base: number, w: number, h: number, variant: number) {
  treeShadow(ctx, x, base, w);
  const treeH = h;
  const trunkH = treeH * 0.35;
  const canopyR = w * 0.2;
  const canopyY = base - treeH * 0.62;
  const trunk = ctx.createLinearGradient(x - 1.8, base - trunkH, x + 1.8, base);
  trunk.addColorStop(0, "#7b5a36");
  trunk.addColorStop(1, "#4d3722");
  ctx.fillStyle = trunk;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.055, base);
  ctx.lineTo(x - w * 0.038, base - trunkH);
  ctx.lineTo(x + w * 0.052, base - trunkH);
  ctx.lineTo(x + w * 0.065, base);
  ctx.closePath();
  ctx.fill();

  const canopy = ctx.createRadialGradient(x - w * 0.13, canopyY - h * 0.1, 2, x, canopyY, canopyR * 2.15);
  canopy.addColorStop(0, "#8da466");
  canopy.addColorStop(0.58, "#607d4c");
  canopy.addColorStop(1, "#3d5e37");
  ctx.fillStyle = canopy;
  const blobs = [
    [-0.2, -0.06, 0.9],
    [0.06, -0.18, 1.0],
    [0.26, 0.04, 0.82],
    [0.02, 0.18, 1.05],
    [-0.34, 0.13, 0.72],
  ];
  for (const [dx, dy, r] of blobs) {
    ctx.beginPath();
    ctx.arc(x + dx * w, canopyY + dy * h + (variant % 2), canopyR * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(195,210,130,0.13)";
  ctx.beginPath();
  ctx.arc(x - w * 0.16, canopyY - h * 0.19, canopyR * 0.44, 0, Math.PI * 2);
  ctx.fill();
}

function paintBroadleafGrove(ctx: Ctx, w: number, h: number, variant: number) {
  const base = h - 4;
  drawBroadleafTree(ctx, w * 0.38, base - 3, 17, 23, variant);
  if (variant !== 0) drawBroadleafTree(ctx, w * 0.62, base - 2, 16, 21, variant + 1);
  drawBroadleafTree(ctx, w * 0.52, base, 20, 26, variant + 2);
  grain(ctx, w * 0.16, h * 0.18, w * 0.66, h * 0.68, 20);
}

function drawPineTree(ctx: Ctx, x: number, base: number, w: number, h: number, variant: number, snow: boolean) {
  treeShadow(ctx, x, base, w);
  ctx.fillStyle = "#5c4129";
  const trunkH = h * 0.28;
  ctx.fillRect(x - w * 0.055, base - trunkH, w * 0.11, trunkH);
  const tiers = 4;
  for (let i = 0; i < tiers; i++) {
    const ty = base - h * 0.13 - i * h * 0.16;
    const tw = w * (0.62 - i * 0.08) + variant * 0.6;
    const th = h * 0.25;
    const grad = ctx.createLinearGradient(x - tw / 2, ty - th, x + tw / 2, ty);
    grad.addColorStop(0, snow ? "#63816e" : "#4f7659");
    grad.addColorStop(1, snow ? "#2e4f3d" : "#203f2f");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x - tw / 2, ty);
    ctx.lineTo(x, ty - th);
    ctx.lineTo(x + tw / 2, ty);
    ctx.closePath();
    ctx.fill();
    if (snow && i >= 2) {
      ctx.fillStyle = "rgba(238,246,250,0.82)";
      ctx.beginPath();
      ctx.moveTo(x - tw * 0.18, ty - th * 0.52);
      ctx.lineTo(x, ty - th);
      ctx.lineTo(x + tw * 0.18, ty - th * 0.52);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function paintPineGrove(ctx: Ctx, w: number, h: number, variant: number, snow: boolean) {
  const base = h - 4;
  drawPineTree(ctx, w * 0.34, base - 2, 18, 30, variant, snow);
  drawPineTree(ctx, w * 0.58, base - 1, 16, 27, variant + 1, snow);
  if (variant !== 1) drawPineTree(ctx, w * 0.48, base, 20, 34, variant + 2, snow);
  grain(ctx, w * 0.24, h * 0.18, w * 0.56, h * 0.64, 18);
}

function drawPalmTree(ctx: Ctx, x: number, base: number, w: number, h: number, variant: number) {
  treeShadow(ctx, x, base, w * 0.7);
  const lean = (variant % 3) - 1;
  const palmH = h * (0.58 + (variant % 2) * 0.04);
  const topX = x + w * (0.09 + lean * 0.035);
  const topY = base - palmH;

  ctx.strokeStyle = "#8a6840";
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - 1.6 + lean, base - palmH * 0.52, topX, topY);
  ctx.stroke();

  ctx.strokeStyle = "rgba(58,39,22,0.48)";
  ctx.lineWidth = 1.1;
  for (let i = 1; i <= 3; i++) {
    const yy = base - (palmH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x - 1.5 + lean * 0.2, yy);
    ctx.lineTo(x + 1.6 + lean * 0.4, yy - 1);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4f3a23";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 0.9, base - 1);
  ctx.quadraticCurveTo(x - 0.1 + lean * 0.5, base - palmH * 0.5, topX + 0.8, topY);
  ctx.stroke();

  const fronds = [
    { a: -2.95, len: 0.5, curl: 5 },
    { a: -2.38, len: 0.55, curl: 3 },
    { a: -1.68, len: 0.48, curl: -1 },
    { a: -0.78, len: 0.52, curl: -1 },
    { a: -0.14, len: 0.55, curl: 3 },
    { a: 0.48, len: 0.46, curl: 5 },
  ];
  for (let i = 0; i < fronds.length; i++) {
    const { a, len, curl } = fronds[i];
    const reach = w * len;
    const ex = topX + Math.cos(a) * reach;
    const ey = topY + Math.sin(a) * h * 0.28 + curl;
    const mx = (topX + ex) / 2;
    const my = (topY + ey) / 2 + curl * 0.35;
    const blade = ctx.createLinearGradient(topX, topY, ex, ey);
    blade.addColorStop(0, "#77bd65");
    blade.addColorStop(0.52, "#4f9350");
    blade.addColorStop(1, "#2f6d3f");
    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx - Math.sin(a) * 2.6, my - Math.cos(a) * 2.1, ex, ey);
    ctx.quadraticCurveTo(mx + Math.sin(a) * 2.1, my + Math.cos(a) * 1.7, topX, topY);
    ctx.fill();
    ctx.strokeStyle = "rgba(39,88,46,0.32)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
  }

  ctx.fillStyle = "#6b4b25";
  ctx.beginPath();
  ctx.arc(topX - 1.5, topY + 2.5, 1.3, 0, Math.PI * 2);
  ctx.arc(topX + 1.8, topY + 3, 1.3, 0, Math.PI * 2);
  ctx.fill();
}

function paintPalmGrove(ctx: Ctx, w: number, h: number, variant: number) {
  const base = h - 4;
  drawPalmTree(ctx, w * 0.39, base - 1, 30, 34, variant);
  drawPalmTree(ctx, w * 0.6, base, 24, 29, variant + 1);
  if (variant === 2) drawPalmTree(ctx, w * 0.5, base + 1, 20, 25, variant + 2);
}

function vegetationSprite(tile: WorldTile): Sprite | null {
  const look = tileLook(tile);
  const roll = tileRand(tile.x, tile.y, 23);
  let sp: Sprite | null = null;

  if (tile.terrain === "tropical" && roll < 0.22) {
    const v = look.v % 3;
    sp = new Sprite(landformTexture(`palm-grove-${v}`, 48, 38, (c) => paintPalmGrove(c, 48, 38, v)));
    sp.alpha = 0.94;
  } else if (tile.terrain === "coastal" && roll < 0.03 && tile.feature !== "river") {
    const v = look.v % 3;
    sp = new Sprite(landformTexture(`shore-palm-${v}`, 42, 34, (c) => paintPalmGrove(c, 42, 34, v)));
    sp.alpha = 0.9;
  } else if (tile.terrain === "ice" && roll < 0.1) {
    const v = look.v % 3;
    sp = new Sprite(landformTexture(`pine-snow-grove-${v}`, 50, 42, (c) => paintPineGrove(c, 50, 42, v, true)));
    sp.alpha = 0.9;
  } else if (tile.terrain === "plains" && roll < 0.15) {
    const v = look.v % 3;
    const pineMix = tile.elevation && tile.elevation > 0.54 && roll < 0.08;
    sp = pineMix
      ? new Sprite(landformTexture(`pine-grove-${v}`, 50, 42, (c) => paintPineGrove(c, 50, 42, v, false)))
      : new Sprite(landformTexture(`broadleaf-grove-${v}`, 44, 34, (c) => paintBroadleafGrove(c, 44, 34, v)));
    sp.alpha = 0.9;
  }

  if (!sp) return null;
  sp.anchor.set(0.5, 1);
  if (look.mirror) sp.scale.x = -1;
  return sp;
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
    case 4:
      shard(g, 9, 7, 11, 9);
      return true;
    default:
      return false; // smooth snowfield
  }
}

function coastalFeatures(g: Graphics, look: TileLook): boolean {
  if (look.v === 4) {
    rock(g, look.jx, 6, 4.5, 0xb7b0a2, 0x827b6d);
    return true;
  }
  return false; // open beach
}

function plainsFeatures(g: Graphics, look: TileLook): boolean {
  switch (look.v) {
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

// The Scout: a standard-bearer for the club's expedition. He's bundled in a
// team-colored, fur-trimmed parka, one mittened hand shading his brow as he
// scans the horizon while the other grips a tall banner pole planted in the
// snow. Team identity is carried by the parka + flag colors (a crest is too
// small to read at map zoom). Drawn billboard-style (facing camera) as vector
// art so it stays crisp at any zoom; `accent` is the club color.
const SKIN = 0xe7b48b;
const SKIN_SHADE = 0xc8946a;
const FUR = 0xe9ddc6;
const FUR_SHADE = 0xc9bca0;
const BOOT = 0x20242c;
const SNOWPANT = 0x3a4654;
const POLE = 0x6b4a2c;
const POLE_LT = 0x9a7240;
const BRASS_DK = 0x8c6d2c;
const BRASS_LT = 0xe6cf86;
const EYE = 0x23201d;

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
  const parkaLight = lighten(accent, 0.34);

  // selected ground ring + contact shadow
  if (selected) {
    s.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  s.ellipse(0, 1, 11, 4).fill({ color: 0x000000, alpha: 0.35 });

  // --- banner pole planted in the snow (drawn first, behind the scout) ---
  s.roundRect(12.6, -53, 2.4, 56, 1).fill(POLE);
  s.roundRect(12.6, -53, 1, 56, 1).fill({ color: POLE_LT, alpha: 0.8 }); // pole highlight
  s.circle(13.8, -54, 2).fill(BRASS_LT).stroke({ width: 0.8, color: BRASS_DK }); // finial
  s.ellipse(13.8, 1, 6.5, 2.6).fill({ color: 0xeaf2fb, alpha: 0.85 }); // snow heaped at the base

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
  // team identity via color: a lighter sweater band across the chest + zip.
  s.roundRect(-9.5, -25.5, 19, 4, 1.5).fill({ color: parkaLight, alpha: 0.9 });
  s.roundRect(-9.5, -25.5, 19, 1.3, 1.5).fill({ color: 0xffffff, alpha: 0.25 });
  s.roundRect(-0.8, -31, 1.6, 9, 0.6).fill({ color: parkaDark, alpha: 0.8 }); // center zip

  // right arm reaches across to grip the banner pole
  s.roundRect(7, -31, 6, 10, 3).fill(parka);
  s.roundRect(10.6, -31, 2.4, 10, 2).fill({ color: parkaDark, alpha: 0.45 });
  s.poly([8, -30.5, 11, -30.5, 13.8, -25, 11, -23.5]).fill(parka); // forearm out to pole
  s.circle(13.4, -24.5, 2.4).fill(parkaDark); // mitten gripping the pole

  // left arm raised, hand shading the brow as he scans the horizon
  s.roundRect(-13, -31, 6, 11, 3).fill(parka);
  s.roundRect(-13, -31, 2.4, 11, 2).fill({ color: parkaLight, alpha: 0.4 });
  s.poly([-11.5, -30, -8, -31, -4, -40.5, -7.3, -41.5]).fill(parka); // forearm up to the brow

  // hood: fur ruff ringing the face
  s.circle(0, -39, 8.4).fill(FUR);
  s.arc(0, -39, 8.4, Math.PI * 0.15, Math.PI * 0.85).stroke({ width: 2.4, color: FUR_SHADE, alpha: 0.6 });
  s.circle(0, -39, 5.9).fill(parkaDark); // hood interior shadow
  // face peeking out of the hood, with a simple two-eye gaze
  s.circle(0, -38.4, 5).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE });
  s.circle(-1.9, -38.6, 0.85).fill(EYE);
  s.circle(2, -38.6, 0.85).fill(EYE);

  // mittened hand held flat across the brow, shading the eyes
  s.roundRect(-6.6, -42, 9, 2.6, 1.3).fill(parka);
  s.roundRect(-6.6, -42, 9, 1, 1).fill({ color: parkaLight, alpha: 0.5 });
  s.roundRect(-6.6, -39.9, 9, 0.9, 0.4).fill({ color: parkaDark, alpha: 0.45 }); // shadow cast on the brow

  // faint puff of cold breath
  s.circle(5, -35, 1.3).fill({ color: 0xffffff, alpha: 0.16 });
  s.circle(6.8, -34, 0.9).fill({ color: 0xffffff, alpha: 0.1 });

  // --- banner flag at the top of the pole, rippling away from the scout ---
  s.poly([14, -52.5, 31, -51, 28.5, -47, 31, -43.5, 14, -42]).fill(parka);
  s.poly([14, -52.5, 18, -52, 18, -42, 14, -42]).fill({ color: parkaDark, alpha: 0.4 }); // fold shadow at the pole
  s.poly([14, -48.4, 30.6, -47, 28.8, -46, 14, -46]).fill({ color: parkaLight, alpha: 0.75 }); // team stripe
  s.poly([14, -52.5, 31, -51, 28.5, -47, 31, -43.5, 14, -42]).stroke({ width: 1, color: parkaDark, alpha: 0.7 });

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

// A thin imperative handle onto the Pixi camera (the world `layer` transform),
// so React overlays like the minimap can read where the view is looking and
// recenter it without forcing a Pixi redraw on every pan. `centerOnLocal` takes
// a point in layer-local space (the same space tiles are positioned in:
// isoX(gx,gy) - centroid.x).
type CameraApi = {
  getView: () => { x: number; y: number; scale: number; vw: number; vh: number };
  centerOnLocal: (localX: number, localY: number) => void;
};

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
  const pickRef = useRef<(localX: number, localY: number) => { gx: number; gy: number } | null>(
    () => null,
  );
  const keyMoveRef = useRef<(dx: number, dy: number) => void>(() => {});
  const rightClickRef = useRef<(gx: number, gy: number) => void>(() => {});
  const scoutAnimRef = useRef<{ node: Container; baseY: number } | null>(null);
  const cameraRef = useRef<CameraApi | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  // Seed from Pixi's cache so a club whose art was warmed on the founding screen
  // renders its portrait on the first frame instead of flashing a fallback. The
  // Leader portrait is the on-map indicator for both the Founding Group and the
  // HQ medallion, so it's the only club texture the map needs.
  const [leaderTexture, setLeaderTexture] = useState<Texture | null>(() =>
    activeClub ? cachedClubTexture(clubAsset(activeClub, "leader")) : null,
  );
  // Rival HQ portraits, keyed by club id, so rival HQ medallions show each
  // rival's Leader just like the player's. Seeded from cache where warmed.
  const [rivalPortraits, setRivalPortraits] = useState<Record<string, Texture>>(() =>
    seedRivalPortraits(state.world?.rivals),
  );

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

    const scout = activeScout(w);
    const moveable = scout ? moveableTilesFor(w, scout) : new Set<string>();
    if (scout && moveable.has(key)) {
      dispatch({ type: "MOVE_SCOUT", x: gx, y: gy, scoutId: scout.id });
      setSelectedKey(key);
      return;
    }

    const scoutsHere = allScouts(w).filter((s) => s.x === gx && s.y === gy);
    const hqHere = !!w.hqTile && w.hqTile.x === gx && w.hqTile.y === gy;

    // Civ-style tile cycling: a unit standing on the tile takes selection
    // priority, so clicking the founding-club tile picks up the Scout that lives
    // there rather than jumping straight to the Club HQ screen. Clicking again
    // (once the Scout is already selected) falls through to open HQ. Right-click
    // opens HQ directly without disturbing the unit (see endDrag).
    if (scoutsHere.length > 0) {
      const selectedIdx = scoutsHere.findIndex((s) => s.id === w.selectedScoutId);
      const nextScout =
        selectedIdx >= 0 && scoutsHere.length > 1
          ? scoutsHere[(selectedIdx + 1) % scoutsHere.length]
          : scoutsHere[0];
      if (nextScout?.id && (scoutsHere.length > 1 || nextScout.id !== w.selectedScoutId)) {
        dispatch({ type: "SELECT_SCOUT", scoutId: nextScout.id });
        setSelectedKey(key);
        return;
      }
    }

    const scoutHere = scoutsHere[0] ?? null;

    if (scoutHere && scoutHere.id !== w.selectedScoutId) {
      dispatch({ type: "SELECT_SCOUT", scoutId: scoutHere.id });
      setSelectedKey(key);
      return;
    }

    if (hqHere) {
      setSelectedKey(key);
      onOpenHQ?.();
      return;
    }

    if (scoutHere) {
      dispatch({ type: "SELECT_SCOUT", scoutId: scoutHere.id });
      setSelectedKey(key);
      return;
    }
    setSelectedKey(key);
  };

  // Right-click on the founding-club tile opens the Club HQ screen directly,
  // even when a unit is parked there — the deliberate "I really want HQ" gesture.
  rightClickRef.current = (gx: number, gy: number) => {
    const w = state.world;
    if (!w || !w.hqTile) return;
    if (w.hqTile.x === gx && w.hqTile.y === gy) {
      setSelectedKey(tileKey(gx, gy));
      onOpenHQ?.();
    }
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
    const scout = activeScout(w);
    if (scout) {
      const x = scout.x + dx;
      const y = scout.y + dy;
      if (moveableTilesFor(w, scout).has(tileKey(x, y))) {
        dispatch({ type: "MOVE_SCOUT", x, y, scoutId: scout.id });
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
        // Center the view on the player's unit/HQ (the start tile is chosen
        // dynamically and is usually off the map centre). Uses the host's real
        // laid-out size since app.screen can lag the CSS height on first mount.
        const vw = host.clientWidth || app.screen.width;
        const vh = host.clientHeight || app.screen.height;
        let focusX = 0;
        let focusY = 0;
        const w0 = state.world;
        if (w0) {
          const cen = centroid(w0);
          const focus = w0.hqTile ?? w0.founder;
          if (focus) {
            focusX = isoX(focus.x, focus.y) - cen.x;
            focusY = isoY(focus.x, focus.y) - cen.y;
          }
        }
        layer.position.set(vw / 2 - focusX, vh / 2 - focusY - 60);
        layerRef.current = layer;
        appRef.current = app;
        readyRef.current = true;

        // Expose the camera so the minimap can read the view and recenter it.
        cameraRef.current = {
          getView: () => ({
            x: layer.x,
            y: layer.y,
            scale: layer.scale.x,
            vw: app.screen.width,
            vh: app.screen.height,
          }),
          centerOnLocal: (localX, localY) => {
            const s = layer.scale.x;
            layer.position.set(
              app.screen.width / 2 - localX * s,
              app.screen.height / 2 - localY * s,
            );
          },
        };

        // Keep the view centered when the canvas resizes (taller viewports,
        // window resizes) by shifting the layer with half the size delta, so the
        // map fills the window instead of staying anchored to its original size.
        let lastW = app.screen.width;
        let lastH = app.screen.height;
        app.renderer.on("resize", (w: number, h: number) => {
          layer.x += (w - lastW) / 2;
          layer.y += (h - lastH) / 2;
          lastW = w;
          lastH = h;
          app.stage.hitArea = app.screen;
        });

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
        const endDrag = (e: { global: { x: number; y: number }; button?: number }) => {
          if (down && !moved) {
            const lp = layer.toLocal({ x: e.global.x, y: e.global.y });
            const hit = pickRef.current(lp.x, lp.y);
            if (hit) {
              // button 2 == right-click: open HQ directly; anything else selects.
              if (e.button === 2) rightClickRef.current(hit.gx, hit.gy);
              else clickRef.current(hit.gx, hit.gy);
            }
          }
          down = false;
        };
        app.stage.on("pointerup", endDrag);
        // Don't let the browser context menu pop on right-click — we use the
        // right button to open HQ.
        canvasEl.addEventListener("contextmenu", (e) => e.preventDefault());
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

        drawScene(layer, state, selectedKey, leaderTexture, rivalPortraits, registerScout);
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
      cameraRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!activeClub) {
      setLeaderTexture(null);
      return;
    }
    // The Leader portrait (on-map indicator for the Founding Group + HQ medallion),
    // loaded from the club's asset folder. Seed from cache first (instant when
    // warmed on the founding screen) so we never blank a portrait we already have.
    const leaderUrl = clubAsset(activeClub, "leader");
    setLeaderTexture(cachedClubTexture(leaderUrl));
    Assets.load<Texture>(leaderUrl)
      .then((texture) => !cancelled && setLeaderTexture(texture))
      .catch(() => !cancelled && setLeaderTexture(null));
    return () => {
      cancelled = true;
    };
  }, [activeClub?.assetKey]);

  // Load each rival club's Leader portrait so rival HQ medallions show their
  // leader, like the player's HQ. Rival rosters are fixed once the world is
  // generated, so this runs once per set of rival club ids.
  const rivalClubKey = (state.world?.rivals ?? [])
    .map((r) => r.clubId)
    .join(",");
  useEffect(() => {
    const rivals = state.world?.rivals ?? [];
    if (rivals.length === 0) {
      setRivalPortraits({});
      return;
    }
    let cancelled = false;
    setRivalPortraits(seedRivalPortraits(rivals)); // instant for already-warmed art
    Promise.all(
      rivals.map((r) => {
        const club = CLUBS[r.clubId];
        if (!club) return Promise.resolve([r.clubId, null] as const);
        return Assets.load<Texture>(clubAsset(club, "leader"))
          .then((tex) => [r.clubId, tex] as const)
          .catch(() => [r.clubId, null] as const);
      }),
    ).then((entries) => {
      if (cancelled) return;
      const map: Record<string, Texture> = {};
      for (const [id, tex] of entries) if (tex) map[id] = tex;
      setRivalPortraits(map);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalClubKey]);

  // Redraw whenever the world, selection, or a texture changes.
  useEffect(() => {
    if (readyRef.current && layerRef.current) {
      drawScene(
        layerRef.current,
        state,
        selectedKey,
        leaderTexture,
        rivalPortraits,
        registerScout,
      );
    }
  }, [state, selectedKey, leaderTexture, rivalPortraits]);

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
      <div className="iso-stage">
        <div ref={hostRef} className="iso-canvas" />
        <UnitOverlay state={state} dispatch={dispatch} />
        <MiniMap state={state} cameraRef={cameraRef} />
      </div>
      <MapControls state={state} dispatch={dispatch} selectedKey={selectedKey} />
    </div>
  );
}

// ---- Minimap -------------------------------------------------------------
const MM_W = 220; // minimap width in CSS pixels; height follows world aspect

function cssHex(n: number): string {
  return "#" + (n & 0xffffff).toString(16).padStart(6, "0");
}

// A corner minimap: a 1px-per-tile fog/terrain picture scaled up crisply, with
// HQ / Scout / region dots, the live camera viewport quad, and click-to-pan.
// It reads the same fog model as the main map (unseen → dark, explored → dim,
// visible → bright) and drives the camera via the imperative CameraApi handle.
function MiniMap({
  state,
  cameraRef,
}: {
  state: GameState;
  cameraRef: { current: CameraApi | null };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Static composite (scaled terrain + markers), rebuilt only on state change;
  // the per-frame loop just blits this and strokes the moving viewport quad.
  const compositeRef = useRef<HTMLCanvasElement | null>(null);
  const world = state.world;
  const mmW = MM_W;
  const mmH = world
    ? Math.max(1, Math.round((MM_W * world.height) / world.width))
    : Math.round(MM_W * 0.625);

  // Rebuild the terrain + marker composite whenever fog / markers change.
  useEffect(() => {
    if (!world) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const tw = world.width;
    const th = world.height;
    const buf = document.createElement("canvas");
    buf.width = tw;
    buf.height = th;
    const bctx = buf.getContext("2d");
    if (!bctx) return;
    const revealedSet = new Set(world.revealed);
    const visibleSet = visibleTiles(world);
    for (let gy = 0; gy < th; gy++) {
      for (let gx = 0; gx < tw; gx++) {
        const tile = world.tiles[gy * tw + gx];
        const key = `${gx},${gy}`;
        const explored = state.devRevealAll || revealedSet.has(key);
        const visible = state.devRevealAll || visibleSet.has(key);
        let col: number;
        if (!explored) col = 0x0a1119;
        else {
          const base = (TERRAIN[tile.terrain] ?? TERRAIN.plains).top;
          col = visible ? base : mixColor(darkenBy(base, 0.4), 0x1b2b3d, 0.45);
        }
        bctx.fillStyle = cssHex(col);
        bctx.fillRect(gx, gy, 1, 1);
      }
    }

    const comp = compositeRef.current ?? document.createElement("canvas");
    comp.width = mmW * dpr;
    comp.height = mmH * dpr;
    compositeRef.current = comp;
    const cctx = comp.getContext("2d");
    if (!cctx) return;
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.imageSmoothingEnabled = false;
    cctx.clearRect(0, 0, mmW, mmH);
    cctx.drawImage(buf, 0, 0, mmW, mmH);

    const dot = (gx: number, gy: number, color: number, r: number, ring = false) => {
      const mx = ((gx + 0.5) / tw) * mmW;
      const my = ((gy + 0.5) / th) * mmH;
      cctx.beginPath();
      cctx.arc(mx, my, r, 0, Math.PI * 2);
      cctx.fillStyle = cssHex(color);
      cctx.fill();
      if (ring) {
        cctx.lineWidth = 1;
        cctx.strokeStyle = "rgba(255,255,255,0.9)";
        cctx.stroke();
      }
    };

    // Region pins that have been at least discovered, on explored tiles.
    for (const [regionId, rState] of Object.entries(state.discovery.regionStates)) {
      if (rState === "hidden") continue;
      const region = REGIONS_BY_ID[regionId];
      if (!region) continue;
      if (!state.devRevealAll && !revealedSet.has(`${region.tile.x},${region.tile.y}`)) continue;
      dot(region.tile.x, region.tile.y, PIN_COLOR[rState], 2.4);
    }
    for (const org of world.hockeyOrgs) {
      if (!state.devRevealAll && !revealedSet.has(`${org.x},${org.y}`)) continue;
      dot(org.x, org.y, 0xf2c14e, 2.2, true);
    }
    // Rival HQs are fixed landmarks, so they sit on the minimap like hockey orgs
    // once explored, in the rival's club color. Rival UNITS move, so — like on
    // the main map — they're never plotted here from stale memory.
    for (const rival of world.rivals) {
      if (!state.devRevealAll && !revealedSet.has(`${rival.hqTile.x},${rival.hqTile.y}`)) {
        continue;
      }
      dot(rival.hqTile.x, rival.hqTile.y, accentNumber(CLUBS[rival.clubId]?.accent), 2.6, true);
    }
    for (const pond of world.pondMarkers) {
      if (pond.investigated) continue;
      if (!state.devRevealAll && !revealedSet.has(`${pond.x},${pond.y}`)) continue;
      dot(pond.x, pond.y, 0x9fd4ff, 2);
    }
    const accent = accentNumber(getActiveClub(state)?.accent);
    if (world.founder) dot(world.founder.x, world.founder.y, accent, 2.8, true);
    for (const scout of allScouts(world)) {
      dot(scout.x, scout.y, 0x38bdf8, 2.8, scout.id === world.selectedScoutId);
    }
    if (world.hqTile) dot(world.hqTile.x, world.hqTile.y, accent, 3.4, true);
  }, [state, world, mmW, mmH]);

  // Per-frame: blit the composite and stroke the live camera viewport quad.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !world) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = mmW * dpr;
    canvas.height = mmH * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cen = centroid(world);
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, mmW, mmH);
      const comp = compositeRef.current;
      if (comp) ctx.drawImage(comp, 0, 0, mmW, mmH);
      const cam = cameraRef.current?.getView();
      if (cam && cam.scale > 0) {
        const corners: Array<[number, number]> = [
          [0, 0],
          [cam.vw, 0],
          [cam.vw, cam.vh],
          [0, cam.vh],
        ];
        ctx.beginPath();
        corners.forEach(([sx, sy], i) => {
          const lx = (sx - cam.x) / cam.scale;
          const ly = (sy - cam.y) / cam.scale;
          const a = (lx + cen.x) / (TILE_W / 2);
          const b = (ly + cen.y) / (TILE_H / 2);
          const gx = (a + b) / 2;
          const gy = (b - a) / 2;
          const mx = (gx / world.width) * mmW;
          const my = (gy / world.height) * mmH;
          if (i === 0) ctx.moveTo(mx, my);
          else ctx.lineTo(mx, my);
        });
        ctx.closePath();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [world, mmW, mmH, cameraRef]);

  if (!world) return null;

  // Click (or drag) on the minimap recenters the main camera on that tile.
  const jumpTo = (e: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * world.width;
    const gy = ((e.clientY - rect.top) / rect.height) * world.height;
    const cen = centroid(world);
    cameraRef.current?.centerOnLocal(isoX(gx, gy) - cen.x, isoY(gx, gy) - cen.y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="iso-minimap"
      style={{ width: mmW, height: mmH }}
      title="Click to jump the view"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        jumpTo(e);
      }}
      onPointerMove={(e) => {
        if (e.buttons & 1) jumpTo(e);
      }}
    />
  );
}

// ---- Selected-unit overlay (floats over the lower-right of the map) -------
// Civ-style: when a unit is active, its portrait, movement, and contextual
// orders sit on the map itself rather than only in a panel beneath it.
function UnitOverlay({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const world = state.world;
  if (!world) return null;

  const leaderSelected = world.founderSelected && !!world.founder && !world.hqTile;
  const selectedScout = activeScout(world);
  const scoutSelected = !!selectedScout;
  if (!leaderSelected && !scoutSelected) return null;

  const isLeader = leaderSelected;
  const unit = isLeader ? world.founder! : selectedScout!;
  const club = getActiveClub(state);
  const name = isLeader ? "Leader" : unit.name ?? "Pond Scout";
  const role = isLeader ? "Founding Group" : "Exploration";
  const outOfMoves = unit.movesRemaining <= 0;

  // Scout field orders are tied to the tile the unit is standing on. Goodie huts
  // are no longer a manual order — they auto-resolve into a pop-up on arrival.
  const surveyId = !isLeader ? surveyableRegionId(state) : null;
  const scoutRegionId = !isLeader ? regionIdAtTile(unit.x, unit.y) : null;
  const canConnect = !!scoutRegionId && canEstablishConnection(state, scoutRegionId);
  const connecting =
    !!scoutRegionId && state.discovery.connection?.regionId === scoutRegionId;
  const hasOrder = isLeader ? !!club : !!surveyId || canConnect;

  return (
    <div className="unit-overlay" role="group" aria-label={`${name} selected`}>
      <div className={`unit-portrait ${isLeader ? "is-leader" : "is-scout"}`}>
        {isLeader && club ? (
          <img
            src={clubAsset(club, "leader")}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <ItemArt kind="unit" id="pond-scout" />
        )}
      </div>
      <div className="unit-body">
        <div className="unit-head">
          <span className="unit-name">{name}</span>
          <span className="unit-role">{role}</span>
        </div>
        <div className={`unit-moves${outOfMoves ? " spent" : ""}`}>
          <span className="um-pip" aria-hidden="true" />
          <strong>
            {unit.movesRemaining}/{unit.movesPerTurn}
          </strong>
          <span className="um-label">Moves</span>
        </div>
        <div className="unit-orders">
          {isLeader && club && (
            <button
              className="btn btn-gold btn-block"
              onClick={() => dispatch({ type: "FOUND_CLUB", clubId: club.id })}
            >
              Found {shortClubLabel(club)} Here
            </button>
          )}
          {surveyId && (
            <button
              className="btn btn-primary btn-block"
              onClick={() => dispatch({ type: "SURVEY_REGION", regionId: surveyId })}
            >
              Survey Region
            </button>
          )}
          {canConnect && scoutRegionId && (
            <button
              className="btn btn-gold btn-block"
              onClick={() =>
                dispatch({ type: "ESTABLISH_CONNECTION", regionId: scoutRegionId })
              }
            >
              Establish Connection ({CONNECTION_MONTHS} mo)
            </button>
          )}
          {!isLeader && (
            <button
              className="btn btn-block"
              onClick={() => dispatch({ type: "SELECT_SCOUT", scoutId: unit.id })}
            >
              Deselect
            </button>
          )}
        </div>
        {connecting ? (
          <div className="unit-hint muted">
            Building local ties — {state.discovery.connection?.monthsRemaining} mo to
            go.
          </div>
        ) : (
          !hasOrder && (
            <div className="unit-hint faint">
              {outOfMoves
                ? "Out of moves this month."
                : "Click a highlighted tile or use the arrow keys to move."}
            </div>
          )
        )}
      </div>
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
  const scouts = allScouts(state.world);
  const selectedScout = activeScout(state.world);
  const founder = state.world?.founder;
  const sel = selectedKey ? selectedKey.split(",").map(Number) : null;
  const regionId = sel ? regionIdAtTile(sel[0], sel[1]) : null;
  const region = regionId ? REGIONS_BY_ID[regionId] : null;
  const rState = regionId ? state.discovery.regionStates[regionId] ?? "hidden" : null;
  const revealed = sel ? state.world?.revealed.includes(`${sel[0]},${sel[1]}`) : false;
  const selVisible =
    sel && state.world
      ? state.devRevealAll || visibleTiles(state.world).has(`${sel[0]},${sel[1]}`)
      : false;
  const org = sel
    ? state.world?.hockeyOrgs.find((o) => o.x === sel[0] && o.y === sel[1])
    : null;

  const marker = sel
    ? state.world?.pondMarkers.find(
        (m) => !m.investigated && m.x === sel[0] && m.y === sel[1],
      )
    : null;
  const canSurvey = region ? surveyableRegionId(state) === region.id : false;
  const canConnect = region ? canEstablishConnection(state, region.id) : false;
  const connecting = region ? state.discovery.connection?.regionId === region.id : false;
  const contested = region ? state.discovery.contested.includes(region.id) : false;

  return (
    <div className="iso-controls">
      {founder && !state.world?.hqTile && (
        <div className="scout-bar">
          <span>
            👤 <strong>Leader</strong> · {founder.movesRemaining}/{founder.movesPerTurn} moves
          </span>
          <button
            className={`btn${state.world?.founderSelected ? " btn-primary" : ""}`}
            onClick={() => dispatch({ type: "SELECT_FOUNDING_UNIT" })}
          >
            {state.world?.founderSelected ? "Selected — click a tile" : "Select Leader"}
          </button>
        </div>
      )}

      {scouts.length > 0 && (
        <div className="scout-bar">
          <span>
            🔍 <strong>{selectedScout?.name ?? "Pond Scouts"}</strong> ·{" "}
            {selectedScout
              ? `${selectedScout.movesRemaining}/${selectedScout.movesPerTurn} moves`
              : `${scouts.length} units`}
          </span>
          <button
            className={`btn${selectedScout ? " btn-primary" : ""}`}
            onClick={() =>
              dispatch({
                type: "SELECT_SCOUT",
                scoutId: selectedScout?.id ?? scouts[0]?.id,
              })
            }
          >
            {selectedScout ? "Selected — click a tile" : "Select Scout"}
          </button>
        </div>
      )}

      {!sel && (
        <div className="map-detail faint">
          Click a tile to inspect it. Moving a unit reveals the destination and
          the surrounding sightline.
        </div>
      )}

      {sel && revealed && org && (
        <div className="map-detail">
          <div className="detail-head">
            <strong>{hockeyOrgDisplayName(org)}</strong>
            <span className="region-resource">Independent Hockey Association</span>
          </div>
          <div className="region-report">
            A persistent neutral hockey power. Later, scouts and envoys will build
            relationships here instead of consuming it like a goodie hut.
          </div>
          <div className="state-tag">{org.archetype.replace("-", " ")}</div>
        </div>
      )}

      {sel && !(org && revealed) && !(region && revealed && rState !== "hidden") && (
        <div className="map-detail">
          {revealed && marker ? (
            <span className="muted">
              Goodie hut · {marker.kind.replace("-", " ")} — move a scout onto it
              to investigate. It resolves on arrival, then disappears.
            </span>
          ) : revealed ? (
            selVisible ? (
              <span className="muted">Open terrain — nothing of hockey interest here yet.</span>
            ) : (
              <span className="faint">Explored terrain — last charted earlier; no current sightline here.</span>
            )
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
              <div className="faint">
                Scout is here — use <strong>Survey Region</strong> on the unit
                panel.
              </div>
            )}
            {rState === "discovered" && !canSurvey && (
              <div className="faint">Move your Scout onto this tile to survey it.</div>
            )}
            {rState === "surveyed" && !canConnect && !connecting && (
              <div className="faint">
                Surveyed — establish a local connection from the Scout's panel.
              </div>
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

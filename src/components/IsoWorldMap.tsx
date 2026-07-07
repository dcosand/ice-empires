import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
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
  PondSurfaceState,
  WorldState,
  WorldTerrain,
  WorldTile,
} from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { ERA_ORDER } from "../data/eras";
import { cachedClubTexture } from "../data/clubTextures";
import type { ClubDef } from "../types/game";
import { ItemArt } from "./ItemArt";
import {
  hasMesaLandform,
  hockeyOrgDisplayName,
  tileAt,
  tileKey,
  tileVisualRand,
  groveIntensity,
  hasVisibleGrove,
  visibleTiles,
} from "../engine/world";
import {
  activeScout,
  allScouts,
  missionTargetOrg,
  moveableTilesFor,
  networkTargetOrg,
} from "../engine/scoutSystem";
import {
  canBuildRink,
  canClearSnow,
  canHarvestBranches,
  canPaveStreetRink,
} from "../engine/builderSystem";
import { getClubRinks, rinkAt } from "../engine/rinkSystem";
import {
  computeTerritory,
  PLAYER_OWNER,
  type TerritoryOwnership,
} from "../engine/territorySystem";
import { canEndMonth } from "../engine/selectors";
import { playSfx, type SfxName } from "../engine/sfx";

// ---- Isometric geometry --------------------------------------------------
const TILE_W = 64; // diamond width
const TILE_H = 32; // diamond height (2:1 iso)
const BASE_THICK = 11; // constant chunk below every tile's top diamond
const FLAT_RISE = 10; // every revealed tile shares one flat ground height
const FOG_RISE = 7; // unexplored tiles sit slightly lower than explored land

const isoX = (gx: number, gy: number) => (gx - gy) * (TILE_W / 2);
const isoY = (gx: number, gy: number) => (gx + gy) * (TILE_H / 2);

function movementSfxForTile(world: WorldState, tile: WorldTile): SfxName {
  if (hasVisibleGrove(world, tile)) return "forestWalk";
  if (tile.terrain === "pond" && tile.surfaceState === "frozen") return "iceWalk";
  if (tile.terrain === "ice") return "snowWalk";
  return "walk";
}

function isAdjacentTarget(unit: { x: number; y: number }, x: number, y: number) {
  const dx = Math.abs(unit.x - x);
  const dy = Math.abs(unit.y - y);
  return dx <= 1 && dy <= 1 && dx + dy > 0;
}

function playMovementErrorIfImpassable(
  world: WorldState,
  unit: { x: number; y: number; movesRemaining: number } | null | undefined,
  x: number,
  y: number,
) {
  const tile = tileAt(world, x, y);
  if (unit && unit.movesRemaining > 0 && isAdjacentTarget(unit, x, y) && tile && !tile.valid) {
    playSfx("movementError");
    return true;
  }
  return false;
}

// Terrain palette (hockey-world flavored: green plains, tan desert, pale ice).
const TERRAIN: Record<WorldTerrain, { top: number; side: number; detail: number }> = {
  coastal: { top: 0xbfd07d, side: 0x829257, detail: 0x2d7fa6 },
  desert: { top: 0xd8b673, side: 0xb2904c, detail: 0xf1d28e },
  "high-desert": { top: 0xb78f62, side: 0x876942, detail: 0x6f7d55 },
  ice: { top: 0xcfe8f5, side: 0xa3cadd, detail: 0x83c7e3 },
  mountain: { top: 0x7d8c8d, side: 0x59696d, detail: 0xd7e5e7 },
  plains: { top: 0x6f9350, side: 0x52703b, detail: 0x9dbb70 },
  pond: { top: 0x8fc9e8, side: 0x5a93b4, detail: 0xeaf7ff },
  tropical: { top: 0x3f9862, side: 0x2d7048, detail: 0x88c96d },
  water: { top: 0x153f5e, side: 0x0d2942, detail: 0x356f95 },
};
const FOG = { top: 0x111c28, side: 0x0a1119, detail: 0x1c2b3d };
// Explored-but-not-currently-visible tiles render their real terrain, then get
// multiplied by this cool, dark tint so they read as dim "memory" — desaturated
// and bluish, with no live markers — versus full-color tiles you can see now.
const MEMORY_TINT = 0x5a6e86;
const MEMORY_ALPHA = 0.86;

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
  // Tile ownership (D34): derived fresh per draw, like income — never stored.
  // Uncontacted rivals are excluded, so unknown borders can't leak.
  const territory = computeTerritory(world);

  for (let gy = 0; gy < world.height; gy++) {
    for (let gx = 0; gx < world.width; gx++) {
      const key = tileKey(gx, gy);
      const tile = tileAt(world, gx, gy)!;
      // Two fog tiers now: unseen (never explored) → dark fog; explored →
      // full color forever (Polytopia). `visible` (current line of sight)
      // only gates live info like rival unit positions.
      const explored = state.devRevealAll || revealedSet.has(key);
      const visible = state.devRevealAll || visibleSet.has(key);
      // Polytopia rule: explored terrain stays fully lit forever — no memory
      // dimming. Current sight (`visible`) still gates LIVE info only: rival
      // units render solely inside your present line of sight (Civ rule).
      const memory = false;
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
      if (explored) {
        drawTerrainBlend(gTop, world, tile);
        drawGroundTexture(gTop, tile, pal, topColor);
      }
      // Soft seam (was a hard dark grid line, which read as a board game).
      gTop.poly(diamond()).stroke({ width: 1, color: 0x0c1722, alpha: 0.12 });
      applyMemory(gTop, memory);
      if (moveable.has(key)) drawMoveHint(gTop);
      if (selectedKey === key) {
        gTop.poly(diamond()).stroke({ width: 2.5, color: 0xffffff, alpha: 0.95 });
      }
      layer.addChild(gTop);

      // --- territory border ribbons (D35, Civ VI style): stroke each owned
      // tile edge that faces a differently-owned (or neutral) tile, in the
      // owner club's colors. Only on explored ground — fog keeps its secrets.
      const tileOwner = explored ? territory.ownerByTile[key] : undefined;
      if (tileOwner) {
        const borderColor =
          tileOwner === PLAYER_OWNER
            ? accent
            : accentNumber(CLUBS[tileOwner]?.accent);
        const mk = territoryBorderMarker(gx, gy, c, territory, tileOwner, borderColor);
        if (mk) {
          mk.position.y -= rise;
          layer.addChild(mk);
        }
      }

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
        const veg = vegetationSprite(tile, world);
        if (veg) {
          // Break the iso lattice: shove each grove off its tile centre and vary
          // its size per tile, so a forest scatters organically instead of
          // reading as neat diagonal rows of identical clumps. The offset is a
          // good fraction of a tile, so crowns spill across seams and interlock.
          const jx = (tileRand(gx, gy, 41) - 0.5) * 26;
          const jy = (tileRand(gx, gy, 42) - 0.5) * 14;
          const s = 0.82 + tileRand(gx, gy, 43) * 0.42;
          const mirror = veg.scale.x < 0 ? -1 : 1;
          veg.scale.set(mirror * s, s);
          veg.position.set(isoX(gx, gy) - c.x + jx, isoY(gx, gy) - c.y - rise + 8 + jy);
          veg.zIndex = gx + gy + 0.14 + jy * 0.001;
          applyMemory(veg, memory);
          layer.addChild(veg);
        }
      }

      // ---- markers on top of the tile ----
      const org = world.hockeyOrgs.find((o) => o.x === gx && o.y === gy);
      if (explored && org) {
        const label = hockeyOrgDisplayName(org);
        const mk = hockeyOrgMarker(gx, gy, c, org.archetype);
        mk.position.y -= rise;
        applyMemory(mk, memory);
        layer.addChild(mk);
        const text = hockeyOrgLabelMarker(gx, gy, c, label);
        text.position.y -= rise;
        applyMemory(text, memory);
        layer.addChild(text);
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

      // Player-built rinks (and cleared ponds awaiting a rink). A builder mid-
      // construction on this tile draws the scaffold variant instead.
      const rink = world.rinks.find((r) => r.x === gx && r.y === gy);
      const buildingHere =
        scouts.some(
          (u) =>
            u.working?.task === "build-rink" &&
            u.working.x === gx &&
            u.working.y === gy,
        ) ||
        world.rivals.some((rv) =>
          rv.units.some(
            (u) => u.workingMonths !== undefined && u.x === gx && u.y === gy,
          ),
        );
      if (explored && (rink || buildingHere)) {
        const rinkAccent = rink?.ownerClubId
          ? accentNumber(CLUBS[rink.ownerClubId]?.accent)
          : accent;
        const mk = rinkMarker(gx, gy, c, rink ?? null, rinkAccent, buildingHere);
        mk.position.y -= rise;
        applyMemory(mk, memory);
        layer.addChild(mk);
      }

      const isHQ = world.hqTile && world.hqTile.x === gx && world.hqTile.y === gy;
      if (isHQ) {
        const mk = hqMarker(
          gx,
          gy,
          c,
          accent,
          clubLabel,
          leaderTexture,
          Math.max(0, ERA_ORDER.indexOf(state.eraId)),
        );
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
              Math.max(0, ERA_ORDER.indexOf(rival.eraId)),
            );
            mk.position.y -= rise;
            applyMemory(mk, memory);
            layer.addChild(mk);
          }
          if (!visible) continue; // live units: current sightline only
          const unitsHere = rival.units.filter((u) => u.x === gx && u.y === gy);
          for (let i = 0; i < unitsHere.length; i++) {
            const mk =
              unitsHere[i].kind === "builder"
                ? builderMarker(gx, gy, c, false, rAccent)
                : scoutMarker(gx, gy, c, false, rAccent);
            mk.position.x += (i - (unitsHere.length - 1) / 2) * 10;
            mk.position.y -= rise;
            layer.addChild(mk);
          }
        }
      }

      // Wandering neutral units roam and are LIVE info — only render where the
      // player has current sightline (never leak positions from memory). The
      // friendly/hostile tell stays off the map (it lives in the encounter),
      // so the sprite is a neutral hooded nomad.
      if (visible) {
        const wanderersHere = world.wanderers.filter(
          (w) => w.x === gx && w.y === gy,
        );
        for (let i = 0; i < wanderersHere.length; i++) {
          const mk = wandererMarker(gx, gy, c);
          mk.position.x += (i - (wanderersHere.length - 1) / 2) * 10;
          mk.position.y -= rise;
          layer.addChild(mk);
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
        const isSel = !!scout.id && scout.id === world.selectedScoutId;
        const mk =
          scout.kind === "builder"
            ? builderMarker(gx, gy, c, isSel, accent)
            : scout.unitDefId === "club-scout"
              ? clubScoutMarker(gx, gy, c, isSel, accent)
              : scoutMarker(gx, gy, c, isSel, accent);
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

// ---- Territory borders (D34/D35) ------------------------------------------
// The four diamond-edge neighbors and the top-face edge each one shares with
// this tile (diamond vertices: top, right, bottom, left in screen space).
const BORDER_EDGES: Array<{
  dx: number;
  dy: number;
  from: [number, number];
  to: [number, number];
}> = [
  { dx: 0, dy: -1, from: [0, -TILE_H / 2], to: [TILE_W / 2, 0] }, // up-right
  { dx: 1, dy: 0, from: [TILE_W / 2, 0], to: [0, TILE_H / 2] }, // down-right
  { dx: 0, dy: 1, from: [0, TILE_H / 2], to: [-TILE_W / 2, 0] }, // down-left
  { dx: -1, dy: 0, from: [-TILE_W / 2, 0], to: [0, -TILE_H / 2] }, // up-left
];

// Civ VI-style boundary ribbon for one owned tile: a dark outer edge hugging
// the tile seam plus a bright inner stroke just inside it, drawn only along
// edges that face a tile with a different owner (or unclaimed ground). Returns
// null when the tile is fully interior — most owned tiles draw nothing.
function territoryBorderMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  territory: TerritoryOwnership,
  owner: string,
  color: number,
): Graphics | null {
  const edges = BORDER_EDGES.filter(
    (e) => territory.ownerByTile[tileKey(gx + e.dx, gy + e.dy)] !== owner,
  );
  if (edges.length === 0) return null;
  const g = new Graphics();
  g.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  // Above the top face and its ground texture, below standing features (0.1).
  g.zIndex = gx + gy + 0.09;
  // Insetting both strokes toward the tile center keeps shared corners joined
  // between neighboring border tiles (same scale on the shared vertex).
  const ribbon = (inset: number, width: number, col: number, alpha: number) => {
    for (const e of edges) {
      g.moveTo(e.from[0] * inset, e.from[1] * inset);
      g.lineTo(e.to[0] * inset, e.to[1] * inset);
    }
    g.stroke({ width, color: col, alpha, cap: "round", join: "round" });
  };
  ribbon(0.96, 3.5, darkenBy(color, 0.55), 0.55); // dark outer edge
  ribbon(0.85, 2, lighten(color, 0.14), 0.92); // bright inner ribbon
  return g;
}

function hockeyOrgMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  archetype: string,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  // Just under units (+0.6) so a scout standing at the org draws in front,
  // and rows south of the org are never hidden behind the buildings.
  m.zIndex = gx + gy + 0.55;
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
  return m;
}

function hockeyOrgLabelMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  label: string,
) {
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
  // Labels are their own high-priority layer so neighboring tile sprites can
  // overlap the indie buildings without burying the indie's name.
  text.zIndex = gx + gy + 50;
  text.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y + 10);
  return text;
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

// A club-built rink (or its precursors) on the tile.
//   rink null + building  -> scaffold (construction under way)
//   level 0               -> Cleared Pond (shoveled sheet, snowbanks)
//   level 1 kind "ice"    -> Level 1 outdoor rink: white sheet, lines, boards
//   level 1 kind "inline" -> street rink: asphalt sheet, warm lines
function rinkMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  rink: { level: number; kind: "ice" | "inline" } | null,
  accent: number,
  building: boolean,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  m.zIndex = gx + gy + 0.4;
  const g = new Graphics();

  g.ellipse(0, 4, 23, 10).fill({ color: 0x000000, alpha: 0.2 });

  if (rink && rink.level >= 1) {
    const isIce = rink.kind === "ice";
    const sheet = isIce ? 0xe8f4fa : 0x5d6570;
    const lineA = isIce ? 0xd94f4f : 0xe8934a; // center line
    const lineB = isIce ? 0x3b6fa0 : 0xd8d8d8; // blue lines / lane paint
    // A real rink silhouette: long rounded rectangle with corner radius —
    // boards first (slightly larger), then the sheet inside them.
    g.roundRect(-23, -8.5, 46, 19, 8).fill(isIce ? 0x9a7c45 : 0x4a4f57);
    g.roundRect(-21, -7, 42, 16, 7)
      .fill(sheet)
      .stroke({ width: 1.4, color: 0xffffff, alpha: 0.85 });
    // Center line + blue lines + faceoff dots + goals.
    g.moveTo(0, -6.5).lineTo(0, 8.5).stroke({ width: 1.6, color: lineA, alpha: 0.9 });
    g.moveTo(-8, -6.5).lineTo(-8, 8.5).stroke({ width: 1, color: lineB, alpha: 0.75 });
    g.moveTo(8, -6.5).lineTo(8, 8.5).stroke({ width: 1, color: lineB, alpha: 0.75 });
    g.circle(-14, 1, 1.6).fill(lineB);
    g.circle(14, 1, 1.6).fill(lineB);
    g.rect(-19.5, -1, 2.6, 4).stroke({ width: 1.1, color: lineA, alpha: 0.9 });
    g.rect(16.9, -1, 2.6, 4).stroke({ width: 1.1, color: lineA, alpha: 0.9 });
    // Club-color pennant so ownership reads at a glance.
    g.moveTo(21, -6).lineTo(21, -18).stroke({ width: 1.4, color: 0x5a6b7d });
    g.poly([21, -18, 29, -15.5, 21, -13]).fill(accent);
  } else if (building) {
    // Scaffold: dashed rink outline + stacked planks while the crew works.
    g.roundRect(-20, -6.5, 40, 15, 7).stroke({ width: 1.4, color: 0xd9c98a, alpha: 0.9 });
    g.roundRect(-14, -4, 28, 10, 5).stroke({ width: 1, color: 0xd9c98a, alpha: 0.5 });
    g.roundRect(-8, -3, 12, 2.6, 1).fill(0x9a7c45);
    g.roundRect(-4, -6.5, 12, 2.6, 1).fill(0x815833);
    g.roundRect(4, 2, 8, 2.4, 1).fill(0x6e4a2c);
  } else {
    // Cleared Pond: a shoveled rink-shaped sheet ringed by snowbanks — the
    // rounded-rectangle footprint the future rink will occupy.
    g.roundRect(-19, -6.5, 38, 15, 7)
      .fill({ color: 0xdff0f8, alpha: 0.95 })
      .stroke({ width: 3, color: 0xf4fbff, alpha: 0.6 });
    g.roundRect(-19, -6.5, 38, 15, 7).stroke({ width: 1.2, color: 0xffffff, alpha: 0.8 });
    // shovel stroke marks on the ice
    g.moveTo(-12, -3).lineTo(10, -3).stroke({ width: 1, color: 0xa8ccd8, alpha: 0.55 });
    g.moveTo(-10, 1).lineTo(12, 1).stroke({ width: 1, color: 0xa8ccd8, alpha: 0.45 });
    g.moveTo(-12, 5).lineTo(8, 5).stroke({ width: 1, color: 0xa8ccd8, alpha: 0.5 });
    // planted shovel
    g.moveTo(16, -2).lineTo(20, -13).stroke({ width: 1.6, color: 0x8a6a3c });
    g.poly([18.5, -14.5, 23, -13, 20.5, -9.5]).fill(0x9aa6b0);
  }

  m.addChild(g);
  return m;
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

// The club's home city, drawn beneath the leader crest — a major club's
// capital that unmistakably out-scales a neutral org's mini-district. Scales
// with `tier` (era index 0–4): a Pond-era hamlet grows into a lit skyline of
// towers around a big arena by the Dynasty era.
function drawClubTown(g: Graphics, accent: number, tier: number) {
  // Broad footprint shadow + stone plaza, wider than any neutral org's.
  g.ellipse(0, 10, 42, 14).fill({ color: 0x000000, alpha: 0.32 });
  g.poly([-40, 6, -7, -13, 40, 6, 7, 25]).fill({ color: 0x30465a, alpha: 0.55 });
  g.poly([-34, 5, -5, -12, 34, 5, 5, 22])
    .fill({ color: 0xc9d9e0, alpha: 0.9 })
    .stroke({ width: 1, color: accent, alpha: 0.5 });

  // Back-row buildings, taller each era.
  drawIsoBlock(g, -26, -2, 11, 15 + tier * 3, 0x5c6f77, accent);
  drawIsoBlock(g, 15, -3, 11, 16 + tier * 3, 0x54666e, accent);
  if (tier >= 1) drawIsoBlock(g, -33, 3, 8, 12 + tier * 3, 0x60737b, accent);

  // Skyscraper towers rise as the club turns pro — the "skyline" read.
  if (tier >= 2) drawTower(g, 26, 3, 9, 22 + tier * 4, accent);
  if (tier >= 3) drawTower(g, -38, 5, 8, 20 + tier * 4, accent);
  if (tier >= 4) drawTower(g, 33, 6, 8, 30, accent);

  // The signature arena centrepiece: timber barn body, big accent dome.
  drawBarnArena(g, 0, 7, 26 + tier * 2, 16 + tier * 3, accent);

  // Front satellite buildings + chimney steam fill the district out.
  if (tier >= 1) drawIsoBlock(g, 19, 8, 9, 12 + tier * 2, 0x67797f, accent);
  if (tier >= 3) drawIsoBlock(g, -20, 9, 9, 12, 0x5a6d75, accent);
  if (tier >= 2) drawSteam(g, -24, -20 - tier * 3);

  // A grand club banner on a tall pole, taller each era.
  const poleTop = -24 - tier * 3;
  g.moveTo(30, 7).lineTo(30, poleTop).stroke({ width: 2, color: 0x6b7d8a });
  g.poly([30, poleTop, 48, poleTop + 5, 30, poleTop + 11])
    .fill(accent)
    .stroke({ width: 1, color: 0x05121c });
}

// A tall thin skyscraper: iso block (drawIsoBlock stipples lit windows up its
// height) topped by an accent beacon.
function drawTower(g: Graphics, x: number, baseY: number, w: number, h: number, accent: number) {
  drawIsoBlock(g, x, baseY, w, h, 0x46586a, accent);
  g.circle(x + w / 2 + 2, baseY - h - 4, 1.6).fill({ color: accent, alpha: 0.95 });
}

// Soft chimney steam — a few translucent puffs rising off the district.
function drawSteam(g: Graphics, x: number, y: number) {
  g.circle(x, y, 4).fill({ color: 0xffffff, alpha: 0.12 });
  g.circle(x + 3, y - 5, 5).fill({ color: 0xffffff, alpha: 0.1 });
  g.circle(x - 2, y - 10, 4).fill({ color: 0xffffff, alpha: 0.08 });
}

// The signature barn-arena: an iso timber block topped by an accent-colored
// arched roof (the "barn") with a big sliding door on the front face.
function drawBarnArena(
  g: Graphics,
  cx: number,
  baseY: number,
  w: number,
  bodyH: number,
  accent: number,
) {
  drawIsoBlock(g, cx - w / 2, baseY, w, bodyH, 0x8a583a, accent);
  const ry = baseY - bodyH; // roofline height
  g.ellipse(cx, ry, w / 2 + 1, 7)
    .fill(lighten(accent, 0.12))
    .stroke({ width: 1.2, color: 0x263746, alpha: 0.7 });
  g.arc(cx, ry, w / 2 - 1, Math.PI, 0).stroke({ width: 1.6, color: accent, alpha: 0.95 });
  g.rect(cx - w / 2 + 1, ry + 2, w - 2, 2).fill({ color: accent, alpha: 0.7 });
  // Big barn doors, warmly lit from within.
  g.roundRect(cx - 5, baseY - 10, 10, 10, 1.5).fill({ color: 0x2a1c14, alpha: 0.9 });
  g.rect(cx - 3.5, baseY - 8.5, 7, 7).fill({ color: 0xe8b45a, alpha: 0.6 });
}

function hqMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  accent: number,
  label: string,
  portraitTexture: Texture | null,
  eraIndex: number,
) {
  const m = new Container();
  m.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  // HQ is a key landmark and carries a name label that hangs below the pin, so
  // keep the whole marker above neighbouring tile tops (which would otherwise
  // paint over the lower half of the label).
  m.zIndex = gx + gy + 50;

  const cy = -44; // medallion centre — raised to float above the town roofline
  const R = 12; // portrait radius (sits inside the disc backing)

  // The club's home isn't a lone pin: it's a growing town that out-scales the
  // neutral orgs' mini-districts. It gains buildings, height, and lights each
  // era; the leader medallion rides a standard above it as the crowning crest.
  const town = new Graphics();
  drawClubTown(town, accent, Math.max(0, Math.min(4, eraIndex)));
  m.addChild(town);

  const base = new Graphics();
  // Standard pole rising from the plaza up to the floating crest.
  base.rect(-1.5, cy + R, 3, -(cy + R) + 4).fill(0xe6eef6).stroke({ width: 0.8, color: 0x05121c, alpha: 0.5 });
  base.circle(0, cy, R + 3).fill(0x0f1824).stroke({ width: 3, color: accent });
  base.circle(0, cy, R + 5).stroke({ width: 1.5, color: accent, alpha: 0.5 });
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
  // Open ocean and frozen ponds read as a single clean sheet — no per-tile
  // brightness jitter.
  if (tile.terrain === "water" || tile.terrain === "pond") return base;
  if (tile.feature === "river") return mixColor(base, 0x7dd3fc, 0.1);
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

// Ground terrains that feather into each other at their shared edges. Water,
// ponds and mountains are excluded — their edges (beaches, rock) read fine hard.
function isBlendableTerrain(t: WorldTerrain): boolean {
  return (
    t === "plains" ||
    t === "desert" ||
    t === "high-desert" ||
    t === "coastal" ||
    t === "tropical" ||
    t === "ice"
  );
}

// Feather the seam between neighbouring terrain families. Each of the four iso
// edges shared with a differently-typed land neighbour gets a translucent wedge
// of that neighbour's tone, running from the edge toward the tile centre — so
// tan desert bleeds into green plains across a soft band instead of a hard line.
// Where a tile borders several types the wedges overlap at the centre and mix,
// which is exactly the muddled transition ground you want.
function drawTerrainBlend(g: Graphics, world: WorldState, tile: WorldTile) {
  if (!isBlendableTerrain(tile.terrain)) return;
  const T: [number, number] = [0, -TILE_H / 2];
  const R: [number, number] = [TILE_W / 2, 0];
  const B: [number, number] = [0, TILE_H / 2];
  const L: [number, number] = [-TILE_W / 2, 0];
  const edges: [number, number, [number, number], [number, number]][] = [
    [tile.x, tile.y - 1, T, R], // up-right edge
    [tile.x + 1, tile.y, R, B], // down-right edge
    [tile.x, tile.y + 1, B, L], // down-left edge
    [tile.x - 1, tile.y, L, T], // up-left edge
  ];
  for (const [nx, ny, a, b] of edges) {
    const n = tileAt(world, nx, ny);
    if (!n || n.terrain === tile.terrain || !isBlendableTerrain(n.terrain)) continue;
    const col = (TERRAIN[n.terrain] ?? TERRAIN.plains).top;
    g.poly([a[0], a[1], b[0], b[1], 0, 0]).fill({ color: col, alpha: 0.24 });
  }
}

// ---- Flat ground cover (painted onto the tile's top diamond) --------------
function drawGroundTexture(
  g: Graphics,
  tile: WorldTile,
  pal: { top: number; side: number; detail: number },
  topColor: number,
) {
  const { v } = tileLook(tile);
  // Multi-tone dapple on solid land (not open water, not a glassy pond, not
  // bare rock).
  if (tile.terrain !== "water" && tile.terrain !== "mountain" && tile.terrain !== "pond")
    dapple(g, topColor, v);
  switch (tile.terrain) {
    case "water":
      groundWater(g, v, pal.detail);
      break;
    case "pond":
      groundPond(g, v, pal.side, tile.surfaceState ?? "frozen");
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

  // A shaded forest floor under dense foliage. The tile-top diamond tiles
  // seamlessly, so darkening it where the canopy thickens turns a row of
  // separate grove sprites into one continuous woodland — the trees blend
  // because the bright grass gaps between them disappear.
  forestFloor(g, tile);

  if (tile.feature === "river") drawRiver(g, v);
  if (tile.feature === "lake") drawPond(g, v, true);
}

function forestFloor(g: Graphics, tile: WorldTile) {
  let floor: number;
  let shade: number;
  if (tile.terrain === "plains") {
    floor = 0.4;
    shade = 0x3a5a2f;
  } else if (tile.terrain === "tropical") {
    floor = 0.42;
    shade = 0x1e5636;
  } else {
    return;
  }
  const t = ((tile.foliageDensity ?? 0) - floor) / 0.4;
  if (t <= 0) return;
  g.poly(diamond()).fill({ color: shade, alpha: Math.min(0.52, t * 0.62) });
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

// A pond's frozen sheet: a glassy sheen, a couple of hairline stress cracks,
// and a faint skate scuff — distinct from the snowfield `ice` ground cover.
// `crack` is the pond's mid-tone (pal.side). thin-ice reads a touch wetter;
// open-water (future) falls back to rippling like open ocean.
function groundPond(g: Graphics, v: number, crack: number, surface: PondSurfaceState) {
  if (surface === "open-water") {
    groundWater(g, v, crack);
    return;
  }
  const wet = surface === "thin-ice";
  g.ellipse(-2, 0, 17, 8).fill({ color: 0xffffff, alpha: wet ? 0.06 : 0.12 }); // broad sheen
  g.poly([-13, -2, -5, -4, 1, -1, 9, -4]).stroke({ width: 1, color: crack, alpha: wet ? 0.35 : 0.5 });
  if (v % 2 === 0) g.poly([-3, -6, -1, 0, -4, 6]).stroke({ width: 0.8, color: crack, alpha: 0.4 });
  g.poly([3, 5, 8, 2, 14, 5]).stroke({ width: 0.8, color: 0xffffff, alpha: 0.4 }); // skate scuff
  g.circle(9, -4, 2.3).fill({ color: 0xffffff, alpha: wet ? 0.12 : 0.22 }); // glint
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

function groundCoastal(g: Graphics, v: number, _color: number) {
  // A sandy shore, not open water: a pale beach band and faint dry-sand ripples.
  // The old blue wave stroke made inland coastal tiles look like water on land.
  g.poly([-30, 0, -15, 7, 0, 12, 15, 7, 30, 0, 16, 4, 0, 8, -16, 4]).fill({ color: 0xe6ca89, alpha: 0.5 });
  g.poly([-19, -3 + v, -7, -7 + v, 8, -5 + v, 19, -9 + v]).stroke({ width: 1.6, color: 0xcbad68, alpha: 0.42 });
  if (v % 2 === 0) g.poly([-14, 6, 0, 3, 14, 6]).stroke({ width: 1.3, color: 0xd8c07e, alpha: 0.34 });
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
    case "pond":
      return false; // a clean skating sheet — nothing stands on it
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
    // A deeper snowcap for the "ice empires" look: the snowline sits ~42% of the
    // way down the peak, with a jagged lower edge and a couple of snow fingers
    // running further down the gullies. Kept just inside the rock silhouette.
    const f = 0.42;
    const sy = apexY + peakH * f;
    const halfSnow = peakW * 0.5 * f * 0.94;
    ctx.beginPath();
    ctx.moveTo(apexX - halfSnow, sy);
    ctx.quadraticCurveTo(apexX - halfSnow * 0.55, sy + peakH * 0.07, apexX - halfSnow * 0.28, sy - peakH * 0.02);
    ctx.quadraticCurveTo(apexX - halfSnow * 0.08, sy + peakH * 0.11, apexX + halfSnow * 0.12, sy - peakH * 0.02);
    ctx.quadraticCurveTo(apexX + halfSnow * 0.34, sy + peakH * 0.09, apexX + halfSnow * 0.6, sy - peakH * 0.01);
    ctx.quadraticCurveTo(apexX + halfSnow * 0.82, sy + peakH * 0.05, apexX + halfSnow, sy);
    ctx.lineTo(apexX, apexY);
    ctx.closePath();
    const snowG = ctx.createLinearGradient(0, apexY, 0, sy);
    snowG.addColorStop(0, "#f6f9fc");
    snowG.addColorStop(1, "#cfdae6");
    ctx.fillStyle = snowG;
    ctx.fill();
    // A soft shaded underside so the snow reads as a rounded cap, not a decal.
    ctx.strokeStyle = "rgba(120,140,165,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(apexX - halfSnow * 0.9, sy - peakH * 0.01);
    ctx.quadraticCurveTo(apexX, sy + peakH * 0.05, apexX + halfSnow * 0.9, sy - peakH * 0.01);
    ctx.stroke();
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
    // A cluster of peaks so a mid tile reads as a rugged massif, not a lone bump:
    // a low mound behind, a secondary peak, then a taller snow-dusted summit.
    paintMound(ctx, cx - w * 0.3, base, h * 0.3, w * 0.42, "#7b8580", "#626b67", "#505753");
    paintPeak(ctx, cx - w * 0.16, base, h * 0.5, w * 0.4, -2, variant >= 1);
    paintPeak(ctx, cx + w * 0.18 + lean, base, h * 0.66, w * 0.5, lean, true);
  } else {
    // high peak — a back ridge of snow-capped summits behind a dominant, deeply
    // snow-covered central peak.
    paintPeak(ctx, cx - w * 0.2, base, h * 0.5, w * 0.4, -2, variant !== 0);
    if (variant >= 1) paintPeak(ctx, cx + w * 0.22, base, h * 0.54, w * 0.42, 2, true);
    paintPeak(ctx, cx + lean, base, h * 0.74, w * 0.52, lean, true);
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

// A grove of `count` broadleaf trees (1 = a lone sapling, 5 = a packed forest
// core). Trees are drawn back-to-front so nearer crowns overlap farther ones,
// reading as depth within a cluster.
const BROADLEAF_LAYOUT: { x: number; dy: number; w: number; h: number }[] = [
  { x: 0.5, dy: 0, w: 20, h: 26 }, // center anchor (always present)
  { x: 0.26, dy: -3, w: 16, h: 22 },
  { x: 0.74, dy: -2, w: 17, h: 23 },
  { x: 0.12, dy: 2, w: 14, h: 19 }, // reaches the tile edge to meet the next grove
  { x: 0.88, dy: 1, w: 15, h: 20 },
];

function paintBroadleafGrove(ctx: Ctx, w: number, h: number, variant: number, count: number) {
  const base = h - 4;
  const trees = BROADLEAF_LAYOUT.slice(0, Math.max(1, Math.min(5, count)))
    .slice()
    .sort((a, b) => a.dy - b.dy);
  trees.forEach((t, i) => {
    // Per-(variant,index) offset so the five variants are genuinely different
    // arrangements, not the same trees redrawn.
    const dx = (tileVisualRand(variant, i, 71) - 0.5) * w * 0.16;
    const dy = (tileVisualRand(variant, i, 72) - 0.5) * 5;
    drawBroadleafTree(ctx, w * t.x + dx, base + t.dy + dy, t.w, t.h, variant + i);
  });
  grain(ctx, w * 0.14, h * 0.16, w * 0.7, h * 0.7, 20);
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

const PINE_LAYOUT: { x: number; dy: number; w: number; h: number }[] = [
  { x: 0.5, dy: 0, w: 20, h: 34 }, // tallest, front-center (always present)
  { x: 0.26, dy: -2, w: 18, h: 30 },
  { x: 0.74, dy: -1, w: 16, h: 27 },
  { x: 0.12, dy: 2, w: 15, h: 24 }, // reaches the tile edge to meet the next grove
  { x: 0.88, dy: 1, w: 14, h: 22 },
];

function paintPineGrove(ctx: Ctx, w: number, h: number, variant: number, snow: boolean, count: number) {
  const base = h - 4;
  const trees = PINE_LAYOUT.slice(0, Math.max(1, Math.min(5, count)))
    .slice()
    .sort((a, b) => a.dy - b.dy);
  trees.forEach((t, i) => {
    const dx = (tileVisualRand(variant, i, 71) - 0.5) * w * 0.16;
    const dy = (tileVisualRand(variant, i, 72) - 0.5) * 5;
    drawPineTree(ctx, w * t.x + dx, base + t.dy + dy, t.w, t.h, variant + i, snow);
  });
  grain(ctx, w * 0.22, h * 0.16, w * 0.58, h * 0.66, 18);
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

// A cluster of `count` palms at height `scale` (1 = full, ~0.7 = short oasis).
// Spaced wide so desert palms read as a scattered oasis, not a packed grove.
function paintPalmGrove(ctx: Ctx, w: number, h: number, variant: number, count = 2, scale = 1) {
  const base = h - 4;
  drawPalmTree(ctx, w * 0.3, base - 1, 30 * scale, 34 * scale, variant);
  if (count >= 2) drawPalmTree(ctx, w * 0.72, base, 24 * scale, 29 * scale, variant + 1);
  if (count >= 3) drawPalmTree(ctx, w * 0.5, base + 1, 20 * scale, 25 * scale, variant + 2);
}

// How full a grove is on this tile, from the smooth foliage-density field: 0 is
// open ground, 1-5 is a grove of that many trees. Below `floor` the tile is a
// clearing; above it both the odds of a grove and its tree count ramp up, so a
// forest reads as a thick core thinning to scattered trees at the edge.
function vegetationSprite(tile: WorldTile, world: WorldState): Sprite | null {
  const look = tileLook(tile);
  const v = look.v; // 0-4: five distinct grove arrangements per type, not three
  // Grove presence/size comes from the shared engine predicate so the map and
  // harvest eligibility can never disagree about where trees are.
  const t = groveIntensity(world, tile);
  const grove = t > 0 ? 1 + Math.round(t * 4) : 0;
  let sp: Sprite | null = null;

  if (tile.terrain === "tropical") {
    // Lush broadleaf jungle — dense, blending canopy rather than bare palm
    // trunks. Palms now live on the desert as oases (below).
    const n = grove;
    if (n > 0) {
      sp = new Sprite(landformTexture(`jungle-grove-${v}-${n}`, 48, 36, (c) => paintBroadleafGrove(c, 48, 36, v, n)));
      sp.alpha = 0.92;
    }
  } else if (tile.terrain === "desert") {
    // Sparse, short oasis palms — a rare accent well spaced across the dunes.
    if (tileRand(tile.x, tile.y, 27) < 0.045) {
      const count = tileRand(tile.x, tile.y, 28) < 0.35 ? 2 : 1;
      sp = new Sprite(
        landformTexture(`oasis-palm-${v}-${count}`, 46, 30, (c) => paintPalmGrove(c, 46, 30, v, count, 0.72)),
      );
      sp.alpha = 0.92;
    }
  } else if (tile.terrain === "ice") {
    const n = grove;
    if (n > 0) {
      sp = new Sprite(landformTexture(`pine-snow-grove-${v}-${n}`, 50, 42, (c) => paintPineGrove(c, 50, 42, v, true, n)));
      sp.alpha = 0.9;
    }
  } else if (tile.terrain === "plains") {
    const n = grove;
    if (n > 0) {
      // Higher plains carry conifers; the lowlands are broadleaf woods.
      const pineMix = (tile.elevation ?? 0) > 0.54 && look.v % 2 === 0;
      sp = pineMix
        ? new Sprite(landformTexture(`pine-grove-${v}-${n}`, 50, 42, (c) => paintPineGrove(c, 50, 42, v, false, n)))
        : new Sprite(landformTexture(`broadleaf-grove-${v}-${n}`, 48, 36, (c) => paintBroadleafGrove(c, 48, 36, v, n)));
      sp.alpha = 0.9;
    }
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

// A wandering neutral unit (docs/18): a hooded traveler mid-journey — muted
// earthy cloak, a walking staff, and a bindle bundle over the shoulder. No team
// color, no banner: reads instantly as an outsider passing through, distinct
// from the bright parka Pond Scout. Disposition (friend/foe) is deliberately
// NOT shown here — the tell lives in the encounter.
const NOMAD_CLOAK = 0x6b5b4a;
const NOMAD_CLOAK_DK = 0x483d31;
const NOMAD_CLOAK_LT = 0x8b7a63;
const NOMAD_STAFF = 0x7a5a36;
const NOMAD_STAFF_LT = 0xa9865a;
const NOMAD_BINDLE = 0x9a5f52;

function wandererMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
) {
  const s = new Graphics();
  s.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  s.zIndex = gx + gy + 0.55;

  // contact shadow
  s.ellipse(0, 1, 10, 4).fill({ color: 0x000000, alpha: 0.32 });

  // walking staff planted to the right, with a bindle bundle tied at the top
  s.roundRect(9, -46, 2.2, 48, 1).fill(NOMAD_STAFF);
  s.roundRect(9, -46, 0.9, 48, 1).fill({ color: NOMAD_STAFF_LT, alpha: 0.85 });
  s.circle(10.2, -46, 4.6).fill(NOMAD_BINDLE);
  s.circle(10.2, -46, 4.6).stroke({ width: 0.8, color: darkenBy(NOMAD_BINDLE, 0.3) });
  s.roundRect(8.4, -47.4, 3.6, 2, 1).fill({ color: darkenBy(NOMAD_BINDLE, 0.25), alpha: 0.7 }); // knot

  // chunky boots
  s.roundRect(-6, -4, 6, 4, 1.5).fill(BOOT);
  s.roundRect(0.4, -4, 6, 4, 1.5).fill(BOOT);

  // long travelling cloak — flared hem, body, shaded right side + center seam
  s.poly([-10, -12, 10, -12, 7, -2, -7, -2]).fill(NOMAD_CLOAK);
  s.roundRect(-8.5, -30, 17, 20, 5).fill(NOMAD_CLOAK);
  s.roundRect(2.5, -30, 6, 20, 4).fill({ color: NOMAD_CLOAK_DK, alpha: 0.5 });
  s.roundRect(-0.7, -30, 1.4, 26, 0.6).fill({ color: NOMAD_CLOAK_DK, alpha: 0.7 });

  // right arm gripping the staff
  s.roundRect(6, -30, 5, 10, 3).fill(NOMAD_CLOAK);
  s.circle(10, -24, 2.3).fill(NOMAD_CLOAK_DK);

  // hood + shadowed interior, face peeking out with a two-eye gaze
  s.circle(0, -37, 7.6).fill(NOMAD_CLOAK);
  s.circle(0, -37, 5.4).fill(NOMAD_CLOAK_DK);
  s.circle(0, -36.5, 4.6).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE });
  s.circle(-1.7, -36.7, 0.8).fill(EYE);
  s.circle(1.8, -36.7, 0.8).fill(EYE);
  // hood peak pulled up over the head
  s.poly([-6, -41.5, 6, -41.5, 0, -48]).fill(NOMAD_CLOAK_LT);

  return s;
}

// The Club Scout (D38): the professional tier — long charcoal overcoat, a
// club-accent flat cap and scarf, nose down in a clipboard of reports. No
// banner, no expedition fur: this one watches games for a living. Reads
// instantly different from the bright parka-and-banner Pond Scout at any zoom.
const OVERCOAT = 0x2e3540;
const OVERCOAT_DK = 0x20252e;
const OVERCOAT_LT = 0x49525f;
const PAPER = 0xf2ead6;
const PAPER_LINE = 0x9aa0a6;
const BOARD = 0x6b4a2c;

function clubScoutMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  selected: boolean | undefined,
  accent: number,
) {
  const s = new Graphics();
  s.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  s.zIndex = gx + gy + 0.6;

  const capColor = accent;
  const capDark = darkenBy(accent, 0.35);
  const scarf = lighten(accent, 0.2);

  if (selected) {
    s.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  s.ellipse(0, 1, 11, 4).fill({ color: 0x000000, alpha: 0.35 });

  // polished shoes + trousers — no snow boots for this one
  s.roundRect(-6.5, -3.5, 6, 3.5, 1.5).fill(0x14171c);
  s.roundRect(0.5, -3.5, 6, 3.5, 1.5).fill(0x14171c);
  s.roundRect(-5, -13, 4.5, 10, 2).fill(0x272d36);
  s.roundRect(0.5, -13, 4.5, 10, 2).fill(0x272d36);

  // long charcoal overcoat, knee length, with a right-side shade + buttons
  s.roundRect(-10, -32, 20, 22, 5).fill(OVERCOAT);
  s.roundRect(4, -31, 6, 20, 4).fill({ color: OVERCOAT_DK, alpha: 0.6 });
  s.roundRect(-10, -32, 3, 22, 4).fill({ color: OVERCOAT_LT, alpha: 0.5 });
  s.circle(-0.5, -26, 0.8).fill(OVERCOAT_LT);
  s.circle(-0.5, -22, 0.8).fill(OVERCOAT_LT);
  s.circle(-0.5, -18, 0.8).fill(OVERCOAT_LT);
  // club-accent scarf tucked into the collar, one tail down the chest
  s.roundRect(-7.5, -32.5, 15, 3.4, 1.6).fill(scarf);
  s.roundRect(2, -30.5, 3.4, 9, 1.4).fill(scarf);
  s.roundRect(2, -30.5, 3.4, 9, 1.4).stroke({ width: 0.7, color: capDark, alpha: 0.5 });

  // clipboard held up in both hands — the signature prop
  s.poly([-13, -25, -8, -28, -6, -21, -11, -18]).fill(OVERCOAT); // left arm out
  s.poly([8, -28, 12, -26, 10, -19, 6, -21]).fill({ color: OVERCOAT_DK, alpha: 0.9 }); // right arm
  s.roundRect(-9, -27.5, 15, 10.5, 1.4).fill(BOARD).stroke({ width: 1, color: 0x4d3620 });
  s.roundRect(-8, -26.5, 13, 8.5, 1).fill(PAPER);
  s.roundRect(-6.5, -24.6, 10, 1, 0.5).fill({ color: PAPER_LINE, alpha: 0.8 });
  s.roundRect(-6.5, -22.4, 10, 1, 0.5).fill({ color: PAPER_LINE, alpha: 0.65 });
  s.roundRect(-6.5, -20.2, 7, 1, 0.5).fill({ color: PAPER_LINE, alpha: 0.5 });
  s.roundRect(-3.5, -28.4, 4, 1.8, 0.8).fill(0x8c98a4); // clip

  // bare head (no hood), gaze angled down at the notes
  s.circle(0, -37.5, 4.8).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE });
  s.circle(-1.7, -36.6, 0.8).fill(EYE);
  s.circle(1.9, -36.6, 0.8).fill(EYE);
  // club-accent flat cap with a forward brim
  s.ellipse(0, -41.2, 6.4, 3.2).fill(capColor);
  s.ellipse(-1, -42, 5.2, 2.4).fill({ color: lighten(accent, 0.28), alpha: 0.7 });
  s.roundRect(-6.2, -40.4, 12.4, 1.6, 0.8).fill(capDark); // band
  s.poly([2, -40, 8.2, -39.4, 7.4, -37.8, 2, -38.6]).fill(capDark); // brim

  // cold breath while he mutters over the numbers
  s.circle(6, -33, 1.2).fill({ color: 0xffffff, alpha: 0.14 });

  return s;
}

// The Builder (Rink Rats): blue-collar and under-paid — canvas work coat,
// club-accent toque, work gloves, and a shovel over the shoulder. Reads
// instantly different from the parka-and-banner Scout at any zoom.
const COAT = 0xb08144; // waxed canvas
const COAT_DK = 0x8a6230;
const COAT_LT = 0xd0a266;
const GLOVE = 0x6e4a2c;
const SHOVEL_WOOD = 0x9a7240;
const SHOVEL_STEEL = 0xb9c2cc;

function builderMarker(
  gx: number,
  gy: number,
  c: { x: number; y: number },
  selected: boolean | undefined,
  accent: number,
) {
  const s = new Graphics();
  s.position.set(isoX(gx, gy) - c.x, isoY(gx, gy) - c.y);
  s.zIndex = gx + gy + 0.6;

  if (selected) {
    s.ellipse(0, 1, 15, 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.9 });
  }
  s.ellipse(0, 1, 11, 4).fill({ color: 0x000000, alpha: 0.35 });

  // shovel planted over the right shoulder (blade up — off shift, mid-lean)
  s.roundRect(12.2, -46, 2.6, 46, 1).fill(SHOVEL_WOOD);
  s.roundRect(12.2, -46, 1, 46, 1).fill({ color: lighten(SHOVEL_WOOD, 0.3), alpha: 0.8 });
  // scoop blade: rounded square with a shallow curve at the mouth
  s.roundRect(10, -56, 7, 10, 2.4).fill(SHOVEL_STEEL).stroke({ width: 1, color: 0x7d8791 });
  s.roundRect(11.2, -56, 4.6, 3, 1.2).fill({ color: 0xffffff, alpha: 0.35 }); // glint
  s.ellipse(13.5, 1, 6, 2.4).fill({ color: 0xeaf2fb, alpha: 0.85 });

  // work boots + canvas pants
  s.roundRect(-6.5, -4, 6.5, 4, 1.5).fill(BOOT);
  s.roundRect(0, -4, 6.5, 4, 1.5).fill(BOOT);
  s.roundRect(-5, -14, 4.5, 11, 2).fill(0x4a4234);
  s.roundRect(0.5, -14, 4.5, 11, 2).fill(0x4a4234);
  s.roundRect(0.5, -14, 4.5, 11, 2).fill({ color: 0x000000, alpha: 0.18 });

  // canvas work coat, tool-belt, chest flannel stripes
  s.roundRect(-9.5, -31, 19, 20, 5).fill(COAT);
  s.roundRect(3, -30, 6, 18, 4).fill({ color: COAT_DK, alpha: 0.5 });
  s.roundRect(-9.5, -15.5, 19, 3.4, 1.5).fill(0x3a3128); // tool belt
  s.roundRect(-3.5, -15.8, 3.4, 4, 1).fill(BRASS_LT).stroke({ width: 0.7, color: BRASS_DK }); // buckle
  s.roundRect(5, -15.6, 3, 3.6, 0.8).fill(0x8a8f96); // hanging hammer head
  s.roundRect(-9.5, -25.5, 19, 2.2, 1).fill({ color: accent, alpha: 0.85 }); // club stripe
  s.roundRect(-0.8, -31, 1.6, 12, 0.6).fill({ color: COAT_DK, alpha: 0.8 });

  // right arm up gripping the shovel shaft
  s.roundRect(7, -30, 6, 9, 3).fill(COAT);
  s.poly([8, -29.5, 11, -29.5, 13.6, -34, 11, -35.5]).fill(COAT);
  s.circle(13.4, -34.5, 2.4).fill(GLOVE);

  // left arm relaxed at the side, gloved
  s.roundRect(-13, -30, 6, 13, 3).fill(COAT);
  s.roundRect(-13, -30, 2.2, 13, 2).fill({ color: COAT_LT, alpha: 0.4 });
  s.circle(-10, -16.5, 2.4).fill(GLOVE);

  // club-accent knit toque with a pom, no hood — face out in the cold.
  // (Drawn dome-first so the face and band overlap its lower half; no arc()
  // chaining, which fans a giant wedge off the open path in Pixi.)
  s.circle(0, -42.2, 5.2).fill(accent); // toque dome
  s.circle(0, -38.4, 5.2).fill(SKIN).stroke({ width: 1, color: SKIN_SHADE });
  s.circle(-1.9, -38.2, 0.85).fill(EYE);
  s.circle(2, -38.2, 0.85).fill(EYE);
  // a working man's stubble
  s.rect(-3, -35.6, 6, 1.6).fill({ color: 0x8a6a50, alpha: 0.45 });
  s.roundRect(-5.4, -42.6, 10.8, 2.4, 1.2).fill(darkenBy(accent, 0.25)); // knit band
  s.circle(0, -47.6, 1.8).fill(lighten(accent, 0.4)); // pom
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
  onOpenIndependent,
  headerTools,
  railSlot,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenHQ?: () => void;
  onOpenIndependent?: (orgId: string) => void;
  headerTools?: ReactNode;
  // The command rail (Next Tasks / End Turn). Docked bottom-right alongside the
  // selected-unit card so the two read as one Civ VI-style action cluster.
  railSlot?: ReactNode;
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
  const cycleUnitsRef = useRef<() => void>(() => {});
  const centerOnSelectedRef = useRef<() => void>(() => {});
  const endTurnRef = useRef<() => void>(() => {});
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

  useEffect(() => {
    const w = state.world;
    const unit = activeScout(w);
    if (!w || !unit || !cameraRef.current) return;
    setSelectedKey(tileKey(unit.x, unit.y));
    const cen = centroid(w);
    cameraRef.current.centerOnLocal(
      isoX(unit.x, unit.y) - cen.x,
      isoY(unit.x, unit.y) - cen.y,
    );
  }, [state.world?.selectedScoutId, state.month]);

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
    const targetTile = tileAt(w, gx, gy);
    if (!targetTile) return;
    const key = tileKey(gx, gy);
    const founder = w.founder;
    const founderMoveable =
      founder && w.founderSelected && !w.hqTile
        ? moveableTilesFor(w, founder)
        : new Set<string>();
    if (founder && w.founderSelected && founderMoveable.has(key)) {
      playSfx(movementSfxForTile(w, targetTile));
      dispatch({ type: "MOVE_FOUNDING_UNIT", x: gx, y: gy });
      setSelectedKey(key);
      return;
    }
    if (
      founder &&
      w.founderSelected &&
      !w.hqTile &&
      playMovementErrorIfImpassable(w, founder, gx, gy)
    ) {
      setSelectedKey(key);
      return;
    }
    if (founder && founder.x === gx && founder.y === gy) {
      dispatch({ type: "SELECT_FOUNDING_UNIT" });
      setSelectedKey(key);
      return;
    }

    const hqHere = !!w.hqTile && w.hqTile.x === gx && w.hqTile.y === gy;
    const contactedOrgHere = w.hockeyOrgs.find(
      (o) => o.playerContacted && o.x === gx && o.y === gy,
    );
    if (contactedOrgHere && onOpenIndependent) {
      setSelectedKey(key);
      onOpenIndependent(contactedOrgHere.id);
      return;
    }

    // Civ behavior: clicking your HQ tile never MOVES a unit onto it — that
    // click means "open the city", not "walk there". Units still step onto
    // the HQ tile via arrow keys.
    const scout = activeScout(w);
    const moveable = scout ? moveableTilesFor(w, scout) : new Set<string>();
    if (scout && moveable.has(key) && !hqHere) {
      playSfx(movementSfxForTile(w, targetTile));
      dispatch({ type: "MOVE_SCOUT", x: gx, y: gy, scoutId: scout.id });
      setSelectedKey(key);
      return;
    }
    if (scout && !hqHere && playMovementErrorIfImpassable(w, scout, gx, gy)) {
      setSelectedKey(key);
      return;
    }

    const scoutsHere = allScouts(w).filter((s) => s.x === gx && s.y === gy);

    // Civ-style tile cycling: a unit standing on the tile takes selection
    // priority — so clicking the HQ tile picks up the scout parked there
    // first; clicking again cycles stacked units, then falls through to open
    // the Club HQ screen. Right-click opens HQ directly (see endDrag).
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

    // The unit on this tile is already selected (or there is none): the click
    // now means "open the Club HQ".
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

  // Tab / ` cycles through your units that still have moves this turn (skips
  // crews locked mid-construction), selecting the next one and snapping the
  // camera to it — Civ's "next unit" convention.
  cycleUnitsRef.current = () => {
    const w = state.world;
    if (!w) return;
    const ready = allScouts(w).filter(
      (u) => u.id && u.movesRemaining > 0 && !u.working,
    );
    if (ready.length === 0) return;
    const idx = ready.findIndex((u) => u.id === w.selectedScoutId);
    const next = ready[(idx + 1) % ready.length];
    if (!next?.id) return;
    if (next.id !== w.selectedScoutId) {
      dispatch({ type: "SELECT_SCOUT", scoutId: next.id });
    }
    setSelectedKey(tileKey(next.x, next.y));
    const cen = centroid(w);
    cameraRef.current?.centerOnLocal(
      isoX(next.x, next.y) - cen.x,
      isoY(next.x, next.y) - cen.y,
    );
  };

  // "c": snap the camera to the actively selected unit without cycling to a
  // different one (the pre-founding Founding Group, otherwise the active scout).
  centerOnSelectedRef.current = () => {
    const w = state.world;
    if (!w) return;
    const unit =
      w.founder && w.founderSelected && !w.hqTile ? w.founder : activeScout(w);
    if (!unit) return;
    const cen = centroid(w);
    cameraRef.current?.centerOnLocal(
      isoX(unit.x, unit.y) - cen.x,
      isoY(unit.x, unit.y) - cen.y,
    );
  };

  // Enter / Return: same as clicking "End Turn" — only when the turn's required
  // tasks are done and no blocking popup is open (mirrors the disabled button).
  endTurnRef.current = () => {
    if (state.pendingMeeting || state.pendingEncounter || state.pendingTryout) {
      return;
    }
    if (canEndMonth(state)) dispatch({ type: "END_MONTH" });
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
        const tile = tileAt(w, x, y);
        if (tile) playSfx(movementSfxForTile(w, tile));
        dispatch({ type: "MOVE_FOUNDING_UNIT", x, y });
        setSelectedKey(tileKey(x, y));
      } else if (playMovementErrorIfImpassable(w, founder, x, y)) {
        setSelectedKey(tileKey(x, y));
      }
      return;
    }
    const scout = activeScout(w);
    if (scout) {
      const x = scout.x + dx;
      const y = scout.y + dy;
      if (moveableTilesFor(w, scout).has(tileKey(x, y))) {
        const tile = tileAt(w, x, y);
        if (tile) playSfx(movementSfxForTile(w, tile));
        dispatch({ type: "MOVE_SCOUT", x, y, scoutId: scout.id });
        setSelectedKey(tileKey(x, y));
      } else if (playMovementErrorIfImpassable(w, scout, x, y)) {
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
      // Tab or ` (backquote/tilde): next unit with moves remaining.
      if (e.code === "Tab" || e.code === "Backquote") {
        e.preventDefault();
        cycleUnitsRef.current();
        return;
      }
      // Leave OS/browser chords (copy, dev panel, etc.) alone.
      const chord = e.metaKey || e.ctrlKey || e.altKey;
      // "c": center the camera on the actively selected unit.
      if (e.code === "KeyC" && !chord) {
        e.preventDefault();
        centerOnSelectedRef.current();
        return;
      }
      // Enter / Return: end the turn (like clicking the End Turn button).
      if ((e.code === "Enter" || e.code === "NumpadEnter") && !chord) {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        endTurnRef.current();
        return;
      }
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
        // Start at MAX zoom on the HQ — the world is undiscovered, so opening
        // tight on the club sells the fog; the player wheels out as they grow.
        const INITIAL_SCALE = 2.4;
        layer.scale.set(INITIAL_SCALE);
        layer.position.set(
          vw / 2 - focusX * INITIAL_SCALE,
          vh / 2 - focusY * INITIAL_SCALE - 60,
        );
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
        {headerTools}
      </div>
      <div className="iso-stage">
        <div ref={hostRef} className="iso-canvas" />
        <MapControls state={state} selectedKey={selectedKey} />
        <MiniMap state={state} cameraRef={cameraRef} />
        <div className="map-command-dock">
          <UnitOverlay state={state} dispatch={dispatch} />
          {railSlot}
        </div>
      </div>

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

    // Territory wash (D34/D35): owned explored tiles tint in their club's
    // color — player accent plus contacted rivals — so borders read at a glance.
    const territory = computeTerritory(world);
    const playerAccent = accentNumber(getActiveClub(state)?.accent);
    bctx.globalAlpha = 0.4;
    for (const key in territory.ownerByTile) {
      if (!state.devRevealAll && !revealedSet.has(key)) continue;
      const [tgx, tgy] = key.split(",").map(Number);
      const owner = territory.ownerByTile[key];
      bctx.fillStyle = cssHex(
        owner === PLAYER_OWNER ? playerAccent : accentNumber(CLUBS[owner]?.accent),
      );
      bctx.fillRect(tgx, tgy, 1, 1);
    }
    bctx.globalAlpha = 1;

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
    // Wanderers are live info — plot only where the player currently has eyes.
    for (const w of world.wanderers) {
      if (!state.devRevealAll && !visibleSet.has(`${w.x},${w.y}`)) continue;
      dot(w.x, w.y, 0xd08a5a, 2.2, true);
    }
    // Club rinks: bright white dots (level 1+) / faint for cleared ponds.
    for (const rink of world.rinks) {
      if (!state.devRevealAll && !revealedSet.has(`${rink.x},${rink.y}`)) continue;
      dot(rink.x, rink.y, 0xffffff, rink.level >= 1 ? 2.4 : 1.8, rink.level >= 1);
    }
    const accent = accentNumber(getActiveClub(state)?.accent);
    if (world.founder) dot(world.founder.x, world.founder.y, accent, 2.8, true);
    for (const scout of allScouts(world)) {
      // Club Scouts plot gold so the professional eye is findable at a glance.
      const dotColor = scout.unitDefId === "club-scout" ? 0xf2c14e : 0x38bdf8;
      dot(scout.x, scout.y, dotColor, 2.8, scout.id === world.selectedScoutId);
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
  const isBuilder = !isLeader && unit.kind === "builder";
  const isClubScout = !isLeader && !isBuilder && unit.unitDefId === "club-scout";
  const club = getActiveClub(state);
  const name = isLeader
    ? "Leader"
    : unit.name ?? (isBuilder ? "Rink Rats" : "Pond Scout");
  // The role line names the UNIT TYPE — the name above is the person.
  const role = isLeader
    ? "Founding Group"
    : isBuilder
      ? "Construction Crew"
      : isClubScout
        ? "Club Scout"
        : "Pond Scout";
  const outOfMoves = unit.movesRemaining <= 0;
  const working = !isLeader ? unit.working : undefined;

  // Scout field orders are tied to the tile the unit is standing on. Goodie huts
  // and first contact with independents/rivals auto-resolve into a pop-up on
  // arrival — no manual order for them.
  // Builder orders (kind-gated inside builderSystem's can* predicates).
  const unitId = unit.id ?? "";
  const showClearSnow = isBuilder && canClearSnow(state, unitId);
  const showBuildRink = isBuilder && canBuildRink(state, unitId);
  const showPave = isBuilder && canPaveStreetRink(state, unitId);
  const showHarvest = isBuilder && canHarvestBranches(state, unitId);
  // Scout orders (Civ VI-style unit actions): establish a network at a
  // contacted indie, then begin/end an observation assignment there.
  const networkOrg =
    !isLeader && !isBuilder ? networkTargetOrg(state, unitId) : null;
  const missionOrg =
    !isLeader && !isBuilder ? missionTargetOrg(state, unitId) : null;
  const onMission = working?.task === "scout-org";
  const missionOrgName = onMission
    ? world.hockeyOrgs.find((o) => o.id === working.orgId)
    : null;
  const hasOrder = isLeader
    ? !!club
    : showClearSnow ||
      showBuildRink ||
      showPave ||
      showHarvest ||
      !!networkOrg ||
      !!missionOrg ||
      onMission;

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
          <ItemArt
            kind="unit"
            id={isBuilder ? "rink-rats" : isClubScout ? "club-scout" : "pond-scout"}
          />
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
        {!isLeader && (unit.penaltyBoxTurns ?? 0) > 0 && (
          <div className="unit-penalty">
            🥊 In the penalty box — {unit.penaltyBoxTurns} more turn
            {unit.penaltyBoxTurns === 1 ? "" : "s"}. A wanderer's scrap left them
            cooling off.
          </div>
        )}
        <div className="unit-orders">
          {isLeader && club && (
            <button
              className="btn btn-gold btn-block"
              onClick={() => dispatch({ type: "FOUND_CLUB", clubId: club.id })}
            >
              Found {shortClubLabel(club)} Here
            </button>
          )}
          {showClearSnow && (
            <button
              className="btn btn-primary btn-block"
              onClick={() => dispatch({ type: "CLEAR_SNOW", unitId })}
            >
              Clear Snow (ends turn)
            </button>
          )}
          {showBuildRink && (
            <button
              className="btn btn-gold btn-block"
              onClick={() => dispatch({ type: "BUILD_RINK", unitId })}
            >
              Build Level 1 Rink (2 turns)
            </button>
          )}
          {showPave && (
            <button
              className="btn btn-gold btn-block"
              onClick={() => dispatch({ type: "BUILD_RINK", unitId })}
            >
              Pave Street Rink (2 turns)
            </button>
          )}
          {showHarvest && (
            <button
              className="btn btn-primary btn-block"
              onClick={() => dispatch({ type: "HARVEST_BRANCHES", unitId })}
            >
              Harvest Branches (+2 Equipment)
            </button>
          )}
          {networkOrg && (
            <button
              className="btn btn-gold btn-block"
              onClick={() =>
                dispatch({ type: "ESTABLISH_NETWORK", unitId, orgId: networkOrg.id })
              }
            >
              Establish Scouting Network — {hockeyOrgDisplayName(networkOrg)}
            </button>
          )}
          {missionOrg && (
            <button
              className="btn btn-gold btn-block"
              onClick={() =>
                dispatch({ type: "BEGIN_SCOUT_MISSION", unitId, orgId: missionOrg.id })
              }
            >
              Begin Scouting Assignment — {hockeyOrgDisplayName(missionOrg)}
            </button>
          )}
          {onMission && (
            <button
              className="btn btn-block"
              onClick={() => dispatch({ type: "RECALL_SCOUT", unitId })}
            >
              Recall Scout (ends assignment)
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
        {working ? (
          <div className="unit-hint muted">
            {working.task === "scout-org"
              ? `On assignment at ${
                  missionOrgName ? hockeyOrgDisplayName(missionOrgName) : "the org"
                } — a fresh report every 2 turns.`
              : `Working — ${
                  working.rinkKind === "ice" ? "building a rink" : "paving a rink"
                }, ${working.monthsRemaining} turn${working.monthsRemaining === 1 ? "" : "s"} to go.`}
          </div>
        ) : (
          !hasOrder && (
            <div className="unit-hint faint">
              {outOfMoves
                ? "Out of moves this turn."
                : isBuilder
                  ? "Move to a frozen pond to clear it, or a grove to harvest sticks."
                  : "Click a highlighted tile or use the arrow keys to move."}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ---- Side controls (scout + selected-tile detail) ------------------------

// Player-facing terrain names + what's actually on the tile.
const TERRAIN_LABELS: Record<string, string> = {
  coastal: "Coastal Shore",
  desert: "Desert",
  "high-desert": "High Desert",
  ice: "Snowfield",
  mountain: "Mountains",
  plains: "Plains",
  pond: "Frozen Pond",
  tropical: "Tropical Green",
  water: "Open Water",
};

function terrainLabel(tile: WorldTile): string {
  let label = TERRAIN_LABELS[tile.terrain] ?? "Terrain";
  if (tile.terrain === "pond" && tile.surfaceState !== "frozen") {
    label = tile.surfaceState === "thin-ice" ? "Pond (thin ice)" : "Pond (open water)";
  }
  return label;
}

function terrainNotes(tile: WorldTile, state: GameState): string {
  const notes: string[] = [];
  if (state.world && hasVisibleGrove(state.world, tile)) {
    notes.push(
      state.completedResearch.includes("stick-gear-basics")
        ? "Trees — Rink Rats can Harvest Branches here."
        : "Trees — harvestable for stickwood once you know Stick & Gear Basics.",
    );
  } else if ((tile.foliageDensity ?? 0) > 0.15) {
    notes.push("Scattered brush, nothing worth cutting.");
  }
  if (tile.feature === "river") notes.push("A river runs through it.");
  if (tile.feature === "lake") notes.push("Lake water — impassable.");
  if (tile.terrain === "pond" && tile.surfaceState === "frozen") {
    notes.push("Skateable ice: clear the snow and a rink can rise here.");
  }
  if ((tile.terrain === "desert" || tile.terrain === "high-desert") && tile.valid) {
    notes.push("Paveable flat — street rinks live here (Asphalt Crew).");
  }
  if (!tile.valid) notes.push("Impassable for units.");
  return notes.length ? notes.join(" ") : "Nothing of hockey interest here yet.";
}

function MapControls({
  state,
  selectedKey,
}: {
  state: GameState;
  selectedKey: string | null;
}) {
  const sel = selectedKey ? selectedKey.split(",").map(Number) : null;
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
  const selTile =
    sel && state.world ? tileAt(state.world, sel[0], sel[1]) : null;
  const selRink = sel && state.world ? rinkAt(state.world, sel[0], sel[1]) : null;
  const selRinkIsClub =
    selRink && state.world
      ? getClubRinks(state.world, 0).some((r) => r.id === selRink.id)
      : false;

  return (
    <div className="iso-controls">
      {!sel && null}

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

      {sel && revealed && selRink && (
        <div className="map-detail">
          <div className="detail-head">
            <strong>
              {selRink.level >= 1
                ? selRink.kind === "ice"
                  ? "Level 1 Outdoor Rink"
                  : "Street Hockey Rink"
                : "Cleared Pond"}
            </strong>
            <span className="region-resource">
              {selRink.level >= 1 ? `Built Turn ${selRink.builtMonth}` : "Ready for a rink"}
            </span>
          </div>
          <div className="region-report">
            {selRink.ownerClubId
              ? `Built by ${CLUBS[selRink.ownerClubId]?.name ?? "a rival club"} — their ice, their pride, none of your benefits.`
              : selRink.level >= 1
                ? `${selRinkIsClub ? "A club rink — it pays +1 Funds/turn and hosts tryouts. " : "Beyond your HQ's reach — no club benefits from here. "}${
                    selRink.kind === "ice" ? "Ice, boards, and pride." : "Asphalt, nets, and orange wheels."
                  }`
                : "Shoveled clear by your crew. With Outdoor Rinkcraft, the Rink Rats can raise a Level 1 rink here."}
          </div>
        </div>
      )}

      {sel && !(org && revealed) && !selRink && (
        <div className="map-detail">
          {revealed && marker ? (
            <span className="muted">
              Goodie hut · {marker.kind.replace("-", " ")} — move a scout onto it
              to investigate. It resolves on arrival, then disappears.
            </span>
          ) : revealed ? (
            <>
              <div className="detail-head">
                <strong>{selTile ? terrainLabel(selTile) : "Terrain"}</strong>
                {!selVisible && <span className="region-resource">out of sight</span>}
              </div>
              <div className="region-report">
                {selTile ? terrainNotes(selTile, state) : ""}
                {!selVisible && " Last charted earlier — no current sightline."}
              </div>
            </>
          ) : (
            <span className="faint">Unexplored — shrouded in fog.</span>
          )}
        </div>
      )}

    </div>
  );
}

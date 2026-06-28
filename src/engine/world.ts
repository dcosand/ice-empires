import type {
  GameState,
  WorldState,
  WorldFeature,
  WorldTerrain,
  WorldTile,
  WorldUnit,
} from "../types/game";
import { REGIONS } from "../data/regions";

// The persistent world. The founding tile map IS the in-game world — the same
// grid, fog, and HQ carry from founding into Month 1+. Generated at game start.
export const WORLD_WIDTH = 120;
export const WORLD_HEIGHT = 75;
export const FOUNDER_MOVES = 2;
export const SCOUT_MOVES = 3;
const START = {
  x: Math.floor(WORLD_WIDTH / 2),
  y: Math.floor(WORLD_HEIGHT / 2),
};

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function tileAt(
  world: WorldState,
  x: number,
  y: number,
): WorldTile | undefined {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return undefined;
  return world.tiles[y * world.width + x];
}

export function isAdjacent(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

// Keys for a tile and its 8 in-bounds neighbors.
function revealKeys(cx: number, cy: number): string[] {
  const keys: string[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const x = cx + dx;
      const y = cy + dy;
      if (x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT) {
        keys.push(tileKey(x, y));
      }
    }
  }
  return keys;
}

// Union the existing revealed set with the fog around (x,y).
export function addReveal(revealed: string[], x: number, y: number): string[] {
  return Array.from(new Set([...revealed, ...revealKeys(x, y)]));
}

export function isRevealed(world: WorldState, x: number, y: number): boolean {
  return world.revealed.includes(tileKey(x, y));
}

// Which region (if any) sits on a tile.
export const REGION_BY_TILE: Record<string, string> = Object.fromEntries(
  REGIONS.map((r) => [tileKey(r.tile.x, r.tile.y), r.id]),
);

export function regionIdAtTile(x: number, y: number): string | null {
  return REGION_BY_TILE[tileKey(x, y)] ?? null;
}

export function createWorld(seed = Date.now()): WorldState {
  const tiles: WorldTile[] = [];
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const terrain = generatedTerrain(x, y, seed);
      const feature = generatedFeature(x, y, terrain, seed);
      const variant = Math.floor(noise2d(x, y, seed + 4049) * 4);
      const elevation = generatedElevation(x, y, terrain, feature, seed);
      tiles.push({
        x,
        y,
        terrain,
        variant,
        elevation,
        feature,
        valid: terrain !== "water" && feature !== "lake",
      });
    }
  }

  // Keep the opening tile and its immediate choices playable.
  for (const key of revealKeys(START.x, START.y)) {
    const [x, y] = key.split(",").map(Number);
    const tile = tiles[y * WORLD_WIDTH + x];
    if (tile?.terrain === "water" || tile?.feature === "lake") {
      tiles[y * WORLD_WIDTH + x] = {
        ...tile,
        terrain: "plains",
        feature: undefined,
        elevation: generatedElevation(x, y, "plains", undefined, seed),
        valid: true,
      };
    }
  }

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    tiles,
    revealed: revealKeys(START.x, START.y),
    hqTile: null,
    founder: {
      x: START.x,
      y: START.y,
      movesPerTurn: FOUNDER_MOVES,
      movesRemaining: FOUNDER_MOVES,
    },
    founderSelected: false,
    scout: null,
    scoutSelected: false,
  };
}

function generatedTerrain(x: number, y: number, seed: number): WorldTerrain {
  const nx = x / (WORLD_WIDTH - 1);
  const ny = y / (WORLD_HEIGHT - 1);
  const continental = octaveNoise(x, y, seed);
  const moisture = octaveNoise(x + 700, y - 300, seed ^ 0x9e3779b9);
  const ridge = octaveNoise(x - 500, y + 900, seed + 2718);
  const cold =
    ny * 0.62 +
    noise2d(Math.floor(x / 10), Math.floor(y / 10), seed + 77) * 0.38;
  const elevation = continental * 0.72 + ridge * 0.28;
  const edgeWater =
    nx < 0.03 || nx > 0.97 || ny < 0.03 || ny > 0.97 ? 0.16 : 0;

  if (continental + edgeWater < 0.34) return "water";
  if (continental + edgeWater < 0.42) return "coastal";
  if (elevation > 0.73) return "mountain";
  if (cold > 0.72 || (cold > 0.58 && moisture > 0.58)) return "ice";
  if (cold < 0.32 && moisture > 0.62) return "tropical";
  if (moisture < 0.28 && ny > 0.18) return "desert";
  if (moisture < 0.42 && ny > 0.18) return "high-desert";
  return "plains";
}

// A continuous height field, 0 (sea level) .. ~1.1 (high peaks). Built from the
// same continental/ridge noise as the terrain so highlands cluster naturally,
// plus a per-tile jitter so neighbours of the same terrain still rise and dip.
// This is what gives the map its "z space": rolling plains, sunken basins,
// towering, varied mountains.
function generatedElevation(
  x: number,
  y: number,
  terrain: WorldTerrain,
  feature: WorldFeature | undefined,
  seed: number,
): number {
  const continental = octaveNoise(x, y, seed);
  const ridge = octaveNoise(x - 500, y + 900, seed + 2718);
  const base = continental * 0.72 + ridge * 0.28; // ~0..1
  const jitter = (noise2d(x, y, seed + 5501) - 0.5) * 0.22;

  let e: number;
  switch (terrain) {
    case "water":
      e = 0;
      break;
    case "coastal":
      e = 0.05 + base * 0.07;
      break;
    case "mountain":
      // Tall and the most varied: sharp ridge noise drives real peaks.
      e = 0.6 + ridge * 0.42 + Math.max(0, jitter);
      break;
    case "high-desert":
      e = 0.36 + base * 0.32 + jitter; // elevated plateaus
      break;
    case "ice":
      e = 0.24 + base * 0.3 + jitter;
      break;
    case "desert":
      e = 0.14 + base * 0.22 + jitter;
      break;
    case "tropical":
      e = 0.1 + base * 0.22 + jitter;
      break;
    case "plains":
    default:
      e = 0.13 + base * 0.34 + jitter; // gentle rolling hills
      break;
  }

  // Standing water sits in basins, below the surrounding land.
  if (feature === "lake") e = Math.min(e, 0.04);
  else if (feature === "pond") e *= 0.6;

  return Math.max(0, Math.min(1.12, e));
}

function generatedFeature(
  x: number,
  y: number,
  terrain: WorldTerrain,
  seed: number,
): WorldFeature | undefined {
  if (terrain === "water" || terrain === "mountain") return undefined;
  if (isRiverTile(x, y, terrain, seed)) return "river";

  const basin = smoothNoise(x / 4, y / 4, seed + 1701);
  const wet =
    terrain === "coastal" ||
    terrain === "tropical" ||
    terrain === "ice" ||
    terrain === "plains";
  if (wet && basin > 0.89) return "lake";
  if (wet && basin > 0.82) return "pond";
  return undefined;
}

function isRiverTile(
  x: number,
  y: number,
  terrain: WorldTerrain,
  seed: number,
): boolean {
  if (terrain === "water" || terrain === "ice") return false;
  for (let i = 0; i < 4; i++) {
    const base = ((i + 1) / 5) * WORLD_HEIGHT;
    const phase = noise2d(i * 17, 0, seed + 909) * Math.PI * 2;
    const bend =
      Math.sin(x / (10 + i * 2) + phase) * (5 + i) +
      Math.sin(x / 23 + phase * 0.5) * 4;
    const curveY = base + bend;
    if (Math.abs(y - curveY) < 0.52) return true;
  }
  return false;
}

function octaveNoise(x: number, y: number, seed: number): number {
  return (
    smoothNoise(x / 18, y / 18, seed) * 0.55 +
    smoothNoise(x / 8, y / 8, seed + 101) * 0.3 +
    smoothNoise(x / 4, y / 4, seed + 211) * 0.15
  );
}

function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xf = x - x0;
  const yf = y - y0;
  const top = lerp(noise2d(x0, y0, seed), noise2d(x0 + 1, y0, seed), fade(xf));
  const bottom = lerp(
    noise2d(x0, y0 + 1, seed),
    noise2d(x0 + 1, y0 + 1, seed),
    fade(xf),
  );
  return lerp(top, bottom, fade(yf));
}

function noise2d(x: number, y: number, seed: number): number {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Tiles a unit may move to right now (adjacent, valid land/ice, points left).
export function moveableTilesFor(
  world: WorldState,
  unit: WorldUnit | null,
): Set<string> {
  const out = new Set<string>();
  if (!unit || unit.movesRemaining <= 0) return out;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = unit.x + dx;
      const y = unit.y + dy;
      const tile = tileAt(world, x, y);
      if (tile && tile.valid) out.add(tileKey(x, y));
    }
  }
  return out;
}

// ---- Founding-phase unit (Founding Group) -------------------------------

export function moveFounder(state: GameState, x: number, y: number): GameState {
  const world = state.world;
  if (!world || world.hqTile || !world.founder) return state;
  const unit = world.founder;
  if (unit.movesRemaining <= 0) return state;
  if (!isAdjacent(unit, { x, y })) return state;
  const tile = tileAt(world, x, y);
  if (!tile || !tile.valid) return state;

  return {
    ...state,
    world: {
      ...world,
      founder: { ...unit, x, y, movesRemaining: unit.movesRemaining - 1 },
      revealed: addReveal(world.revealed, x, y),
      founderSelected: true,
    },
  };
}

export function endFoundingTurn(state: GameState): GameState {
  const world = state.world;
  if (!world || world.hqTile || !world.founder) return state;
  return {
    ...state,
    world: {
      ...world,
      founder: { ...world.founder, movesRemaining: world.founder.movesPerTurn },
      founderSelected: true,
    },
  };
}

// Found the club on the Founding Group's tile: HQ goes here, the Founding Group
// becomes Club Leadership (no longer a movable unit), and your first Scout takes
// the ice at HQ — controllable from Month 1 to explore the world.
export function foundOnTile(state: GameState): GameState {
  const world = state.world;
  if (!world || world.hqTile || !world.founder) return state;
  const hq = { x: world.founder.x, y: world.founder.y };
  return {
    ...state,
    world: {
      ...world,
      hqTile: hq,
      founder: null,
      founderSelected: false,
      scout: {
        x: hq.x,
        y: hq.y,
        movesPerTurn: SCOUT_MOVES,
        movesRemaining: SCOUT_MOVES,
      },
      scoutSelected: false,
      revealed: addReveal(world.revealed, hq.x, hq.y),
    },
  };
}

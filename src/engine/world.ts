import type {
  GameState,
  WorldState,
  WorldTerrain,
  WorldTile,
  WorldUnit,
} from "../types/game";
import { REGIONS } from "../data/regions";

// The persistent world. The founding tile map IS the in-game world — the same
// grid, fog, and HQ carry from founding into Month 1+. Hand-authored, not
// procedural.
export const WORLD_WIDTH = 9;
export const WORLD_HEIGHT = 6;
export const FOUNDER_MOVES = 2;
export const SCOUT_MOVES = 3;
const START = { x: 4, y: 3 };

const CHAR_TO_TERRAIN: Record<string, WorldTerrain> = {
  d: "desert",
  i: "ice",
  p: "plains",
  w: "water",
};

const TERRAIN_ROWS = [
  "wppdddiiw",
  "pppdddiip",
  "pdddddiip",
  "pddddpipp",
  "ppdddppip",
  "wppdpppiw",
];

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

export function createWorld(): WorldState {
  const tiles: WorldTile[] = [];
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const terrain = CHAR_TO_TERRAIN[TERRAIN_ROWS[y][x]] ?? "plains";
      tiles.push({ x, y, terrain, valid: terrain !== "water" });
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
// becomes Club Leadership (no longer a movable unit).
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
      revealed: addReveal(world.revealed, hq.x, hq.y),
    },
  };
}

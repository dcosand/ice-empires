import type {
  FoundingMapState,
  FoundingTerrain,
  FoundingTile,
  GameState,
} from "../types/game";

// A tiny, hand-authored tile map for the founding phase. Deliberately NOT
// procedural — just enough to move a unit, peel back fog, and pick a spot.
export const FM_WIDTH = 9;
export const FM_HEIGHT = 6;
export const MOVES_PER_TURN = 2;
const START = { x: 4, y: 3 };

const CHAR_TO_TERRAIN: Record<string, FoundingTerrain> = {
  d: "desert",
  i: "ice",
  p: "plains",
  w: "water",
};

// Center is desert land (the club's home); a little water/ice around the edges
// gives movement and "valid tile" some meaning.
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
  fm: FoundingMapState,
  x: number,
  y: number,
): FoundingTile | undefined {
  if (x < 0 || y < 0 || x >= fm.width || y >= fm.height) return undefined;
  return fm.tiles[y * fm.width + x];
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
      if (x >= 0 && y >= 0 && x < FM_WIDTH && y < FM_HEIGHT) {
        keys.push(tileKey(x, y));
      }
    }
  }
  return keys;
}

export function createFoundingMap(): FoundingMapState {
  const tiles: FoundingTile[] = [];
  for (let y = 0; y < FM_HEIGHT; y++) {
    for (let x = 0; x < FM_WIDTH; x++) {
      const terrain = CHAR_TO_TERRAIN[TERRAIN_ROWS[y][x]] ?? "plains";
      tiles.push({ x, y, terrain, valid: terrain !== "water" });
    }
  }
  return {
    width: FM_WIDTH,
    height: FM_HEIGHT,
    tiles,
    unit: { ...START },
    selected: false,
    revealed: revealKeys(START.x, START.y),
    movesPerTurn: MOVES_PER_TURN,
    movesRemaining: MOVES_PER_TURN,
    founded: null,
  };
}

// Move the Founding Group to an adjacent valid tile (costs 1 movement point),
// revealing the fog around it. No-op when out of movement points.
export function moveFoundingUnit(
  state: GameState,
  x: number,
  y: number,
): GameState {
  const fm = state.foundingMap;
  if (!fm || fm.founded) return state;
  if (fm.movesRemaining <= 0) return state;
  if (!isAdjacent(fm.unit, { x, y })) return state;
  const tile = tileAt(fm, x, y);
  if (!tile || !tile.valid) return state;

  const revealed = Array.from(new Set([...fm.revealed, ...revealKeys(x, y)]));
  return {
    ...state,
    foundingMap: {
      ...fm,
      unit: { x, y },
      revealed,
      movesRemaining: fm.movesRemaining - 1,
      selected: true,
    },
  };
}

// Refresh movement points for a new founding turn.
export function endFoundingTurn(state: GameState): GameState {
  const fm = state.foundingMap;
  if (!fm || fm.founded) return state;
  return {
    ...state,
    foundingMap: { ...fm, movesRemaining: fm.movesPerTurn, selected: true },
  };
}

// Tiles the unit may move to right now (adjacent, valid land, points remaining).
export function moveableTiles(fm: FoundingMapState): Set<string> {
  const out = new Set<string>();
  if (fm.founded || fm.movesRemaining <= 0) return out;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = fm.unit.x + dx;
      const y = fm.unit.y + dy;
      const tile = tileAt(fm, x, y);
      if (tile && tile.valid) out.add(tileKey(x, y));
    }
  }
  return out;
}

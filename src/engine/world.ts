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

  // Keep the opening tile and its immediate choices playable: the founding unit
  // must never spawn (or be able to step onto its first tiles) in the ocean or on
  // an impassable mountain. Convert any such tile in the start neighborhood to
  // plains so the founder always begins on passable terrain.
  for (const key of revealKeys(START.x, START.y)) {
    const [x, y] = key.split(",").map(Number);
    const tile = tiles[y * WORLD_WIDTH + x];
    if (
      tile?.terrain === "water" ||
      tile?.terrain === "mountain" ||
      tile?.feature === "lake"
    ) {
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

// ---- Map generation tunables ---------------------------------------------
// Raise SEA_LEVEL for more ocean / smaller continents; lower it for more land.
const SEA_LEVEL = 0.47; // continent field below this is open water
const COAST_BAND = 0.045; // band just above sea level rendered as coast
const EDGE_MARGIN = 0.16; // outer fraction of the map that falls away to ocean
const EDGE_FALLOFF = 0.6; // how hard that outer margin is pushed underwater
const MOUNTAIN_RIDGE = 0.93; // ridged-noise level that becomes mountains (higher = fewer)
const MOUNTAIN_INLAND = 0.54; // mountains only where the land field is this high
const BIOME_JITTER_T = 0.1; // per-tile temperature wobble for within-cluster variety
const BIOME_JITTER_M = 0.16; // per-tile moisture wobble for within-cluster variety

// Landmass field. A domain-warped, medium-frequency noise gathers land into
// several discrete masses (continents) with irregular, fragmented coastlines,
// and only the OUTER MARGIN falls away to ocean — so the interior can split into
// multiple continents separated by open sea rather than one central pangaea.
function continentField(x: number, y: number, seed: number): number {
  // Warp the sample point so coastlines are ragged (bays, straits, islands).
  const wx = x + (smoothNoise(x / 26, y / 26, seed + 51) - 0.5) * 28;
  const wy = y + (smoothNoise(x / 26, y / 26, seed + 71) - 0.5) * 28;
  const base =
    smoothNoise(wx / 22, wy / 22, seed) * 0.5 +
    smoothNoise(wx / 11, wy / 11, seed + 101) * 0.32 +
    smoothNoise(wx / 5, wy / 5, seed + 211) * 0.18;
  // Edge-only falloff: interior untouched, only the outer EDGE_MARGIN ring sinks
  // so land never reaches the border but inland seas can still divide continents.
  const nx = x / (WORLD_WIDTH - 1);
  const ny = y / (WORLD_HEIGHT - 1);
  const edge = Math.min(nx, 1 - nx, ny, 1 - ny); // 0 at border .. 0.5 at centre
  const penalty =
    edge < EDGE_MARGIN ? Math.pow(1 - edge / EDGE_MARGIN, 2) * EDGE_FALLOFF : 0;
  return base - penalty;
}

// Domain-warped, finer-grained moisture field (0 dry .. 1 wet). Warping the
// sample point with a second noise breaks the straight, blocky biome bands that
// plain thresholded noise produces, so wet/dry regions interlock organically.
function moistureField(x: number, y: number, seed: number): number {
  const wx = x + (smoothNoise(x / 18, y / 18, seed + 700) - 0.5) * 20;
  const wy = y + (smoothNoise(x / 18, y / 18, seed + 900) - 0.5) * 20;
  return (
    smoothNoise(wx / 9, wy / 9, seed ^ 0x9e3779b9) * 0.62 +
    smoothNoise(wx / 4, wy / 4, seed + 33) * 0.38
  );
}

// Latitude-driven temperature (0 cold .. 1 hot): warm at the equator (mid map),
// cold toward both poles, with noise so the bands aren't perfectly straight.
function temperatureField(x: number, y: number, seed: number): number {
  const ny = y / (WORLD_HEIGHT - 1);
  const lat = Math.abs(ny - 0.5) * 2; // 0 equator .. 1 pole
  const t =
    1 - lat * 0.85 + (smoothNoise(x / 16, y / 16, seed + 77) - 0.5) * 0.32;
  return Math.max(0, Math.min(1, t));
}

// Ridged noise (0..1, peaks along narrow lines) so mountains form thin ranges,
// not broad blobs. Higher frequency than the landmass field keeps ranges tight.
function ridgeField(x: number, y: number, seed: number): number {
  const n =
    smoothNoise(x / 11, y / 11, seed + 2718) * 0.6 +
    smoothNoise(x / 5, y / 5, seed + 2719) * 0.4;
  return 1 - Math.abs(2 * n - 1);
}

// Whittaker-style biome lookup from temperature × moisture. A small matrix keeps
// neighbours sensible (no tropical abutting ice) and is easy to tune.
function biome(temp: number, moist: number): WorldTerrain {
  if (temp < 0.25) return "ice"; // polar
  if (temp > 0.7) {
    // hot
    if (moist > 0.55) return "tropical";
    if (moist < 0.3) return "desert";
    return "plains";
  }
  // temperate
  if (moist < 0.25) return "desert";
  if (moist < 0.45) return "high-desert";
  return "plains";
}

function generatedTerrain(x: number, y: number, seed: number): WorldTerrain {
  const land = continentField(x, y, seed);
  if (land < SEA_LEVEL) return "water";
  if (land < SEA_LEVEL + COAST_BAND) return "coastal";

  // Inland mountain ranges where ridged noise peaks on high ground.
  if (ridgeField(x, y, seed) > MOUNTAIN_RIDGE && land > MOUNTAIN_INLAND) {
    return "mountain";
  }

  // Per-tile jitter on top of the smooth climate fields sprinkles the occasional
  // off-type tile into a cluster (a high-desert tile inside desert, a patch of
  // plains in the tropics) for variety, without breaking the broad coherence.
  const tJ = (noise2d(x, y, seed + 8081) - 0.5) * BIOME_JITTER_T;
  const mJ = (noise2d(x, y, seed + 9091) - 0.5) * BIOME_JITTER_M;
  return biome(temperatureField(x, y, seed) + tJ, moistureField(x, y, seed) + mJ);
}

// A continuous height field, 0 (sea level) .. ~1.1 (high peaks). Drives where
// hills appear (elevated plains) and where standing water pools (basins). The
// flat-slab renderer no longer raises the ground by this, but it still seeds the
// terrain-feature logic, so it tracks the same continent/ridge fields.
function generatedElevation(
  x: number,
  y: number,
  terrain: WorldTerrain,
  feature: WorldFeature | undefined,
  seed: number,
): number {
  const ridge = ridgeField(x, y, seed);
  // A dedicated rolling-height noise (0..1) decoupled from the continent
  // magnitude — otherwise every land tile (land >= SEA_LEVEL) reads as elevated
  // and almost all plains become hills. This way only a fraction genuinely rise.
  const localH = smoothNoise(x / 10, y / 10, seed + 6161);
  const jitter = (noise2d(x, y, seed + 5501) - 0.5) * 0.12;

  let e: number;
  switch (terrain) {
    case "water":
      e = 0;
      break;
    case "coastal":
      e = 0.05 + localH * 0.08;
      break;
    case "mountain":
      e = 0.6 + ridge * 0.45 + Math.max(0, jitter);
      break;
    case "high-desert":
      e = 0.34 + localH * 0.4 + jitter; // elevated plateaus
      break;
    case "ice":
      e = 0.22 + localH * 0.4 + jitter;
      break;
    case "desert":
      e = 0.12 + localH * 0.3 + jitter;
      break;
    case "tropical":
      e = 0.1 + localH * 0.35 + jitter;
      break;
    case "plains":
    default:
      e = 0.1 + localH * 0.6 + jitter; // only the higher rolls read as hills
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

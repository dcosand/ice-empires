import type {
  GameState,
  WorldState,
  WorldFeature,
  WorldHockeyOrg,
  WorldPondMarker,
  WorldTerrain,
  WorldTile,
  WorldUnit,
} from "../types/game";
import { REGIONS } from "../data/regions";
import { POND_ENCOUNTERS } from "../data/pondEncounters";

// The persistent world. The founding tile map IS the in-game world — the same
// grid, fog, and HQ carry from founding into Month 1+. Generated at game start.
export const WORLD_WIDTH = 120;
export const WORLD_HEIGHT = 75;
export const FOUNDER_MOVES = 2;
export const SCOUT_MOVES = 3;
// A club may only be founded on a landmass with at least this many connected
// passable tiles — so the player never starts stranded on a tiny island.
const MIN_START_LAND = 60;
const POND_MARKER_COUNT = 24;
const HOCKEY_ORG_COUNT = 10;

const HOCKEY_ORG_NAMES = [
  "Moscow",
  "Yaroslavl",
  "Jokerit",
  "Tampere",
  "Lugano",
  "Bratislava",
  "Iserlohn",
  "Linköping",
  "Malmö",
  "Anchorage",
  "Baie-Comeau",
  "Barrie",
  "Blainville-Boisbriand",
  "Brampton",
  "Brandon",
  "Brantford",
  "Brookville",
  "Burlington",
  "Cape Breton",
  "Cedar Rapids",
  "Charlottetown",
  "Chestnut Hill",
  "Chicoutimi",
  "Colorado Springs",
  "Denver",
  "Des Moines",
  "Drummondville",
  "Dubuque",
  "Duluth",
  "Durham",
  "Easton",
  "Edmonton",
  "Erie",
  "Everett",
  "Fairbanks",
  "Fargo",
  "Flint",
  "Gatineau",
  "Grand Forks",
  "Green Bay",
  "Guelph",
  "Kamloops",
  "Kalamazoo",
  "Kelowna",
  "Kearney",
  "Kennewick",
  "Kingston",
  "Kitchener",
  "Lethbridge",
  "Lincoln",
  "London",
  "Lowell",
  "Madison",
  "Medicine Hat",
  "Moncton",
  "Moose Jaw",
  "Muskegon",
  "Niagara",
  "North Andover",
  "North Bay",
  "Omaha",
  "Orono",
  "Oshawa",
  "Ottawa",
  "Owen Sound",
  "Oxford",
  "Penticton",
  "Peterborough",
  "Plymouth",
  "Portland",
  "Prince Albert",
  "Prince George",
  "Providence",
  "Québec City",
  "Red Deer",
  "Regina",
  "Rimouski",
  "Rouyn-Noranda",
  "Saginaw",
  "Saint John",
  "Sarnia",
  "Saskatoon",
  "Sault Ste. Marie",
  "Shawinigan",
  "Sherbrooke",
  "Sioux City",
  "Sioux Falls",
  "Spokane",
  "St. Charles",
  "St. Cloud",
  "St. John’s",
  "Sudbury",
  "Swift Current",
  "Tempe",
  "Tri-City",
  "Val-d’Or",
  "Vancouver",
  "Victoria",
  "Victoriaville",
  "Waterloo",
  "Wenatchee",
  "Windsor",
];
const HOCKEY_ORG_NAME_SET = new Set(HOCKEY_ORG_NAMES);

export function hockeyOrgDisplayName(
  org: Pick<WorldHockeyOrg, "id" | "name" | "x" | "y">,
): string {
  if (HOCKEY_ORG_NAME_SET.has(org.name)) return org.name;
  const n = Number(org.id.replace(/\D/g, "")) || 0;
  const idx = Math.floor(tileVisualRand(org.x + n, org.y - n, 44017) * HOCKEY_ORG_NAMES.length);
  return HOCKEY_ORG_NAMES[idx] ?? "Independent";
}

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

  // Pick a start on a real, sizeable landmass (never a one-tile island), as
  // close to the map centre as that allows. Guarantee the exact start tile is
  // passable, non-mountain ground.
  const start = chooseStart(tiles, WORLD_WIDTH, WORLD_HEIGHT);
  const si = start.y * WORLD_WIDTH + start.x;
  const st = tiles[si];
  if (st.terrain === "water" || st.terrain === "mountain" || st.feature === "lake") {
    tiles[si] = {
      ...st,
      terrain: "plains",
      feature: undefined,
      elevation: generatedElevation(start.x, start.y, "plains", undefined, seed),
      valid: true,
    };
  }

  const hockeyOrgs = generateHockeyOrgs(tiles, start, seed);

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    tiles,
    revealed: revealKeys(start.x, start.y),
    hqTile: null,
    founder: {
      x: start.x,
      y: start.y,
      movesPerTurn: FOUNDER_MOVES,
      movesRemaining: FOUNDER_MOVES,
    },
    founderSelected: false,
    scouts: [],
    selectedScoutId: null,
    pondMarkers: generatePondMarkers(tiles, start, seed, hockeyOrgs),
    hockeyOrgs,
    scout: null,
    scoutSelected: false,
  };
}

export function createScoutUnit(
  id: string,
  x: number,
  y: number,
  name = "Pond Scout",
): WorldUnit {
  return {
    id,
    unitDefId: "pond-scout",
    name,
    x,
    y,
    movesPerTurn: SCOUT_MOVES,
    movesRemaining: SCOUT_MOVES,
  };
}

function generatePondMarkers(
  tiles: WorldTile[],
  start: { x: number; y: number },
  seed: number,
  hockeyOrgs: WorldHockeyOrg[],
): WorldPondMarker[] {
  const markers: WorldPondMarker[] = [];
  const occupied = new Set<string>(hockeyOrgs.map((org) => tileKey(org.x, org.y)));
  const addMarker = (x: number, y: number, n: number) => {
    const tile = tiles[y * WORLD_WIDTH + x];
    const key = tileKey(x, y);
    if (!tile || occupied.has(key) || !canPlacePondMarker(tile)) return false;
    const encounter = POND_ENCOUNTERS[n % POND_ENCOUNTERS.length];
    markers.push({
      id: `pond-marker-${x}-${y}`,
      x,
      y,
      kind: encounter.kind,
      encounterId: encounter.id,
      investigated: false,
    });
    occupied.add(key);
    return true;
  };

  // Always seed one early marker in the opening sightline when possible.
  for (const [dx, dy] of [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 0],
    [0, -1],
    [-1, -1],
  ]) {
    const x = start.x + dx;
    const y = start.y + dy;
    if (x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT && addMarker(x, y, 0)) {
      break;
    }
  }

  const candidates = tiles
    .filter(canPlacePondMarker)
    .map((tile) => ({
      tile,
      score: noise2d(tile.x, tile.y, seed + 12091),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { tile } of candidates) {
    if (markers.length >= POND_MARKER_COUNT) break;
    const farEnoughFromStart = Math.hypot(tile.x - start.x, tile.y - start.y) > 4;
    if (!farEnoughFromStart) continue;
    addMarker(tile.x, tile.y, markers.length);
  }

  return markers;
}

function generateHockeyOrgs(
  tiles: WorldTile[],
  start: { x: number; y: number },
  seed: number,
): WorldHockeyOrg[] {
  const orgs: WorldHockeyOrg[] = [];
  const occupied = new Set<string>();
  const archetypes: WorldHockeyOrg["archetype"][] = [
    "minor-club",
    "junior-league",
    "rink-society",
    "academy",
  ];
  const namePool = shuffledHockeyOrgNames(seed);

  const candidates = tiles
    .filter(canPlaceHockeyOrg)
    .map((tile) => ({
      tile,
      score:
        noise2d(tile.x, tile.y, seed + 24091) +
        Math.min(0.35, Math.hypot(tile.x - start.x, tile.y - start.y) / 160),
    }))
    .sort((a, b) => b.score - a.score);

  for (const { tile } of candidates) {
    if (orgs.length >= HOCKEY_ORG_COUNT) break;
    if (Math.hypot(tile.x - start.x, tile.y - start.y) < 7) continue;
    const tooClose = orgs.some((org) => Math.hypot(tile.x - org.x, tile.y - org.y) < 9);
    if (tooClose || occupied.has(tileKey(tile.x, tile.y))) continue;
    const idx = orgs.length;
    orgs.push({
      id: `hockey-org-${idx + 1}`,
      name: namePool[idx % namePool.length],
      x: tile.x,
      y: tile.y,
      archetype: archetypes[idx % archetypes.length],
      discovered: false,
    });
    occupied.add(tileKey(tile.x, tile.y));
  }

  return orgs;
}

function shuffledHockeyOrgNames(seed: number): string[] {
  return HOCKEY_ORG_NAMES.map((name, i) => ({
    name,
    score: noise2d(i, HOCKEY_ORG_NAMES.length - i, seed + 33191),
  }))
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.name);
}

function canPlacePondMarker(tile: WorldTile): boolean {
  return (
    tile.valid &&
    tile.terrain !== "water" &&
    tile.terrain !== "mountain" &&
    tile.feature !== "river" &&
    tile.feature !== "lake" &&
    !hasMesaLandform(tile)
  );
}

function canPlaceHockeyOrg(tile: WorldTile): boolean {
  return (
    tile.valid &&
    tile.terrain !== "water" &&
    tile.terrain !== "mountain" &&
    tile.feature !== "lake" &&
    !hasMesaLandform(tile)
  );
}

export function tileVisualRand(x: number, y: number, salt: number): number {
  let h = Math.imul((x * 73856093) ^ (y * 19349663) ^ (salt * 83492791), 2654435761);
  h = (h ^ (h >>> 15)) >>> 0;
  return h / 4294967295;
}

export function hasMesaLandform(tile: WorldTile): boolean {
  return tile.terrain === "high-desert" && tileVisualRand(tile.x, tile.y, 11) < 0.09;
}

// Flood-fill the passable (land) tiles into connected components, then choose a
// start: the tile closest to the map centre that sits on a component with at
// least MIN_START_LAND tiles, preferring non-mountain ground. Falls back to the
// largest component if none clears the threshold (degenerate maps).
function chooseStart(
  tiles: WorldTile[],
  w: number,
  h: number,
): { x: number; y: number } {
  const comp = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  for (let i = 0; i < w * h; i++) {
    if (comp[i] !== -1 || !tiles[i].valid) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const c = stack.pop()!;
      n++;
      const cx = c % w;
      const cy = (c / w) | 0;
      const neighbors = [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (comp[j] === -1 && tiles[j].valid) {
          comp[j] = id;
          stack.push(j);
        }
      }
    }
    sizes.push(n);
  }

  const cx0 = (w - 1) / 2;
  const cy0 = (h - 1) / 2;
  let best: { x: number; y: number } | null = null;
  let bestScore = Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const id = comp[y * w + x];
      if (id < 0 || sizes[id] < MIN_START_LAND) continue;
      const t = tiles[y * w + x];
      // Distance to centre, with a penalty so we avoid starting on mountains.
      const score = Math.hypot(x - cx0, y - cy0) + (t.terrain === "mountain" ? 40 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
  }
  if (best) return best;

  // Fallback: centre-most tile of the largest component.
  let largest = 0;
  for (let id = 1; id < sizes.length; id++) {
    if (sizes[id] > sizes[largest]) largest = id;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (comp[y * w + x] === largest) return { x, y };
    }
  }
  return { x: Math.floor(w / 2), y: Math.floor(h / 2) };
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
  const scout = createScoutUnit("pond-scout-1", hq.x, hq.y);
  return {
    ...state,
    world: {
      ...world,
      hqTile: hq,
      founder: null,
      founderSelected: false,
      scouts: [scout],
      selectedScoutId: null,
      scout,
      scoutSelected: false,
      revealed: addReveal(world.revealed, hq.x, hq.y),
    },
  };
}

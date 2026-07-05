import type { GameState, WorldState } from "../types/game";
import { tileAt, tileKey } from "./world";

// Territory (D34/D35): tile ownership is COMPUTED from sources — never stored
// per tile — the same way income is derived each month. Sources project a
// claim over nearby valid tiles; the nearest source wins contested tiles.
//
// Player sources:  HQ, every player rink of level >= 1 (any distance — a
//                  forward rink plants a flag), Affiliate independents (tier 3).
// Rival sources:   their HQ + their rinks (level >= 1). By default only
//                  CONTACTED rivals count — the player can't see (or be fenced
//                  out by) borders of a club they've never met.

// Projection radii (rounded-disk distance, same shape as sight/reveal disks:
// dx^2 + dy^2 <= r^2 + r). HQ projects the widest claim; rinks and partner
// independents plant smaller flags.
export const TERRITORY_HQ_RADIUS = 3;
export const TERRITORY_RINK_RADIUS = 2;
export const TERRITORY_AFFILIATE_RADIUS = 2;

// Owner tag for a claimed tile: the player, or a rival club id.
export const PLAYER_OWNER = "player";

export type TerritoryOwnership = {
  // tileKey -> PLAYER_OWNER or a rival clubId. Unclaimed tiles are absent.
  ownerByTile: Record<string, string>;
  playerTileCount: number;
};

type TerritorySource = {
  x: number;
  y: number;
  radius: number;
  owner: string;
};

function playerSources(world: WorldState): TerritorySource[] {
  const sources: TerritorySource[] = [];
  if (world.hqTile) {
    sources.push({ ...world.hqTile, radius: TERRITORY_HQ_RADIUS, owner: PLAYER_OWNER });
  }
  for (const rink of world.rinks) {
    if (rink.ownerClubId || rink.level < 1) continue;
    sources.push({ x: rink.x, y: rink.y, radius: TERRITORY_RINK_RADIUS, owner: PLAYER_OWNER });
  }
  for (const org of world.hockeyOrgs) {
    if (org.relationshipLevel !== 3) continue; // Affiliates only
    sources.push({ x: org.x, y: org.y, radius: TERRITORY_AFFILIATE_RADIUS, owner: PLAYER_OWNER });
  }
  return sources;
}

function rivalSources(world: WorldState, includeUncontacted: boolean): TerritorySource[] {
  const sources: TerritorySource[] = [];
  for (const rival of world.rivals) {
    if (!rival.contacted && !includeUncontacted) continue;
    sources.push({ ...rival.hqTile, radius: TERRITORY_HQ_RADIUS, owner: rival.clubId });
    for (const rink of world.rinks) {
      if (rink.ownerClubId !== rival.clubId || rink.level < 1) continue;
      sources.push({ x: rink.x, y: rink.y, radius: TERRITORY_RINK_RADIUS, owner: rival.clubId });
    }
  }
  return sources;
}

// Derive the full ownership map. Sources are visited in a fixed order (player
// HQ, player rinks, affiliates, rivals) and a claim is only displaced by a
// STRICTLY closer source, so ties resolve deterministically toward the player.
export function computeTerritory(
  world: WorldState | null,
  opts: { includeUncontactedRivals?: boolean } = {},
): TerritoryOwnership {
  const ownerByTile: Record<string, string> = {};
  if (!world) return { ownerByTile, playerTileCount: 0 };

  const claims: Record<string, number> = {}; // tileKey -> best distance^2
  const sources = [
    ...playerSources(world),
    ...rivalSources(world, opts.includeUncontactedRivals ?? false),
  ];
  for (const src of sources) {
    const r = src.radius;
    const rr = r * r + r; // rounded corners, matching the sight disks
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const d2 = dx * dx + dy * dy;
        if (d2 > rr) continue;
        const x = src.x + dx;
        const y = src.y + dy;
        // Impassable tiles (water, mountains) are still CLAIMED — a border is
        // about whose ground it is, not whether a unit can stand on it.
        if (!tileAt(world, x, y)) continue; // off-map only
        const key = tileKey(x, y);
        const best = claims[key];
        if (best === undefined || d2 < best) {
          claims[key] = d2;
          ownerByTile[key] = src.owner;
        }
      }
    }
  }

  let playerTileCount = 0;
  for (const key in ownerByTile) {
    if (ownerByTile[key] === PLAYER_OWNER) playerTileCount += 1;
  }
  return { ownerByTile, playerTileCount };
}

export function territoryOwnerAt(
  ownership: TerritoryOwnership,
  x: number,
  y: number,
): string | null {
  return ownership.ownerByTile[tileKey(x, y)] ?? null;
}

// Is (x,y) inside the territory of any CONTACTED rival? Enforcement (build
// rejection, builder movement — D36) only respects borders the player knows.
export function isKnownRivalTerritory(
  world: WorldState | null,
  x: number,
  y: number,
): boolean {
  if (!world) return false;
  const owner = computeTerritory(world).ownerByTile[tileKey(x, y)];
  return owner !== undefined && owner !== PLAYER_OWNER;
}

// How many tiles the player's club owns — the "population" the tryout pool
// reads (D35).
export function playerTerritorySize(state: GameState): number {
  return computeTerritory(state.world).playerTileCount;
}

// ---------------------------------------------------------------------------
// Boundary enforcement (D36)
// ---------------------------------------------------------------------------

// Civ's "too close to settle": no player construction within this Chebyshev
// distance of a KNOWN (contacted) rival HQ.
export const MIN_RIVAL_HQ_BUILD_DISTANCE = 3;

// Would a build at (x,y) violate a known rival's space? True when the tile is
// within MIN_RIVAL_HQ_BUILD_DISTANCE of a contacted rival HQ or inside a
// contacted rival's projected territory.
export function buildBlockedByRival(
  world: WorldState | null,
  x: number,
  y: number,
): boolean {
  if (!world) return false;
  const tooCloseToHq = world.rivals.some(
    (rival) =>
      rival.contacted &&
      Math.max(Math.abs(rival.hqTile.x - x), Math.abs(rival.hqTile.y - y)) <=
        MIN_RIVAL_HQ_BUILD_DISTANCE,
  );
  return tooCloseToHq || isKnownRivalTerritory(world, x, y);
}

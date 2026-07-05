import type { WorldRink, WorldState } from "../types/game";

// Two-radius model (D34). The HOME radius gates the club's local economy:
// income (+1 Funds/mo), the rinks/2 upkeep tax, and the Hold-Tryouts gate all
// require a rink within it (Chebyshev distance — same 8-way geometry as unit
// movement). Territory projection is separate and applies to EVERY rink at any
// distance — see engine/territorySystem.ts.
export const HOME_RINK_RADIUS = 3;

export function rinkAt(
  world: WorldState,
  x: number,
  y: number,
): WorldRink | undefined {
  return world.rinks.find((r) => r.x === x && r.y === y);
}

// Every rink the player's club owns, anywhere on the map. Level 0 entries
// (cleared ponds) are included when `minLevel` is 0.
export function getPlayerRinks(world: WorldState, minLevel = 1): WorldRink[] {
  // Rival-built rinks (ownerClubId set) never count as the player's.
  return world.rinks.filter((r) => !r.ownerClubId && r.level >= minLevel);
}

// Rinks inside the club's HOME footprint (economy radius). Level 0 entries
// (cleared ponds) are included when `minLevel` is 0; tryouts and income want
// level >= 1.
export function getClubRinks(world: WorldState, minLevel = 1): WorldRink[] {
  const hq = world.hqTile;
  if (!hq) return [];
  return getPlayerRinks(world, minLevel).filter(
    (r) => Math.max(Math.abs(r.x - hq.x), Math.abs(r.y - hq.y)) <= HOME_RINK_RADIUS,
  );
}

export function hasClubRink(world: WorldState | null): boolean {
  return !!world && getClubRinks(world).length > 0;
}

import type { WorldRink, WorldState } from "../types/game";

// How far from the HQ a rink still counts as one of the club's own rinks
// (Chebyshev distance — same 8-way geometry as unit movement).
export const CLUB_RINK_RADIUS = 3;

export function rinkAt(
  world: WorldState,
  x: number,
  y: number,
): WorldRink | undefined {
  return world.rinks.find((r) => r.x === x && r.y === y);
}

// Rinks inside the club's home footprint. Level 0 entries (cleared ponds)
// are included when `minLevel` is 0; tryouts and income want level >= 1.
export function getClubRinks(world: WorldState, minLevel = 1): WorldRink[] {
  const hq = world.hqTile;
  if (!hq) return [];
  return world.rinks.filter(
    (r) =>
      r.level >= minLevel &&
      Math.max(Math.abs(r.x - hq.x), Math.abs(r.y - hq.y)) <= CLUB_RINK_RADIUS,
  );
}

export function hasClubRink(world: WorldState | null): boolean {
  return !!world && getClubRinks(world).length > 0;
}

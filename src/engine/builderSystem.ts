import type { GameState, WorldRink, WorldUnit } from "../types/game";
import {
  addReveal,
  createBuilderUnit,
  hasMesaLandform,
  tileAt,
  tileKey,
} from "./world";
import { allScouts, syncLegacyScout } from "./scoutSystem";
import { rinkAt } from "./rinkSystem";
import { prependLog } from "./log";
import type { PushLog } from "./turnContext";

// The builder ("Rink Rats" / a club's unique crew) is the Civ-worker analog:
// it clears frozen ponds, builds Level 1 rinks over two months, paves street
// rinks in the desert (Arizona's Asphalt Crew), and harvests forest branches
// into equipment. All actions live here; the reducer just dispatches in.

const RINK_BUILD_MONTHS = 2;
const HARVEST_EQUIPMENT = 2;
const CLEAR_SNOW_FUNDS = 1;
export const HARVEST_MIN_FOLIAGE = 0.35;

// The unit for an action: must exist, be a builder, and not be mid-project.
function actionableBuilder(state: GameState, unitId: string): WorldUnit | null {
  const unit = allScouts(state.world).find((u) => u.id === unitId);
  if (!unit || unit.kind !== "builder" || unit.working) return null;
  return unit;
}

// ---------------------------------------------------------------------------
// Clear Snow — instant: frozen pond -> Cleared Pond (level-0 rink entry).
// ---------------------------------------------------------------------------

export function canClearSnow(state: GameState, unitId: string): boolean {
  const world = state.world;
  const unit = actionableBuilder(state, unitId);
  if (!world || !unit || unit.movesRemaining <= 0) return false;
  const tile = tileAt(world, unit.x, unit.y);
  return (
    !!tile &&
    tile.terrain === "pond" &&
    tile.surfaceState === "frozen" &&
    !rinkAt(world, unit.x, unit.y)
  );
}

export function clearSnow(state: GameState, unitId: string): GameState {
  if (!canClearSnow(state, unitId)) return state;
  const world = state.world!;
  const unit = actionableBuilder(state, unitId)!;

  const cleared: WorldRink = {
    id: `rink-${unit.x}-${unit.y}`,
    x: unit.x,
    y: unit.y,
    level: 0,
    kind: "ice",
    builtMonth: state.month,
  };
  const units = allScouts(world).map((u) =>
    u.id === unitId ? { ...u, movesRemaining: 0 } : u,
  );
  const next: GameState = {
    ...state,
    resources: { ...state.resources, funds: state.resources.funds + CLEAR_SNOW_FUNDS },
    world: syncLegacyScout(
      { ...world, rinks: [...world.rinks, cleared] },
      units,
      world.selectedScoutId,
    ),
  };
  return prependLog(
    next,
    "build",
    "Pond cleared",
    `The crew shovels the pond clear — the first visible mark of hockey on the map (+${CLEAR_SNOW_FUNDS} Funds in found gear and goodwill). A Level 1 rink can rise here once Outdoor Rinkcraft is known.`,
  );
}

// ---------------------------------------------------------------------------
// Build Level 1 Rink — 2 months of work on a cleared pond (or paveable desert
// for street rinks). The unit locks in place until the build completes.
// ---------------------------------------------------------------------------

export function canBuildRink(state: GameState, unitId: string): boolean {
  const world = state.world;
  const unit = actionableBuilder(state, unitId);
  if (!world || !unit) return false;
  if (!state.completedResearch.includes("outdoor-rinkcraft")) return false;
  const cleared = rinkAt(world, unit.x, unit.y);
  return !!cleared && cleared.level === 0 && cleared.kind === "ice";
}

// Arizona's unique Asphalt Crew paves desert flats into street/inline rinks —
// no pond, no clearing step, same 2-month build.
export function canPaveStreetRink(state: GameState, unitId: string): boolean {
  const world = state.world;
  const unit = actionableBuilder(state, unitId);
  if (!world || !unit || unit.unitDefId !== "asphalt-crew") return false;
  if (!state.completedResearch.includes("outdoor-rinkcraft")) return false;
  const tile = tileAt(world, unit.x, unit.y);
  return (
    !!tile &&
    tile.valid &&
    (tile.terrain === "desert" || tile.terrain === "high-desert") &&
    !hasMesaLandform(tile) &&
    !rinkAt(world, unit.x, unit.y)
  );
}

export function startRinkBuild(state: GameState, unitId: string): GameState {
  const ice = canBuildRink(state, unitId);
  const pave = canPaveStreetRink(state, unitId);
  if (!ice && !pave) return state;
  const world = state.world!;
  const rinkKind = ice ? "ice" : "inline";

  const units = allScouts(world).map((u) =>
    u.id === unitId
      ? {
          ...u,
          movesRemaining: 0,
          working: {
            task: "build-rink" as const,
            x: u.x,
            y: u.y,
            rinkKind: rinkKind as "ice" | "inline",
            monthsRemaining: RINK_BUILD_MONTHS,
          },
        }
      : u,
  );
  const next: GameState = {
    ...state,
    world: syncLegacyScout({ ...world }, units, world.selectedScoutId),
  };
  return prependLog(
    next,
    "build",
    rinkKind === "ice" ? "Rink construction begins" : "Street rink paving begins",
    rinkKind === "ice"
      ? `Boards, lines, and a shoveling schedule: a Level 1 outdoor rink is underway (${RINK_BUILD_MONTHS} months).`
      : `Asphalt, nets, and orange wheels: a street hockey rink is underway (${RINK_BUILD_MONTHS} months).`,
  );
}

// Monthly tick: advance every working builder; finish builds at 0.
export function progressBuilderWork(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const unit of allScouts(world)) {
    if (!unit.working) continue;
    unit.working.monthsRemaining -= 1;
    if (unit.working.monthsRemaining > 0) {
      push(
        "build",
        "Rink under construction",
        `The crew keeps at it — ${unit.working.monthsRemaining} month${
          unit.working.monthsRemaining === 1 ? "" : "s"
        } to playable ice.`,
      );
      continue;
    }
    const { x, y, rinkKind } = unit.working;
    const existing = rinkAt(world, x, y);
    if (existing) {
      existing.level = 1;
      existing.kind = rinkKind;
      existing.builtMonth = draft.month;
    } else {
      world.rinks.push({
        id: `rink-${x}-${y}`,
        x,
        y,
        level: 1,
        kind: rinkKind,
        builtMonth: draft.month,
      });
    }
    unit.working = undefined;
    push(
      "build",
      rinkKind === "ice" ? "Level 1 rink completed" : "Street rink completed",
      rinkKind === "ice"
        ? "It is not much, but it is ice with boards — and it is yours. Locals are already peering over them."
        : "Wheels hiss on fresh asphalt. In the desert, this is what a rink looks like — and it is yours.",
    );
  }
  // Keep the legacy mirror in sync after direct mutation.
  draft.world = syncLegacyScout(world, allScouts(world), world.selectedScoutId);
}

// ---------------------------------------------------------------------------
// Harvest Branches — forest tile -> +2 equipment, once per tile.
// ---------------------------------------------------------------------------

export function canHarvestBranches(state: GameState, unitId: string): boolean {
  const world = state.world;
  const unit = actionableBuilder(state, unitId);
  if (!world || !unit || unit.movesRemaining <= 0) return false;
  if (!state.completedResearch.includes("stick-gear-basics")) return false;
  const tile = tileAt(world, unit.x, unit.y);
  return (
    !!tile &&
    (tile.foliageDensity ?? 0) >= HARVEST_MIN_FOLIAGE &&
    !world.harvestedTiles.includes(tileKey(unit.x, unit.y))
  );
}

export function harvestBranches(state: GameState, unitId: string): GameState {
  if (!canHarvestBranches(state, unitId)) return state;
  const world = state.world!;
  const unit = actionableBuilder(state, unitId)!;
  const key = tileKey(unit.x, unit.y);

  // Clear the foliage so the grove visibly disappears from the map.
  const tiles = world.tiles.map((t) =>
    t.x === unit.x && t.y === unit.y ? { ...t, foliageDensity: 0 } : t,
  );
  const units = allScouts(world).map((u) =>
    u.id === unitId ? { ...u, movesRemaining: 0 } : u,
  );
  const next: GameState = {
    ...state,
    equipment: state.equipment + HARVEST_EQUIPMENT,
    world: syncLegacyScout(
      { ...world, tiles, harvestedTiles: [...world.harvestedTiles, key] },
      units,
      world.selectedScoutId,
    ),
  };
  return prependLog(
    next,
    "build",
    "Stickwood harvested",
    `The crew cuts and whittles the best branches into playable sticks (+${HARVEST_EQUIPMENT} Equipment). The grove is spent.`,
  );
}

// Spawn a produced builder at HQ (mirrors scoutSystem.spawnProducedScout).
export function spawnProducedBuilder(
  draft: GameState,
  instanceId: string,
  name = "Rink Rats",
  unitDefId = "rink-rats",
): void {
  const world = draft.world;
  if (!world?.hqTile) return;
  const units = allScouts(world);
  const builder = createBuilderUnit(
    instanceId,
    world.hqTile.x,
    world.hqTile.y,
    name,
    unitDefId,
  );
  draft.world = syncLegacyScout(
    {
      ...world,
      revealed: addReveal(world.revealed, world.hqTile.x, world.hqTile.y),
    },
    [...units, builder],
    builder.id ?? null,
  );
}

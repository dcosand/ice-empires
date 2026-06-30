# Terrain System Reference

The world map is made up of `WorldTile` objects. Each tile carries a `terrain` field (one of nine `WorldTerrain` values), an `elevation`, optional `feature` overlays, and a `valid` flag that controls whether units can enter or found on that tile.

---

## Terrain Types

| Terrain | Passable | Foundable | Wet (can host ponds/lakes) | Typical Elevation | Notes |
|---|---|---|---|---|---|
| **plains** | ✅ | ✅ | ✅ | 0.1 – 0.7 | Most common land type; temperate |
| **coastal** | ✅ | ✅ | ✅ | 0.05 – 0.13 | Low-lying shore; sandy detail texture |
| **tropical** | ✅ | ✅ | ✅ | 0.1 – 0.45 | Hot + wet biome; palm vegetation |
| **desert** | ✅ | ✅ | ❌ | 0.12 – 0.42 | Hot + dry biome; sand-dune detail |
| **high-desert** | ✅ | ✅ | ❌ | 0.34 – 0.74 | Elevated plateau; rare mesa spires (~9 % of tiles) |
| **ice** | ✅ | ✅ | ✅ | 0.22 – 0.62 | Polar / frozen ground; pine vegetation on high tiles |
| **pond** | ✅ | ✅ | — | (basin) | Small skateable water body; surface can be frozen / thin-ice / open-water |
| **mountain** | ❌ | ❌ | ❌ | 0.6 – 1.05+ | Ridge peaks; impassable, never founded on |
| **water** | ❌ | ❌ | ❌ | 0 | Open ocean; impassable |

---

## Tile Validity Rules

A tile's `valid` flag (set at world-generation time) determines whether it can be entered or founded on:

```
valid = terrain !== "water"
     && terrain !== "mountain"
     && feature !== "lake"
```

---

## Feature Overlays

Features are independent of terrain type and can appear on top of valid land tiles.

| Feature | Effect |
|---|---|
| **river** | Visual only; blocks pond-marker spawns on that tile |
| **lake** | Sets `valid = false`; impassable inland water body |

Ponds are **not** a feature — they are promoted to a first-class `WorldTerrain` value so their surface state (`frozen` / `thin-ice` / `open-water`) can be toggled independently of terrain.

---

## Pond Surface States (`PondSurfaceState`)

Applies only to `terrain === "pond"` tiles. Default is `"frozen"`.

| State | Visual | Future Use |
|---|---|---|
| **frozen** | Glassy ice sheet with skate scuffs | Default; fully skateable |
| **thin-ice** | Wetter, semi-translucent sheen | Hazard / seasonal thaw |
| **open-water** | Rippling water (same as ocean) | Melt state |

---

## Terrain Generation — Biome Logic

Terrain is assigned per-tile at world-generation time based on two noise fields:

| `temperature` | `moisture` | Assigned Terrain |
|---|---|---|
| < 0.25 | any | ice |
| > 0.7 | > 0.55 | tropical |
| > 0.7 | < 0.3 | desert |
| > 0.7 | 0.3 – 0.55 | plains |
| any | < 0.25 | desert |
| any | 0.25 – 0.45 | high-desert |
| any | > 0.45 (default) | plains |

Mountains override any biome: if the ridged-noise field exceeds `MOUNTAIN_RIDGE` (0.93) **and** the land field exceeds `MOUNTAIN_INLAND` (0.54), the tile becomes `mountain`.

---

## Elevation Ranges

Elevation is a float (0 – ~1.1) used for isometric height rendering and feature distribution. Mountains and high-desert sit highest; coastal and water sit lowest.

| Terrain | Elevation Range |
|---|---|
| water | 0 |
| coastal | 0.05 – 0.13 |
| pond (basin) | ≤ 0.04 × parent elevation |
| plains | 0.1 – 0.7 |
| tropical | 0.1 – 0.45 |
| desert | 0.12 – 0.42 |
| ice | 0.22 – 0.62 |
| high-desert | 0.34 – 0.74 |
| mountain | 0.6 – 1.05+ |

---

## Vegetation & Landform Sprites

Standing sprites are layered on top of ground tiles for visual depth.

| Terrain | Sprite / Feature |
|---|---|
| plains (high elevation) | Deciduous (broadleaf) grove |
| ice (high elevation) | Pine grove with snow caps |
| tropical | Palm grove (~22 % of tiles) |
| coastal | Coastal brush (~3 %, not on river tiles) |
| desert | Cacti / rock formations |
| high-desert | Mesa spires (~9 %) or desert hills (~34 %) |
| mountain | Billboard mountain sprite (tier 1–3 by elevation) |
| pond | None — clean skating sheet |
| water | None — wave lines drawn in ground pass only |

---

## Movement

All movement costs are uniform (1 point per tile). There are no per-terrain speed modifiers. Units can enter any tile where `valid === true`. Mountains, open water, and lake-overlay tiles block movement entirely.

---

## Source Locations

| Topic | File |
|---|---|
| Type definitions | `src/types/game.ts` lines 358–388 |
| World generation & biome logic | `src/engine/world.ts` |
| Isometric rendering & colors | `src/components/IsoWorldMap.tsx` |

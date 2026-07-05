# Ice Empires — Agent Guide

A Civ-style hockey strategy game: React 18 + PixiJS 8 + TypeScript + Vite, no
other runtime deps. This file is the fast path for coding agents — read it
before exploring. Deeper design intent lives in `docs/` (see map at the bottom).

## Commands

- `npm run dev` — Vite dev server
- `npm run typecheck` — `tsc -b --noEmit` (run after any type change; the
  codebase leans on closed unions so the compiler enumerates sweep sites)
- `npm run build` — production build (also typechecks)
- No test suite yet. Verify via the dev server + Dev Panel (**⌘⇧.** toggles it:
  reveal map, grant pond techs, spawn builder, force tryouts, meet rival/
  independent, toggle any tech/facility).

## Architecture (three layers, strict direction)

```
src/data/*        content as plain objects (clubs, units, facilities, research,
                  eras, regions, cards, encounters, clubUniques, playerNames)
src/engine/*      pure rules. gameReducer dispatches actions -> system modules
src/components/*  React UI + the PixiJS map. Renders state, dispatches actions
src/types/game.ts every shared type. Content -> data, rules -> engine, UI -> components.
```

- **State**: one `useReducer(gameReducer, initialState)` in `App.tsx`. No
  context/store/router — state flows down via props, actions flow up via
  `dispatch`. Phases (`landing → clubSelect → founding → playing`) pick the
  top-level screen; `Dashboard.tsx` owns an `OverlayView` union for modals.
- **Turn loop**: `engine/turnResolution.endMonth` clones state
  (`structuredClone` — keep all state plain JSON: arrays, not Sets/Maps) and
  runs systems in order: income (+equipment) → auto-equip roster → production →
  builder work → research → discovery → connection → rival rumors → refresh
  moves → rival turns → rival org contacts → independent contact sweep → rival
  eras → events → era progress.
- **Determinism (D3)**: every roll threads `nextRandom(state.rngSeed)` and
  writes the seed back. Never `Math.random` in engine code.

## Core systems cheat sheet

- **Economy**: `ResourceSet = { funds, hockeyKnowledge, reputation }`. Funds is
  the single purchase currency, charged IN FULL when production starts
  (Polytopia-style, D30); the HQ slot then works the item for its `buildMonths`
  (`ActiveProduction` is a months timer). HK funds research (science-per-turn);
  **reputation is never spent** — actions require thresholds. **Equipment** is a separate `state.equipment` inventory
  (harvests, Equipment Shed) consumed 1-per-player to gear recruits.
- **Eras**: 5-act arc in `data/eras.ts` (`ERA_ORDER`, `ERA_REQUIREMENTS`).
  A club advances when its CURRENT era's checklist is met
  (`selectors.isRequirementMet`). Rivals advance on a seeded clock
  (`eraSystem.progressRivalEras`) with log broadcasts once contacted.
- **Tech**: 40 techs in `data/research.ts` (branch + era + prereqs). Only pond
  techs gate behavior — the id→gate map is in the comment atop that file.
  Tech-tree screen: `ResearchPanel` (era columns × branch rows, prereq chips).
- **Sight & fog**: Polytopia + Civ VI hybrid (`world.ts`): explored tiles stay
  fully lit forever (`world.revealed`); `visibleTiles()` (current line of
  sight) only gates LIVE info — rival unit positions and the "out of sight"
  note. LOS (`losVisible`): mountains (level 3) and visible groves (level 1)
  block; a taller target shows over a lower blocker; adjacent always visible.
  Sight radii: scouts/founder/HQ 3, builders 2, rinks 1 (SCOUT_SIGHT etc.).
- **Map units**: all player field units live in `world.scouts: WorldUnit[]`
  with `kind: "scout" | "builder"`; a legacy mirror (`world.scout`) is kept in
  sync by `scoutSystem.syncLegacyScout` — always update units through it.
  Builders (`engine/builderSystem.ts`): clear snow → level-0 cleared pond,
  build Level-1 rinks (2 months via `working` state; refresh skips working
  units), pave desert street rinks (Arizona), harvest forest branches
  (+2 equipment, once per tile via `world.harvestedTiles`).
- **Rinks**: `world.rinks: WorldRink[]` (level 0 = cleared pond, 1 = rink;
  kind ice|inline). "Club rinks" = within `HOME_RINK_RADIUS` (Chebyshev 3) of HQ
  (`engine/rinkSystem.ts`) — they enable tryouts and pay +1 funds/mo each; every
  rink is a radius-1 vision source. Worldgen guarantees a frozen pond (desert:
  a paveable flat) within 2 tiles of the start (`world.guaranteeStarterPond`).
- **Territory (D34–D36)**: `engine/territorySystem.ts` — tile ownership is
  COMPUTED per call (like income), never stored: HQ (r=3) + player rinks
  level ≥1 at any distance (r=2) + Affiliate independents (r=2) vs contacted
  rivals' HQ/rinks; nearest source wins, ties favor the player. Owned tiles
  scale the tryout pool (`territoryTryoutBonus`); `buildBlockedByRival` rejects
  builds near/inside known rival ground; builders can't MOVE into known rival
  territory (`scoutSystem.moveableTilesFor` — it lives there, not in world.ts,
  to avoid an import cycle). Borders render via `territoryBorderMarker`
  (IsoWorldMap) + a minimap color wash.
- **Roster**: `state.roster: Player[]` (attrs on a 20 scale; pond-era rolls
  1–6). `engine/tryoutSystem.ts` = Hold Tryouts gate/generation/recruiting +
  monthly FIFO auto-equip. UI: `TryoutScreen` modal + ClubHQ "Team" tab.
  Era exit wants 6 geared players incl. a goalie (`selectors.hasFullLine`).
- **Meetings**: `state.pendingMeeting: { kind: "rival"|"independent", id }`.
  **One-popup rule**: encounter > rival > independent; every trigger
  early-returns if anything is pending (see the MOVE_SCOUT chain in
  `gameReducer` and the monthly checks). Rival meeting = cinematic with an
  attitude choice (stored on `rival.attitude`).
- **Independents**: city-state analogs (`engine/independentsSystem.ts`).
  Contact → +1 rep, +5 influence; tiers Contacted/Friendly/Partner/Affiliate at
  0/10/25/50 influence; `SEND_INTRODUCTION` (needs `first-contact` tech, rep≥3,
  1 fund); rivals mark `contactedByClubIds` by adjacency; prospects are seeded
  at worldgen and stay fogged until a scouting network reveals them.
- **Scout characters (D31)**: every map scout is a person in `state.scoutStaff`
  (id === WorldUnit id) with Judging Potential/Ability (20-scale). Quality tier
  paid at production (Volunteer/Traveled/Ace ×1/×1.75/×2.5 — `data/scouts.ts`);
  fieldwork XP (+2 hut, +3 first contact, +5 network) promotes the weaker attr
  every 5 XP (`scoutStaff.applyScoutPromotions`). `ESTABLISH_NETWORK`: a scout
  with `scouting-reports` parks 2 months beside a contacted independent
  (`working` task, `UnitWork` union) → prospects revealed, +10 influence.
  **Fog-of-talent (D32)**: prospects keep true `attrs`/`potential` engine-side;
  UI renders only `attrEstimates`/`potentialEstimate` ranges from
  `engine/talentFog.ts` (width from the scout's judging; truth always inside).
- **Club uniques**: `data/clubUniques.ts`. Use `unitsForClub`/`facilitiesForClub`
  for what a club can BUILD, and `ALL_UNIT_DEFS_BY_ID`/`ALL_FACILITY_DEFS_BY_ID`
  for LOOKUPS (raw `UNITS_BY_ID`/`FACILITIES_BY_ID` miss uniques). Wired hooks:
  asphalt-crew (desert paving), barn-raisers (1-month rinks), foundry-crew
  (+1 harvest), goalie-whisperer / warming-house-crew (tryout odds/candidates).

## How-to recipes

- **New action**: add to the `GameAction` union (`types/game.ts`) → case in
  `gameReducer` delegating to an engine function → dispatch from a component.
- **New overlay/panel**: add id to `Dashboard`'s `OverlayView` + `overlayTitle`
  → render inside `TaskOverlay` → button in `CommandRail`/`InfoDock`.
- **New map marker**: add a `xxxMarker()` Graphics fn in `IsoWorldMap.tsx`
  modeled on `rinkMarker`/`hockeyOrgMarker`; insert in `drawScene`'s marker
  block respecting the three fog tiers (`explored`/`visible`/`memory` +
  `applyMemory`), subtract `rise` from y, pick zIndex `gx+gy+0.2..12`; add a
  minimap dot. IsoWorldMap is ~2,800 lines — edit surgically.
- **New content**: add plain objects in `src/data/*`; effects only work if an
  engine system reads them (income effects are read by `selectors.
  getMonthlyIncome` / `getMonthlyEquipment` automatically).
- **Club theming in UI**: inline CSS vars
  `{"--club-accent": club.accent, ...} as CSSProperties`; assets via
  `clubAsset(club, "logo"|"leader"|"background"|"rink")`.
- **Styling**: single global stylesheet `src/styles/globals.css` (append
  sections at the end); fonts Cinzel (display) + Inter (UI).

## Gotchas

- `ResourceSet`/`EraRequirementId`/`Unlock` are closed unions — changing them
  is intentional compiler-guided surgery. `productionSystem.
  productionUpfrontCost` manually enumerates cost keys.
- `endMonth` mutates a `structuredClone` draft; reducer-path helpers return new
  objects. Both styles coexist — match the file you're in.
- Working builders must stay at 0 moves (`refreshScoutMoves` handles it) or
  End Month gating breaks.
- Old save states don't exist (no persistence) — shape changes need no
  migrations.

## Docs map (design intent)

- `docs/01_GAME_BIBLE.md` — pillars & fantasy
- `docs/11_INDEPENDENTS_AND_FEEDER_SYSTEM.md` — independents target design
- `docs/12_CLUB_HQ_BUILDINGS_AND_LOCAL_IMPROVEMENTS.md` — buildings vs map
  improvements, pond terrain doctrine
- `docs/13_ERA_ARC.md` — the 5-act era arc, era exit criteria, full tech table,
  Act-2 designs (match engine, borders, scout emissary, water traversal)
- `DECISIONS.md` — numbered product/tech decisions (append, don't rewrite)
- `PROGRESS_LOG.md` / `TASKS.md` — session history & open work

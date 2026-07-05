# Ice Empires

A Civ-style **hockey civilization** strategy game. Found a club, explore a
frozen unknown world, clear ponds and raise rinks, scout terrible-but-lovable
prospects, court independent hockey towns, meet your rivals, and grow a
grassroots pond team into a five-era dynasty.

Built with **React 18 + PixiJS 8 + TypeScript + Vite** — no other runtime
dependencies. Runs entirely in the browser on local state.

> Status: playable single-player Act I loop with Act II systems landing.
> The old "First 12 Months" prototype has grown into the real 4X spine —
> a persistent isometric world, a five-act era arc, builders/rinks, tryouts
> and rosters, an individual scouting corps with fog-of-talent, independents,
> club uniques, and rivals that take their own turns.

## Run it

```bash
npm install
npm run dev      # Vite dev server — open the printed local URL
```

Other scripts:

```bash
npm run typecheck   # tsc -b --noEmit
npm run build       # production build (also typechecks)
```

There is no test suite yet. Verify changes on the dev server and the **Dev
Panel** (toggle with **⌘⇧.**): reveal the map, grant pond techs, spawn a
builder, force tryouts, meet a rival/independent, and toggle any tech or
facility.

## The game loop

You pick one of **8 clubs** (Arizona Monsoon, Halifax Privateers, Helsinki Ice
Crown, Calgary Iron Herd, Prague Lions, Minnesota Nova, Detroit Forge,
Stockholm Frost), found your HQ on the world map, then play out monthly turns:

- **Economy** — Funds (the single purchase currency), Hockey Knowledge (fuels
  research), and Reputation (a standing stat you never spend). Production is
  paid in full up front, Polytopia-style, and then built over time. Equipment
  is a separate inventory that gears your recruits.
- **Explore** — a persistent isometric world with Polytopia+Civ-VI fog: explored
  tiles stay lit forever, line-of-sight gates live info. Scouts and builders move
  and reveal the map.
- **Build the ice** — Rink Rats builders clear snow into cleared ponds, raise
  Level-1 rinks, pave desert street rinks (Arizona), and harvest forest branches
  for equipment. Rinks near your HQ ("club rinks") enable tryouts and pay funds.
- **Research** — a 40-tech tree across five eras (branches × era columns with
  prereq chips). Only pond techs gate behavior in Act I.
- **Recruit** — Hold Tryouts to generate and sign players (attributes on a
  20 scale; pond-era rolls are humble). Auto-equip gears the roster FIFO each
  month. Era exit wants a full geared line including a goalie.
- **Scout** — every field scout is a named person with Judging Potential/Ability,
  bought at a quality tier (Volunteer/Traveled/Ace) and earning promotions from
  fieldwork. Establishing a scouting network beside an independent reveals its
  prospect pipeline — shown as **estimate ranges** (fog-of-talent), not exact
  numbers.
- **Court independents** — city-state analogs you contact for influence, rising
  through Contacted → Friendly → Partner → Affiliate tiers.
- **Meet rivals** — cinematic first-contact scenes with an attitude choice.
  Rivals take their own turns: they found HQs, build and wander scouts, raise
  rinks, court independents, and advance eras on their own clock.
- **Advance the eras** — a five-act arc (Pond Hockey → Club Formation →
  Competitive Hockey → Hockey Operations → Dynasty). A club advances when its
  current era's checklist is met.

## Architecture

Three layers, strict dependency direction (content → data, rules → engine,
UI → components; every shared type in `src/types/game.ts`):

```
src/data/*        content as plain objects (clubs, units, facilities, research,
                  eras, cards, independents, scouts, club uniques, names)
src/engine/*      pure rules — gameReducer dispatches actions to system modules;
                  turnResolution.endMonth runs the monthly resolver
src/components/*  React UI + the PixiJS isometric map (IsoWorldMap)
src/types/game.ts every shared type
```

- **State** is one `useReducer(gameReducer, initialState)` in `App.tsx` — no
  context, store, or router. State flows down via props, actions flow up via
  `dispatch`. Phases (`landing → clubSelect → founding → playing`) pick the
  top-level screen.
- **The turn** is `engine/turnResolution.endMonth`, which clones state and runs
  systems in a fixed order: income → auto-equip → production → builder work →
  research → discovery → connection → rival rumors → rival turns → independents →
  rival eras → events → era progress.
- **Determinism**: every random roll threads a seeded RNG (`nextRandom`) and
  writes the seed back — never `Math.random` in engine code.

`CLAUDE.md` is the fast-path guide for working in the code (systems cheat sheet,
how-to recipes, and gotchas). Read it before exploring.

## Docs

Design intent and history live alongside the code:

- `docs/01_GAME_BIBLE.md` — pillars & fantasy
- `docs/11_INDEPENDENTS_AND_FEEDER_SYSTEM.md` — the independents/feeder design
- `docs/12_CLUB_HQ_BUILDINGS_AND_LOCAL_IMPROVEMENTS.md` — buildings vs. map
  improvements, pond terrain doctrine
- `docs/13_ERA_ARC.md` — the five-act era arc, exit criteria, the full tech
  table, and Act II designs
- `DECISIONS.md` — numbered product/tech decisions (append-only)
- `PROGRESS_LOG.md` — session-by-session history
- `TASKS.md` — completed and open work

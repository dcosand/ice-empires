# Ice Empires — Progress Log

## 2026-06-27 — 4X spine pass
Unifies the founding map and the in-game map into one persistent world and adds
the Explore→Expand→Exploit→Compete spine. Engine validated with a headless
end-to-end simulation (founding → discovery → scout → survey → influence → rival
rumor) — all core assertions pass.
- **Persistent world** (`engine/world.ts`, `state.world`): founding tile map is
  now the Month 1+ world. HQ tile, fog, and discoveries persist. Regions moved
  onto fixed tiles (`region.tile`); the old node map was removed. New `WorldMap`
  renders one interactive tile grid with HQ, scout, and region/contested overlays.
- **Region states**: hidden/rumored/discovered/surveyed/influenced + contested;
  detail in the side panel, overlays on tiles.
- **Scout unit** (`engine/scoutSystem.ts`): unlocks after Scouting Reports + a
  facility; 3 MP/month; moves + reveals fog; Surveys discovered regions (hints).
- **Establish Local Connection** (`engine/regionDevelopment.ts`): 2-month effort
  on a surveyed region → influenced (+1 Reputation/month).
- **Rival rumors** (`engine/rivalSystem.ts`): from Month 6, marks known regions
  contested with rival-club log lines. No rival AI/units/diplomacy.
- Monthly resolver now runs connection progress, rival rumors, and scout refresh;
  every month yields a meaningful world update. Decisions D12–D15 recorded.

## 2026-06-27 — v4: turn discipline, founding movement, club assets
- **Founding movement points**: Founding Group gets 2 moves/turn; each move to an
  adjacent valid land tile costs 1; water impassable; only valid moves highlight.
  UI shows "Moves remaining: X / 2"; an "End Founding Turn" button refills. Fog
  starts small (tiles around the unit), so the board isn't revealed in one go.
- **Month gating**: End Month is disabled until a build and a research project are
  active (Local Hockey Search always defaulted), with helper copy naming what's
  missing. A completed project empties its slot, forcing a new pick next month;
  if no options remain, End Month is allowed.
- **Six playable clubs**: Arizona, Halifax, Helsinki, Saskatoon, Prague, and
  Minnesota Nova are selectable as real `ClubDef`s (shared mechanics for now,
  distinct identities). Removed "Recommended" and "Coming Soon".
- **Club art wired** via `assetKey` (`clubAsset()`): logo/leader/background used on
  the club-select cards, the founding intro (now a prominent club "reveal" with a
  large leader portrait, logo banner, and background), the founding-map side
  panel, and the dashboard TopBar. `<img onError>` guards against broken images.
  Handles the `minnesota-nova` → `minnesota` folder mismatch via assetKey.
- Rival AI / multiplayer explicitly deferred (TODO in `gameReducer.ts`).

## 2026-06-27 — v3: founding map + production clarity
Adds a minimal Civ-style founding flow and reframes resources.
- **Pre-founding tile phase** (`foundingMap`, "Month 0"): a small hand-authored
  9×6 tile map (`engine/foundingMap.ts`) with terrain, fog, and a **Founding
  Group** unit. Click to select → adjacent valid land tiles highlight → click to
  move → radius-1 fog reveal. No procedural gen / pathfinding.
- **Found Club** from the unit's tile creates the **Club HQ** there; the unit
  becomes "Club Leadership"; an "Enter the Pond Hockey Era · Month 1" button
  transitions to play. New actions: START_FOUNDING / SELECT_FOUNDING_UNIT /
  MOVE_FOUNDING_UNIT / FOUND_CLUB (now tile-aware) / BEGIN_SEASON. `foundClub`
  no longer forces the phase.
- **"Local Hockey Search"** replaces early "Scouting Focus" with six grassroots
  options (Find Local Players, Ask Around the Rinks, Search for Playable Ice,
  Recruit Volunteers, Host an Open Skate, Follow a Local Rumor); discovery system
  rewired to match. Added a locked hint: formal scouts unlock later.
- **Production/research clarity**: builds are now production-per-turn (Operations
  income flows into the active build — no upfront drop to zero; see DECISIONS D2).
  Build/research panels show readable progress bars (produced X / Y + ~months
  left). Resource bar gains per-stat captions + tooltips.
- Music path updated to the moved `public/assets/Forge of Empires.mp3`.

## 2026-06-27 — v2: strategy / map-first visual revision
Driven by the first visual review ("too much like a web dashboard of rectangles").
Engine, resources, build/research/discovery/era logic all preserved.
- Landing CTA → "Start New Dynasty" with "Opening Scenario: First 12 Months"
  subtext and copy framing the full game as longer than 12 months.
- New **club selection screen** (phase `clubSelect`): Arizona Monsoon HC playable
  + 5 "Coming Soon" fictional clubs (Halifax, Helsinki, Saskatoon, Prague,
  Minneapolis) in `data/clubRoster.ts` to sell the 4X fantasy.
- New **WorldMap** ("Mythic Hockey World"): stylized 2D map (Civ-II-flavored
  gridlines + desert→ice terrain), HQ home marker, region nodes placed via new
  `region.map` coords, fog/rumor/discovered states, scouting-route lines, a
  pulsing fog scan, and click-to-inspect region detail. No tile-gen/pathfinding.
- **Scouting Focus** chip selector under the map (replaces the old button list);
  active focus is flagged on the map, pointing at the fog.
- **This Month** guidance panel with a Month-1 checklist (build / research /
  scouting focus / End Month) + hint that only Local Notice Board is affordable;
  "Affordable" badge added in the Build panel. End Month now lives in this panel.
- Dashboard relaid out as map-first: map+scouting on the left, command sidebar
  (This Month, Build, Research, Cards, Era, Club HQ, Log) on the right. Removed
  the dead RegionsPanel (folded into the map).


## 2026-06-27 — Initial prototype scaffold
- Read all source docs; produced implementation plan and recorded decisions
  (`DECISIONS.md`).
- Scaffolded Vite + React + TypeScript project (no backend, local state).
- Data layer (`src/data`): Arizona Monsoon HC, 5 facilities, 5 research techs,
  10 regions, 5 cards, flavor events, 2 eras + Club Formation requirements,
  5 discovery priorities.
- Engine (`src/engine`): seeded RNG, initial/founding state, resources helpers,
  selectors, and the monthly resolver `endMonth` wiring build/research/discovery/
  event/era systems. Reducer maps all actions.
- UI (`src/components`): Landing → Founding → Dashboard with TopBar, ResourceBar,
  Club HQ, Build, Research, Discovery, Regions/Hockey World, Cards, Event Log,
  and Era Progress panels, plus End Month.
- Dark "ice/empire" palette in `styles/globals.css`. Functional, not over-polished.

Result: a playable 12-month loop. Founding → monthly decisions → income, builds,
research, discoveries, cards, and a Club Formation Era unlock, with a Month 13
teaser at the end.

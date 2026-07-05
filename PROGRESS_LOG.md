# Ice Empires — Progress Log

## 2026-07-04 (later still) — Act II: the Club Scout (D38)
Two scout tiers land. Headless sim now 82 assertions, all passing.
- The dead `basic-scout` org-unit placeholder (region-era leftover) became the
  **Club Scout** map unit: club-formation era, `scouting-reports` tech,
  14 funds, 2 months, scout-quality tier picker applies (it rolls a D31 scout
  character like any map scout).
- **Networks supersede v1**: only Club Scouts network (`networkTargetOrg`
  checks `unitDefId`), and establishing is INSTANT — `autoEstablishNetworks`
  runs at the end of every MOVE_SCOUT chain and a monthly sweep catches scouts
  already in position (produced beside an org, or an org contacted while they
  stood there). No more 2-month park; pond scouts lost the verb. The overlay's
  Establish order still works as a manual fallback (same instant path).
- `createScoutUnit`/`spawnProducedScout` now thread the unit def id, so map
  scouts know their tier.
- Still ahead in §4: rival networks (Anchor-race AI), scout assignment +
  reports (D39 — rides on the D40 ratings pass), first-contact roster reads.

## 2026-07-04 (later) — Act II phase 1b: territory teeth + seasonal tryouts
Finishes TASKS §1 and lands §3. Headless sim extended to 69 assertions (all
passing); typecheck clean. Territory now claims impassable tiles too (water/
mountains inside a projection are yours — borders are ownership, not
walkability), and the male skater player art pool grew 8 → 32.
- **Independent contention (D35)**: `accrueRinkPresence` monthly — a player
  rink (level ≥1) within Chebyshev 3 of a contacted indie courts them (+1
  influence/mo, tier-ups logged); a rival rink in the zone marks their contact
  (+5) then accrues +1/mo. The Anchor race now has a bricks-and-boards lane.
- **Rival grievance (D35)**: `rivalTerritoryNearby` — starting a rink build
  within 1 tile of a contacted rival's territory flips their attitude to wary
  and logs "X resents the build" (event log until the Inbox, D41).
- **Seasonal tryouts (D37)**: spring (May) + training camp (Aug–Sep) windows;
  `out-of-season` gate names the next window. Applies from Club Formation on —
  pond era stays any-month (forgiving-pond doctrine). `trainingCampsHeld`
  counts camp-window tryouts for the future `training-camp` era gate. Dev
  Force Tryouts bypasses via `holdTryouts(state, { force: true })`.
- AI-club tryout parity deferred (rivals have no recruiting loop yet); era
  requirement wiring (§7) still waits on owner confirmation of the exit set.

## 2026-07-04 — Act II phase 1: territory spine (D34/D35/D36)
First Act II implementation session. Design docs (docs/14, D33–D41) landed on
main via PR #2 mid-session. Validated with a headless sim through the real
engine functions (42 assertions, all passing) + typecheck + production build.
- **Two-radius rink model (D34)**: `CLUB_RINK_RADIUS` → `HOME_RINK_RADIUS`
  (= 3, all economy behavior unchanged); new `getPlayerRinks` returns every
  player rink regardless of distance.
- **`engine/territorySystem.ts` (D34)**: computed tile ownership, derived per
  call like income — HQ (r=3) + player rinks level ≥1 (r=2) + Affiliate
  independents (r=2) vs contacted rivals' HQ + rinks; rounded-disk projection
  (same shape as the sight disks), nearest-source tie-break, ties favor the
  player; uncontacted rivals excluded so unknown borders can't leak or fence.
- **Border render (D35)**: `territoryBorderMarker` in `IsoWorldMap.tsx` strokes
  owned-tile edges facing other owners — dark outer edge + bright inner ribbon
  in the owner club's accent, explored tiles only, zIndex just above the tile
  top. Minimap: 40%-alpha club-color wash over owned explored tiles.
- **Territory → tryouts (D35)**: `territoryTryoutBonus` — beyond the 37-tile HQ
  founding footprint, +1 candidate per 7 owned tiles and +1 attribute floor per
  10 (capped +3), stacking with Warming-House Crew / Rink Evangelist. First
  tryout on a fresh map is unchanged (3–5 locals).
- **Boundary enforcement (D36)**: `buildBlockedByRival` (Chebyshev ≤3 of a
  contacted rival HQ, or inside contacted-rival territory) rejects clear-snow /
  rink builds / desert paving; builders cannot MOVE into known rival territory
  (`moveableTilesFor` — relocated `world.ts` → `scoutSystem.ts` to avoid an
  import cycle — and `moveScout`); scouts cross all borders freely.
- Still ahead in Act II §1: independent contention + rival grievance (D35 items
  2–3, want the Inbox), then seasonal tryouts (D37), Club Scout (D38),
  confidence (D39), scouting screen, Inbox (D41), ratings (D40), era wiring.

## 2026-07-03 — Economy pay-upfront (D30) + scouting system v1 (D29/D31)
The two deferred design tasks from the 2026-07-03 handoff. Both validated with
headless sims through the real reducer (20 + 23 assertions, all passing).
- **D30 economy**: full cost charged when production starts, for units AND
  facilities; `ActiveProduction` became a `monthsRemaining/totalMonths` timer.
  Kills the old drip model's double-count (funds income used to land in the
  treasury AND advance the build — production was effectively free). Base
  income 5 → 3/mo; cancel refunds until work begins; End Turn no longer
  requires a production pick (saving up is legitimate; research still gates).
- **D31 scout characters** (the settled D29 fork): every map scout is a named
  person in `state.scoutStaff` with Judging Potential/Ability. Quality tiers
  at production (Volunteer/Traveled/Ace, ×1/×1.75/×2.5 funds); fieldwork XP
  (+2 goodie hut, +3 org first contact, +5 network) earns promotions (+1 to
  the weaker judging attr every 5 XP). Founding scout is a free volunteer.
- **Establish Scouting Network** (Act II, docs/13 §4.5): scout with
  `scouting-reports` parks 2 months beside a contacted independent →
  `networkedByPlayer`, +10 influence, prospect pipeline revealed.
- **Fog-of-talent v1 (D32)**: revealed prospects store true attrs + ceiling
  engine-side; the ledger renders only ESTIMATE ranges ("Sk 3–6 · Ceiling
  8–13") from `engine/talentFog.ts` — width scales with the establishing
  scout's Judging Ability/Potential, truth always inside the range, center
  seeded off-true. Tryouts stay near-exact; rival-rumor rung waits on Act II
  roster snapshots.
- **UI**: tier picker in the production confirm bar; Scouting Staff section in
  ClubHQ → Personnel (judging bars + XP); revealed pipeline table in the
  Independents ledger; "Establish Scouting Network" order in the map unit
  overlay; production copy moved to upfront-cost language everywhere.
- Still ahead from D29: fog-of-talent confidence ranges, rival networks /
  Anchor Club race, recruiting revealed prospects (Act III), later-era scout
  types, Level-1 rinks drawing local talent.

## 2026-07-02 — Act I: the five-era arc + Pond Hockey gameplay loop
The 5-act era arc lands (Pond Hockey → Club Formation → Competitive Hockey →
Hockey Operations → Dynasty) plus the complete Act I loop. Engine validated
with a headless end-to-end simulation (found → guaranteed pond → builder →
clear snow → 2-month rink build → harvest/equipment → tryouts → full geared
line incl. goalie → rival + independent first contact → era advance) — all 25
assertions pass. Decisions D16–D24 recorded; agent docs added (CLAUDE.md,
docs/13_ERA_ARC.md).
- **Economy consolidated**: Funds (Budget+Operations merged) + Hockey
  Knowledge; Reputation is now a non-spendable standing stat; Equipment is
  shed inventory that gears players (harvests + Equipment Shed, FIFO auto-equip).
- **40-tech tree** across five eras with branches; browsable era-column ×
  branch-row tech screen with prereq chips; only pond techs gate behavior.
- **Rink Rats builder** (Civ-worker analog): clear snow → Cleared Pond →
  Level 1 rink (2 months, `working` state); desert street rinks (Arizona);
  Harvest Branches → equipment. Rinks render on the iso map + minimap, grant
  vision, and pay +1 Funds/mo inside HQ radius 3 ("club rinks"). Worldgen
  guarantees a starter pond (or paveable desert flat) near every start.
- **Tryouts + roster**: seeded terrible-but-lovable candidates (goalies rare),
  TryoutScreen, ClubHQ Team tab with auto-assigned lines and gear badges. Era
  exit wants a full geared line including a goalie.
- **First contact**: rival meetings upgraded to a letterboxed cinematic with a
  friendly/wary greeting choice (stored for future diplomacy); independents get
  their own meeting scene + the Independents ledger (tiers Contacted/Friendly/
  Partner/Affiliate, influence bars, fogged prospect pipelines, rival crests,
  Send Introduction).
- **Club uniques framework**: unique unit + facility for all 8 clubs; wired:
  Asphalt Crew, Barn Raisers, Foundry Crew, Goalie Whisperer, Warming-House
  Crew. Rivals advance eras on their own clock with log broadcasts.
- **Act II designed** (docs/13_ERA_ARC.md): match engine v0, rival roster
  fog-of-war + snapshots, opponent results rumors, borders rendering, Scout
  Emissary networks, water traversal.

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
- **Six playable clubs**: Arizona, Halifax, Helsinki, Calgary, Prague, and
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
- New **club selection screen** (phase `clubSelect`): Arizona Monsoon playable
  + 5 "Coming Soon" fictional clubs (Halifax, Helsinki, Calgary, Prague,
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
- Data layer (`src/data`): Arizona Monsoon, 5 facilities, 5 research techs,
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

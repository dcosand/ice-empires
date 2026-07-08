# Ice Empires — Progress Log

## 2026-07-07 (night) — Research affordability UX; anytime-buy shortcuts; wanderer sound
See TASKS.md "🌙 SESSION HANDOFF — 2026-07-07" for the authoritative
where-we-left-off / what's-next. Highlights:
- **Research selection fix (owner repro):** the "can't select techs I can afford"
  bug was a feedback gap, not logic. Any available tech is now selectable; the
  unaffordable ones show a red cost badge/border and the confirm bar reports
  "Need N more Hockey Knowledge" with a disabled Begin Research; HK balance shown
  in the research header (`ResearchPanel.tsx`).
- **Next Tasks = must-resolve-only (D56):** removed the "Choose research"/"Choose
  production (or save up)" nags + dead End-Turn blocked line (`Dashboard.tsx`).
- **Header currency shortcuts:** Funds → Production, Hockey Knowledge → Research,
  active-research chip → Research (`TopBar.tsx`).
- **Wanderer signing sound:** stopped the double (practice ambience + eventGood
  stinger); reveal rides ambience only (`PlayerRevealScene.tsx`).
- **OPEN BUG (unchanged):** tryout music still doesn't fade in; `[tryout-audio]`
  instrumentation is live — needs owner's dev-server console output to diagnose.
- Verify: `npm run typecheck` + `npm run build` clean; research flow covered by an
  8-assertion headless sim.

## 2026-07-06 (night) — Wanderers + rival parity; UI dock; compact map (mid-session bedtime commit)
Big bundled chunk. See TASKS.md "🌙 SESSION HANDOFF" for the authoritative
where-we-left-off / what's-next.
- **Wandering neutral units (D53):** new `engine/wandererSystem.ts` (seeded
  roam/spawn/despawn, scout-tell whose accuracy scales with Judging Ability,
  recruit-or-scrap resolution, penalty box). `Wanderer` type + `world.wanderers`,
  `WorldUnit.penaltyBoxTurns`. `WandererScene.tsx` encounter popup; nomad sprite +
  minimap dot + penalty-box card notice in `IsoWorldMap`. `DEV_SPAWN_WANDERER` dev
  button. Recruit gamble reuses `tryoutSystem` tier bands; scrap-loss pays a +2 HK
  + scout-XP consolation.
- **Rival wanderer parity (D54):** extracted a pure `tryoutSystem.buildWandererPlayer`
  so human + rival recruits share ONE generator/odds. `resolveRivalWandererAt`
  (wandererSystem) engages a rival scout that lands on a wanderer; recruits grow the
  rival roster (rare good/legend), hostiles box the rival unit via
  `RivalUnit.penaltyBoxTurns`; logs only for contacted rivals.
  `rivalAI.moveRivalUnits` gates boxed units + calls it per step. Sim: 4,000
  encounters — recruit 0.342 (0.35 target), legend 0.039 (0.043), all hostiles boxed.
- **UI:** bottom-right command dock (tasks + unit card, Civ VI style); "Choose
  Research" simplified default with unlock icons + clock/integer turns, full tree
  behind a toggle.
- **Compact map + terrain:** 72×45 uniform scale-down, fewer lakes/mountains, more
  jitter, 8 majors preserved (`world.ts` constants).
- **Act II (D52):** Club Formation era exit set wired.
- **OPEN BUG:** tryout music still doesn't fade in (owner-confirmed). Re-encoded
  source to `.m4a` + re-added `tryout.load()`; STILL broken. Next: instrument the
  audio path (play() promise, volume RAF, readyState). Details in TASKS.md handoff.
- Verify: `npm run typecheck` + `npm run build` clean.

## 2026-07-05 (late night) — Match Engine v0: hockey is actually played (D51)
The Act III headliner pulled forward now that ratings unblocked it — scoped to
a self-contained EXHIBITION (no calendar, no era wiring). Design-first:
docs/17_MATCH_ENGINE.md + D51 before code. Headless match sim: 47 assertions,
all passing (determinism, box-score integrity, mean 4.3 total goals over 400
seeded games, ties ~22%, a competitive-era club beats pond locals 298/300);
typecheck + build clean.
- **Rival rosters (the true prerequisite)**: `RivalClub.roster: Player[]`,
  empty at worldgen, generated at FIRST CONTACT via the shared `playerGen`
  (2C/3W/3D/1G, pre-geared, band keyed to the rival's era: pond 20+25 →
  dynasty 58+30). All three contact paths generate (human bumps rival, rival
  bumps human, dev meet); `ensureRivalRosters` is the idempotent sweep.
- **`engine/matchEngine.ts`**: `simulateMatch` — pure, seeded (D3), period-by-
  period shot-chance model: chances from transition-vs-defense, conversion
  from attack-vs-goaltending (+physicality nudge), goals attributed to skaters
  weighted by Shooting/Passing. Both sides compose through `teamRatings`.
  Ties stand (it's a friendly). Star of the game: stolen games go to the
  goalie, else top points.
- **Initiation**: `PLAY_EXHIBITION` from the rival dossier's now-live
  "Arrange exhibition" button; gates = contacted rival + `hasFullLine` + one
  game per month (derived from `state.matchHistory` — no stored flag). Free
  in v0.
- **Presentation**: `state.pendingMatchResult` → box-score overlay
  (`MatchResultScreen` in TaskOverlay chrome: crests, period line, shots,
  goal reel, star) + an Inbox letter from the "Game Notes" desk (D50).
- **Dev Panel**: Force exhibition — contacts the nearest rival, gears/pads
  the roster to a legal line, bypasses the monthly gate, runs the real path.
- NOT built (still Act III): calendar/standings, OT/shootout, penalties,
  results rumors, development/aging. All of it will call `simulateMatch`.
- **Follow-up (same night, owner-directed)**: the rival dossier gains
  **"See their roster"** — a names/position/age list of the rival's players
  ("your scout saw them skate"; NO numbers — deeper reads wait for scout
  assignments per the fog doctrine), and the three deal placeholders (trade /
  intel / tech) regrouped as sub-options behind **"Let's make a deal"**.
  **Nationality now renders as an emoji flag** (`nationalityFlag`,
  `data/nationalities.ts`; French Canada = ⚜️, dual nationals show both) with
  the words in the tooltip — swapped on HockeyCard, ClubHQ Team rows, the
  Scouting board + player file, the indie pipeline, and the dossier roster;
  scout staff cards keep the text label.

## 2026-07-05 (night) — Watch slots, the signing race, and the Inbox (D48–D50)
The scouting arc's remaining §8B beats plus D41, in one pass. Headless sim now
124 assertions, all passing; typecheck + build clean.
- **Watch slots (D48)**: the first mission filing sweeps the whole org roster;
  after that only WATCHED players sharpen — `WATCH_PLAYER` toggles, capped by
  tier (Volunteer 2 / Traveled 3 / Ace 4). Sharpening is per player (+3
  effective judging per prior report by that scout, capped 14). An idle
  on-station scout nudges instead of filing air. Watch/Stop-watching buttons
  live in the Scouting player file and the org ledger's pipeline table.
- **Staleness (D39, derived)**: no mission at the org + newest report older
  than 6 turns → "stale" flag on board rows + a last-report note in the file.
  Nothing is erased — the file stays as written, trust is the player's call.
- **The signing race (D49)**: `SIGN_PROSPECT` — networked org + ≥1 filed
  report + 8 Funds. Seeded contest (influence + reports + proximity vs rival
  influence, both + a 15-pt roll) with a visible odds preview
  (uncontested/favored/contested/long shot). Win → prospect converts to a
  roster Player with the SAME id (scouting history follows them), signing
  cinematic. Lose → no funds spent; "→ Rival" stays in the pipeline. Monthly
  `rivalSigningPressure` lets hard-courting rivals (≥30 influence) sign
  prospects away on their own — the window genuinely closes.
- **Inbox (D50/D41)**: `EventLogEntry` gains `from`/`read`; new Inbox screen
  (sender lines — scouts by name, Rival Wire, desk names by type; unread
  dots; All/Unread/Scouting/Rivals/Club/Money filters; mark-all-read); dock
  button is now Inbox (inbox.png) with a live unread badge.
- Prospects now carry `gender` at identify (signing needs it); the signing
  reveal reuses `PlayerRevealScene` with a `"signing"` source beat.

## 2026-07-05 (later) — The scouting loop gets its verbs (D45–D47)
Playtest-driven session: the network beat was "too passive," reads were too
range-y, and scouts were indistinguishable. Headless sim now 103 assertions.
- **Explicit networks + celebration (D46)**: no more auto-establish — the
  Club Scout's unit card offers "Establish Scouting Network" (instant on
  click), which stages `NetworkEstablishedScene` (meeting-cinematic staging,
  offers "Begin the Scouting Assignment" as the next order). First contact now
  identifies the org's FULL roster (8–10 named players, up from 2–4 slots);
  numbers wait for assignments.
- **Scouting assignments (docs/15 §5 core)**: `ScoutMission` +
  `BEGIN_SCOUT_MISSION`/`RECALL_SCOUT`; assigned scout pins on station
  (`working: scout-org`), files a report batch every 2 turns, and each filing
  sharpens (judging +3/filing, capped) — repeat viewings visibly narrow reads.
- **EHM presentation (D47)**: scouted players show STATIC point reads (the
  off-true range center; honesty stays engine-side) + Ability/Potential star
  pair — only after a report exists. Report prose speaks in point projections
  with verbal hedging. OVR stays (the deliberate EHM departure).
- **Nationality identity (D45, parallel agent)**: nations + name pools;
  players/prospects/scouts roll nationality-weighted names; UI shows nations.
- Fixes: org buildings no longer hide units to their south (zIndex 12 → 0.55);
  unit production delivers next turn with upfront cost; contact-audio fade
  guard; indie name labels render above lowered building art.


## 2026-07-05 — Ratings foundation (docs/15 build order A + report history)
The attribute/ratings pass docs/15 reserved as the Act III gate. Compiler-guided
sweep across engine + UI; headless sim now 96 assertions, all passing; D42–D44.
- **1–100 scale everywhere** (owner: show players 1–100, never 1–20). Skaters:
  10 attrs in 5 EA-style groups; goalies: their own 6 (`PlayerAttrs` is a
  kind-discriminated union). Positions C/W/D/G. Hidden Durability/Discipline.
- **Derived ratings**: `engine/ratings.ts` — position-weighted `computeOverall`
  (never stored), 0.5–5 star tiers, `teamRatings` sketch for the future match
  engine. `Player.potential` is a first-class true-ceiling OVR, engine-side
  only — the UI shows your own players' ceilings as UNKNOWN until scouting
  earns the read (docs/15 §6 self-fog display lands with missions).
- **Shared generation**: `engine/playerGen.ts` (position/style/attr-band/
  potential/trait rolls; style biases distribution) feeds tryouts (pond band
  20–45; territory floor now +5 pts/step), wanderers (30–55), and org
  prospects (25–55, academy +5). Goalie Whisperer = goalie odds ×2.
- **Fog rescaled**: `talentFog` on 1–100 — volunteer ±20, traveled ±15, ace ±5;
  truth always inside; `estimateLine` shared by Independents + Scouting UIs.
- **Scout reports (D44)**: every prospect reveal files `state.scoutReports` —
  the establishing scout's ranges + deterministic scout's-voice prose
  (`engine/scoutReport.ts`), never leaking truth.
- **Scouting screen v2 (EHM)**: sortable/filterable/searchable board + player
  file (true bars vs fog-range bars, ceiling, scouting history). HockeyCard:
  OVR + stars + style + grouped bars (goalie block). Roster compare gains OVR.
- Still ahead (docs/15 §8B–D): missions/watch slots/range-narrowing,
  SIGN_PROSPECT race, development/aging/pyramid (Act IV), traversal.

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

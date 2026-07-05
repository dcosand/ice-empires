# Ice Empires — Decisions Log

Records the product/tech decisions called out in `docs/07_DATA_MODEL_AND_SYSTEMS.md §16`.

## D1 — Hockey Knowledge is science-per-turn
Hockey Knowledge has two roles: it's a displayed resource total **and** the fuel
for research. Each month, your Hockey Knowledge income is applied as progress
toward the active tech (`progressKnowledge += hkIncome`). Research has a point
cost; no upfront payment. This keeps the Civ-like "science per turn" feel.

## D2 — Builds are production-per-turn (revised v3)
~~Originally: Operations cost paid upfront, build takes N months.~~ Revised so
Operations reads as *production toward builds* (Civ-style), mirroring research:
selecting a facility costs nothing upfront; each month your Operations income is
applied to the active build's progress, and it completes when produced
Operations ≥ the facility's Operations cost. `buildMonths` is no longer a gate
(UI shows an estimated months-remaining from current production instead).

## D3 — Discovery is seeded-random, not pure-random
A deterministic mulberry32 PRNG is threaded through `state.rngSeed`. Outcomes
are reproducible per founding seed, so turns are debuggable, while months still
feel varied. Each discovery priority has a defined behavior (see
`engine/discoverySystem.ts`).

## D4 — Cards are unique
A card id can only be acquired once (`grantCard` is a no-op if already held).

## D5 — Month 12 does not hard-stop
Reaching Month 12 shows a "First 12 Months complete" teaser banner, but the
player can keep ending months (Month 13+). The whole point is to make them want
Month 13. Phase stays `playing`.

## D6 — "Recruited" = a card in `state.cards`
Acquiring any staff/prospect/player card satisfies the era requirement. No
roster/contracts in this prototype.

## D7 — Facility effects stack additively
Monthly-income effects from club base + facilities + cards are summed in
`getMonthlyIncome`. Income is recomputed from state each month (not stored), so a
facility completed this month begins yielding next month.

## D8 — Six selectable clubs share First-12-Months mechanics (temporary)
All six clubs (Arizona, Halifax, Helsinki, Calgary, Prague, Minnesota Nova)
are selectable and fully playable. Non-Arizona clubs currently reuse Arizona's
starting profile and mechanics; they differ only in name, leader title, flavor,
identity text, accent color, and art. Unique per-club mechanics are a future
pass. Removed the "Recommended" tag and the "Coming Soon" lock.

## D9 — Club art via `assetKey`, not `id`
Each `ClubDef` has an `assetKey` naming its `/public/assets/clubs/<assetKey>/`
folder (logo/leader/background `.png`). This decouples folder names from club ids
(e.g., `minnesota-nova` → `minnesota`). `clubAsset(club, kind)` builds paths;
`<img onError>` hides any missing image so there are no broken images.

## D10 — Turn discipline
- Month cannot end unless a build AND a research project are active (a Local
  Hockey Search always has a default). If a project completed last month its slot
  is empty and must be re-selected. If no options remain (not expected in
  year-one content), the slot counts as satisfied so End Month isn't soft-locked.
- Founding Group has 2 movement points per founding turn; a move to an adjacent
  valid land tile costs 1; water is impassable. At 0 points, movement is disabled
  until "End Founding Turn" refills. Initial fog reveals only the tiles around the
  start, so the player can't sweep the whole board in one go.

## D11 — Rival AI & multiplayer deferred
No rival GM AI and no human multiplayer (hotseat/async) in this prototype. They
need a dedicated design pass (opponent turns, diplomacy/contact, networking).
Rivals exist only as lightweight RUMORS (see D15). See the TODO in
`engine/gameReducer.ts`. No backend/auth/networking.

## D12 — One persistent world (4X spine)
The founding tile map IS the in-game world (`engine/world.ts`, `state.world`).
The HQ tile, revealed fog, and region discoveries all persist from founding into
Month 1+. The old percentage-positioned region-node map was removed; regions now
sit on fixed tiles (`region.tile`) and render as overlays on the one tile grid.
Still hand-authored (9×6), no procedural generation.

## D13 — Region/tile states
hidden → rumored → discovered → surveyed → influenced, with `contested` tracked
separately as a rival-interest flag. Rendering order on a tile: terrain, then
fog, then hockey-region/resource overlay. Detailed text lives in the side panel.

## D14 — Scout unit + region influence
The Scout unlocks once Scouting Reports is researched AND ≥1 facility exists. It
has 3 movement points/month, moves to adjacent valid land/ice tiles (revealing
fog), and can Survey a discovered region it stands on (→ surveyed, surfacing a
resource/prospect/staff/relationship hint). "Establish Local Connection" on a
surveyed region takes 2 months → `influenced`, granting +1 Reputation/month. One
connection effort at a time. Local Hockey Search remains the early non-unit
discovery action.

## D15 — Rival pressure as rumors only
From Month 6, once ≥2 regions are discovered, a discovered/surveyed/influenced
region may be flagged `contested` with a log line naming a rival club (e.g.
"A Helsinki Ice Crown scout was seen near Finnish Goalie Lakes."). No rival
units, pathfinding, trade, diplomacy, or leader screens — pressure/tension only.

## D16 — Two-currency economy (+ standing + inventory)
The four resources collapsed to two true currencies: **Funds** (Budget +
Operations merged — one production/purchase pool, Polytopia-simple) and
**Hockey Knowledge** (research, unchanged). **Reputation** remains a
`ResourceSet` key internally but is a non-spendable standing stat: nothing
charges it; actions *require* thresholds (e.g. Send Introduction wants rep ≥ 3).
**Equipment** is deliberately NOT a resource — it's `state.equipment` shed
inventory (harvests + Equipment Shed), consumed 1-per-player to gear recruits,
with a monthly FIFO auto-equip pass.

## D17 — Five-era arc with per-club milestone transitions
Eras: pond-hockey → club-formation → competitive-hockey → hockey-operations →
dynasty (`ERA_ORDER`). A club advances when its CURRENT era's requirement
checklist is fully met (Humankind-style; no global clock). Rivals advance on a
seeded month schedule (`rival.eraId`) and contacted rivals' transitions are
broadcast in the log for pressure. An era with an empty requirements list never
advances.

## D18 — Rinks are map objects; the Outdoor Rink facility is retired
Rinks are built on the map by builder units, not in the HQ panel (per doc 12's
"local improvements" doctrine). Staged: Clear Snow (instant, level-0 Cleared
Pond) → Build Level 1 Rink (2 months, needs Outdoor Rinkcraft). "Club rinks"
(Chebyshev ≤ 3 from HQ) enable tryouts and yield +1 Funds/mo each (replacing
the retired facility's income); every rink is a radius-1 vision source.
Worldgen guarantees a frozen pond (desert starts: a paveable flat) within 2
tiles of the start.

## D19 — Builders share the scouts array with a `kind` field
Map work crews (Rink Rats and unique replacements) are `WorldUnit`s with
`kind: "builder"` living in `world.scouts`, so movement/selection/vision/
markers reuse the scout code. Builders trigger goodie huts and first contact
but never survey regions. Multi-month builds use `unit.working`; working units
are pinned at 0 moves by the monthly refresh. Harvesting is once-per-tile via
`world.harvestedTiles` + zeroing the tile's `foliageDensity` (the grove
visibly disappears).

## D20 — PendingMeeting has kinds; one-popup rule has priority
`pendingMeeting` is `{ kind: "rival" | "independent", id }`. Popup priority is
encounter > rival meeting > independent meeting; every trigger early-returns
if anything is pending. The rival meeting is a cinematic leader scene whose
greeting choice stores `rival.attitude` ("friendly" | "wary") — the seed of
Act-3 diplomacy.

## D21 — Independents relationship ladder (city-state v1)
`WorldHockeyOrg` carries `playerContacted`, `influencePoints`,
`relationshipLevel` (Contacted 0 / Friendly 1 / Partner 2 / Affiliate 3 at
10/25/50 influence), `contactedByClubIds` (rivals court them too, by
adjacency), and 2–4 seeded `prospects` that stay fogged until Act-2 scouting
networks. First contact grants +1 rep and +5 influence; Send Introduction
(first-contact tech, rep ≥ 3, 1 fund) adds +5 influence.

## D22 — Club uniques: swap-in defs + combined registries
`data/clubUniques.ts` gives every club a unique unit and facility. Uniques
with `replacesUnitId` swap the base def out of that club's production list
(`unitsForClub`/`facilitiesForClub`); lookups of OWNED items must use the
combined `ALL_UNIT_DEFS_BY_ID`/`ALL_FACILITY_DEFS_BY_ID` registries. V1 wired:
Arizona Asphalt Crew (desert street rinks), Calgary Barn Raisers (1-month
rinks), Detroit Foundry Crew (+1 harvest), Helsinki Goalie Whisperer (goalie
tryout odds), Minnesota Warming-House Crew (+1 candidate); the rest are
honest stubs.

## D23 — Tech tree ships whole; prereq chips over drawn edges
All 40 techs across five eras are visible from month one (aspiration is the
point); only pond-era techs gate behavior in Act I. The tree screen uses era
columns × branch rows with prereq chips (green when met) instead of SVG edge
drawing — cheaper, and readable at any width.

## D24 — Roster players are first-class (not cards)
`state.roster: Player[]` with 20-scale attributes (pond-era rolls 1–6),
`hasEquipment`, and a personality note. Cards remain for staff/one-off
opportunities. Tryouts are the Act-I recruiting verb: tech + club rink +
3 funds → 3–5 seeded candidates. Era exit wants 6 geared players including a
goalie (`hasFullLine`).

## D25 — Upkeep arrives with Club Formation
The Pond Hockey era stays free (volunteers, shoveled-by-love rinks) so the
opening never punishes exploration. From Club Formation on, Funds income is
net of upkeep: 1/turn per field unit beyond the first, plus 1/turn per 2 club
rinks. Income can go negative; the treasury clamps at zero (no debt spiral in
this era). Rationale: the era transition should FEEL like becoming a real
organization — real bills are part of the fantasy. Player wages arrive with
contracts in a later era.

## D26 — Rival rinks and the favor race (AI parity v1)
`WorldRink.ownerClubId` (undefined = player). Rival build order: two scouts,
then one builder crew that raises up to 3 rinks near home (3 months each,
one slower than the human's clear+build). Rivals adjacent to an independent
gain per-club influence there (`org.rivalInfluence`, +5 contact / +2 courting
per turn) — the visible seed of Act II's Anchor Club competition. Player
selectors (club rinks, era checks, income, tryouts) count only player rinks.

## D27 — Sight: Polytopia reveal + Civ VI line of sight
Explored tiles stay fully lit forever (no memory dimming); current sight only
gates live information (rival unit positions). Line of sight blocks behind
mountains (level 3) and visible forest groves (level 1), with the Civ VI
"taller target shows over a lower blocker" rule; adjacent tiles are always
visible. No hills are rendered yet, so there is no vantage level — add it when
elevation becomes visual. Sight radii: scouts/founder/HQ 3, builders 2,
rinks 1. Verified by a headless LOS test (mountain shields, grove blocks flat,
mountain shows over grove).

## D28 — Retire the region / "Local Hockey Search" layer (2026-07-03)
Supersedes D13, D14 (region influence), and D15 (rumor pressure). The legacy
rumor-region discovery system was a passive backchannel: monthly RNG in the
event log that produced cards/reputation/region-reveals with no connection to
what the player was doing on the map. Independents (D21) already are the
"places that matter" (city-state analogs with a contact→influence ladder), so
regions were a parallel, redundant progression.

Removed wholesale: `data/regions.ts`, `data/discovery.ts`,
`engine/discoverySystem.ts`, `engine/regionDevelopment.ts`,
`engine/rivalSystem.ts` (region-based rumor pressure), `components/
DiscoveryPanel.tsx`, and the dead legacy `components/WorldMap.tsx`. Types
dropped from `game.ts`: DiscoveryState/Value, RegionDef, DiscoveryPriorityId/
Def, RegionConnection, and `GameState.discovery`. Actions dropped:
SELECT_DISCOVERY_PRIORITY, SURVEY_REGION, ESTABLISH_CONNECTION. Turn-loop
calls (resolveDiscovery / progressConnection / maybeRivalRumor) and the map's
Survey/Connect unit orders + region tile-detail + "Local Hockey Search" rail
task/overlay are gone. The "regions discovered" HQ stat became "independents
met." No behavior replaces the removed card/rep faucet yet — cards are parked
(see D29). Kept as inert forward-hooks (do nothing now, pending the scouting
rework): the `deeperDiscovery` Unlock and `improveDiscovery` UnitEffect union
members, plus the `"discovery"` event-log category (still used by scout logs).

## D29 — Scouting arc, scout attributes, and fog-of-talent (DESIGNED, NOT CODED)
Direction locked with the product owner; implementation deferred to a dedicated
session. Full design in docs/13_ERA_ARC.md → "The scouting arc." Summary:
- Scouting is an ACTIVE, unit-driven verb that evolves each era (Pond: explore +
  sign wanderers/tryouts; Club II: build a dedicated Scout, travel it to an
  independent, park to Establish a Scouting Network → reveals their prospects;
  Competitive III: a professional/"spy" scout gets intel on rival rosters
  (pre-scrimmage reports) and you start signing the indies you networked in II;
  Operations IV: a GM figure (maybe the club leader) flies to indies for
  affiliates/farm teams + influence; leagues/drafts/agents; Dynasty V: standing
  amateur scouts assigned across the map).
- Scouts are NOT equal — two attributes, **Judging Potential** and **Judging
  Ability**, that improve with experience. HYBRID acquisition model: pay an
  upfront quality tier at production (EHM-style "pay up for a better scout") AND
  earn promotions through fieldwork (Civ-XP). This only creates real tension if
  the economy is tightened first — see D30.
- **Fog-of-talent**: a scouted player's attributes are ESTIMATES with confidence
  set by an information-provenance ladder (tightest→loosest): tryout on your own
  ice (near-exact) > your scout visited the indie (scaled by that scout's
  Judging ratings) > the indie's own word (vague, oversells) > rumor from
  another major (secondhand). Potential and Ability are SEPARATE fogs. Every
  scouted player carries a "known-via" provenance that sets range tightness.
  Reshapes HockeyCard: attribute bars become confidence ranges (task #6).
- Talent sources become player-driven, not RNG: campfire goodie huts, tryouts,
  and (proposed) Level-1 rinks periodically drawing a local hopeful so map rinks
  matter beyond +funds/tryouts.
- CARDS are PARKED: the coach/prospect card feature has no clear meaning yet
  (coaches-on-cards feel odd; nothing puts them on the map). Do not build card
  triggers. Revisit whether cards become a Civ-VI-style "great people" special
  unit or are removed. Roster players stay first-class (D24), not cards.

## D30 — Economy: trial Polytopia pay-upfront (SHIPPED 2026-07-03)
Current model is Civ pay-over-time: Funds drip into `ActiveProduction.
progressFunds` on one slot (productionSystem.ts); only Hockey Knowledge is
charged upfront. The owner finds funds too plentiful — no "build X or Y"
tension. Direction: TRIAL a Polytopia-style full-upfront cost for units (at
least), tighten income, and lean on the D25 upkeep so each purchase is a real
"spend it or save it" choice. This is the unlock that makes the D29 paid-scout
tier meaningful. Blast radius is small (~productionSystem.ts + the production
progress UI), so it is cheap to trial and revert. Deferred to the economy pass.

**Shipped 2026-07-03**: full cost (funds + HK) charged at start for BOTH units
and facilities — one model, and it removes the income double-count (the old
drip counted funds income twice: into the treasury AND as production progress).
`ActiveProduction` is now a `monthsRemaining/totalMonths` timer driven by the
item's `buildMonths`; cancel refunds in full until the first End Month. Base
funds income tightened 5 → 3/mo (rinks still +1/mo each). Research keeps the
HK drip — out of scope. Turn discipline (D10) relaxed to match: production no
longer gates End Turn — with upfront costs, saving for a bigger purchase is a
legitimate play, so forcing a build would punish it. Research still gates.
Revert = make `productionUpfrontCost` HK-only and restore the income-fed
progress loop in `progressProduction`.

## D31 — Scout characters live on an individual scout roster (SHIPPED 2026-07-03)
The D29 open fork is settled with the owner: scout ratings live on INDIVIDUAL
scout characters (`state.scoutStaff: ScoutCharacter[]`), not a club-wide
capability. Each map scout unit is a named person (`ScoutCharacter.id` ===
the WorldUnit id) with Judging Potential + Judging Ability on the shared
20-point scale. Hybrid acquisition per D29:
- **Pay upfront** (rides on D30): a quality tier picked at production —
  Keen Volunteer ×1 (attrs 2–5), Traveled Scout ×1.75 (5–9), Ace ×2.5 (9–14).
  Tiers/multipliers in `data/scouts.ts`; the tier picker lives in the
  ProductionPanel confirm bar for `spawnsMapUnit: "scout"` units.
- **Promote through fieldwork** (Civ-XP): +2 XP goodie hut, +3 first contact
  with an org, +5 establishing a scouting network. Every 5 XP = a promotion
  (+1 to the WEAKER judging attribute, ties favor Potential), applied in the
  monthly sweep (`scoutStaff.applyScoutPromotions`).
- The founding scout gets a free volunteer character; builders never get
  characters.

**Establish Scouting Network** (docs/13 §4.5) also shipped: a scout with
`scouting-reports` parked adjacent to a CONTACTED independent runs a 2-month
`working` task (reuses the builder `working` shape, now the `UnitWork` union)
→ `org.networkedByPlayer`, +10 influence, prospects revealed with real seeded
names/ages/attrs, +5 scout XP. Prospect attrs are TRUE values for now —
fog-of-talent (D29 task) will blur them by the scout's judging ratings.
NOT yet: rival networks / Anchor Club race, recruiting revealed prospects
(Act III per docs/13 §6.1), era requirement wiring (club-formation exit list
is still empty by design — a partial checklist would advance the era early).

## D32 — Fog-of-talent v1: estimate ranges with honest bounds (SHIPPED 2026-07-03)
docs/13 §6.3 implemented for the provenance rungs that exist today:
- **Tryout (rung 1)**: near-exact — roster players and tryout candidates keep
  exact displayed attributes (you watched them play). Unchanged.
- **Scout network (rung 2)**: revealed prospects store TRUE attrs + a true
  ceiling (`potential`) engine-side, but the UI only ever renders
  `attrEstimates`/`potentialEstimate` ranges (`engine/talentFog.ts`). Range
  half-width = `max(1, round((16 - judging)/3))` — ability ranges use the
  establishing scout's Judging Ability, the ceiling uses Judging Potential.
  THE CONTRACT: the true value is always inside the range (fog is honest) but
  the center is seeded off-true (fog misleads) — a dud can look like a gem.
  Prospects carry `knownVia: "scout-network"`.
- **Org's own word (rung 3)**: the pre-network fogged teaser row IS this rung.
- **Rival rumor (rung 4)**: waits for Act II rival roster snapshots (§4.2).
HockeyCard range-bars are deferred until prospects render as cards (recruiting,
Act III) — today the ledger table shows compact "Sk 3–6 · Ceiling 8–13" reads.
Better intel later (a tryout) should COLLAPSE the range — re-scouting/refinement
is future work.

## D33 — Match engine moves from Act II to Act III
The original Act II plan (docs/13 §4.1) opened with competitive hockey. Reversed:
we do not yet understand player/team attributes well enough to make a match feel
good, and a shallow 5-attribute model would bake in bad assumptions. Act II now
builds the *evaluation* substrate (expanded ratings + scouting confidence +
team-level aggregates, see docs/14 §8) and competition becomes the Act III entry
criterion. Act II exit no longer requires playing or winning a game.

## D34 — Every rink projects territory; income stays local (two-radius model)
`CLUB_RINK_RADIUS = 3` splits into two independent radii: a **home economy
radius** (unchanged = 3) still gates income (+1 Funds/mo), the rinks/2 upkeep tax
(D25), and Hold Tryouts; a **territory projection radius** applies to *every*
rink regardless of distance and feeds computed tile ownership (HQ + rinks +
Affiliate independents). Fixes the Act-I anti-pattern where a forward rink was
strictly worse than a home rink. Territory is derived each turn/render from
sources, not stored per tile (like income).

**Shipped 2026-07-04**: `HOME_RINK_RADIUS = 3` in `rinkSystem.ts`;
`engine/territorySystem.ts` computes ownership from HQ (r=3) + player rinks
level ≥1 (r=2) + Affiliate independents (r=2) + contacted rivals' HQ/rinks,
rounded-disk projection, nearest-source tie-break with ties favoring the
player. Validated headless (42 assertions).

## D35 — Territory has mechanical teeth (never just map paint)
Owned territory drives, in priority order: (1) the tryout pool — more owned tiles
⇒ more candidates and a higher attribute floor (`holdTryouts`), the population
metaphor and the headline payoff; (2) independent contention (a rink/Club Scout
in an indie's zone feeds the Anchor Club race); (3) rival grievance — building
inside/against a contacted rival's territory nudges `rival.attitude` wary + an
inbox line; (4) movement/build gating (D36). Borders render Civ VI-style in club
colors from HQ + rinks.

**Shipped 2026-07-04** (all four teeth): (1) tryout pool
(`territoryTryoutBonus`: +1 candidate / 7 tiles, +1 attr floor / 10 tiles
capped +3, beyond the 37-tile HQ founding footprint); (2) independent
contention (`accrueRinkPresence`: a player rink within Chebyshev 3 of a
contacted indie pays +1 influence/mo; a rival rink there marks their contact +5
then +1/mo); (3) rival grievance (`rivalTerritoryNearby`: starting a rink build
within 1 tile of contacted-rival territory flips them wary + a "resents the
build" log line — event log until the Inbox, D41); (4) movement/build gating
(D36). Border render: main-map ribbons + minimap wash.

## D36 — Boundary enforcement: min build distance + unit-kind movement tiers
Builders cannot build within N tiles of a known rival HQ or inside rival
territory (placement-time check; default N=3, possibly era-scaled). Movement is
gated by unit kind: **basic Scouts (and the Club Scout) cross all borders from
game start; Rink Rats/builders cannot enter a rival's territory.** No
open-borders negotiation for now — scouts already pass, so there is nothing to
trade yet; revisit as a Diplomacy-branch payoff if builders ever need to cross.

**Shipped 2026-07-04**: `buildBlockedByRival` (flat N=3, contacted rivals only)
wired into all three builder placement checks; builder movement gated in
`moveableTilesFor` (now in `scoutSystem.ts`) and `moveScout`.

## D37 — Tryouts are seasonal (twice/year), not any-month
Hold Tryouts is gated to two calendar windows — spring (≈ May) and training camp
(≈ Aug–Sep) — for the player *and* AI major clubs, in addition to the Funds cost.
Makes the month/year matter and pushes the game toward Eastside Hockey Manager's
scheduled scouting/camp rhythm. A completed camp cycle is a proposed Act-II exit
gate. Pool size/quality scale with territory (D35).

**Shipped 2026-07-04**: `tryoutWindowFor` in `calendar.ts` (May spring window;
Aug–Sep camp), `out-of-season` tryout gate with next-window copy. Windows apply
from CLUB FORMATION on — the pond era stays any-month, extending the
forgiving-pond doctrine (D25); revisit if playtest wants the calendar earlier.
`state.trainingCampsHeld` counts camp-window tryouts for the era requirement.
AI-club parity waits until rivals actually recruit (no roster loop to window
yet).

## D38 — Two scout tiers; the Club Scout owns network-building; scouts are assignable
Base **Scout** stays a generalist (explore, survey, passive first-contact read)
and crosses all borders. A new **Club Scout** (Club-Formation-era tech) is the
only unit that runs "Establish Scouting Network" on an independent — and it lands
**immediately on arrival** (the trek across the map is already the cost; no
on-site wait). Establishing reveals prospects, unlocks recruiting, speeds
influence, and starts the Anchor Club race. This **supersedes the shipped v1**
(D29/D31), where *any* scout carrying the `scouting-reports` tech established a
network only after parking two months. Either scout kind can be *assigned* to an
indie/major club for ongoing reports whose confidence grows while the scout stays
and goes stale once it leaves (see D39). No per-club unique scout units — saves
the uniques budget for later eras.

**Partially shipped 2026-07-04**: the Club Scout unit + instant on-arrival
networks are in (`club-scout` unit def replaces the dead `basic-scout`
placeholder; `networkTargetOrg` is club-scout-only; establish is instant via
move-chain auto-sweep + monthly sweep; the map-overlay order button still works
as a fallback). Still ahead: rival networks (Anchor race AI) and scout
assignment/reports (rides on D39/D40).

## D39 — Scouting is squad voyeurism, earned on the map (extends fog-of-talent)
The Act II continuation of shipped fog-of-talent (D32) and scout characters
(D31) — not a new system. Confidence lives entirely in the **width of the
estimate range** already rendered (`attrEstimates`/`potentialEstimate`); there is
no separate confidence badge.
- **Coverage** extends fog-of-talent from independents' prospects to *every*
  roster: independents, rival majors (D32's "rung 4" rumor tier), and your own
  players. **Your own roster is the most accurate** — tryout / near-exact (D32
  rung 1), because you watched them play; independents and rivals stay fogged.
- **Earned over time**: first contact with an independent or major club yields an
  immediate low-confidence full-roster read (major-club cinematic via
  tile/leader-overlay click; independent tile/ledger). A **Club Scout assigned**
  to that entity then narrows the ranges each month it stays — the refinement D32
  flagged as future work ("better intel should COLLAPSE the range").
- **Staleness**: confidence holds only while a scout is actively assigned there;
  if the scout leaves, the reports go stale (ranges widen / flag as outdated).
- Ratings and scouting are the same feature from two sides; this rides on the
  real per-attribute ratings pass (D40).

## D40 — Player/team ratings need a real pass before any match engine (TODO)
The 5-attribute, 20-scale `PlayerAttrs` is too thin to simulate hockey. Before
Act III we need: expanded per-position attributes, current-vs-potential
separation, per-attribute scouting confidence ranges, a derived overall/role
fit, and **team-level aggregate ratings** (offense/defense/goaltending/special
teams/cohesion) that a match engine composes from the roster. This is the gating
design task; it graduates to its own doc (`docs/15_PLAYER_AND_TEAM_RATINGS.md`)
when it matures.

## D41 — The Log becomes an Inbox
`EventLog` is promoted to an Inbox: existing monthly event entries plus news
items with a sender/source — team notes, scout reports, rival-GM messages,
independent overtures — with read/unread triage. Not a new parallel system;
an evolution of the log categories.

## D42 — One honest 1–100 rating scale; 10 skater + 6 goalie attributes (SHIPPED 2026-07-05)
Per docs/15 §3: the 5-attribute 1–20 model is replaced by a 1–100 scale
everywhere the player sees numbers (elite ≈ 90–99, average ≈ 75, pond locals ≈
20–45). Skaters carry 10 attributes in five EA-style display groups
(Offense/Defense/Skating/Sense/Mental); goalies carry their own 6 (goaltending
is a mini-game, not one number). `PlayerAttrs` is a `kind`-discriminated union;
hidden traits (Durability, Discipline) live off-card on `Player.traits`.
Never add: Form/Morale/Contract depth.

## D43 — Positions are C/W/D/G; OVR + stars derived; Player Style at generation (SHIPPED 2026-07-05)
`PlayerPosition` expands F→C/W (Center/Wing) so Faceoffs and line construction
matter. OVR is a position-weighted roll-up (`engine/ratings.computeOverall`) —
DERIVED at read time like income, never stored — with a 0.5–5 star tier.
Every player rolls a `PlayerStyle` (Sniper/Playmaker/… per position) that
biases attribute generation (`engine/playerGen.ts`, shared by tryouts,
wanderers, and org prospects) and later feeds match matchups. `potential` is a
first-class true-ceiling OVR on every Player, engine-side; the UI never shows
your own players' ceilings until scouting/development earns the read
(docs/15 §6 self-fog — the display side lands with the mission system).

## D44 — Scout reports are first-class state (SHIPPED 2026-07-05, extends D31/D32)
`state.scoutReports: ScoutReport[]` — every prospect reveal files the
establishing scout's report: their estimate ranges, ceiling read, and
deterministic scout's-voice prose built from the ranges they actually filed
(`engine/scoutReport.ts` — no RNG, never leaks truth). The Scouting screen is
now an EHM-style board (sortable/filterable/searchable) with a per-player
detail file: attributes (true bars for roster, fog-range bars for prospects),
ceiling read, and the full scouting history. Report depth/missions (docs/15
§5) will append to the same store.

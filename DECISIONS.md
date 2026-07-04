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

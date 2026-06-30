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

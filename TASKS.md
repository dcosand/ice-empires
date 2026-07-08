# Ice Empires — Tasks

## 🌙 SESSION HANDOFF — 2026-07-07 (night). READ THIS FIRST.

All work below is committed + pushed to `main`. Verified: `npm run typecheck`
+ `npm run build` clean; research flow covered by an 8-assertion headless sim.

### ✅ DONE & VERIFIED this session
- **Research affordability UX (fixes owner repro "can't select affordable
  techs").** Root cause was a FEEDBACK GAP, not a logic bug: Basic Skating costs
  4 HK, you start with 5, so after buying it you're at ~1–2 HK and the other pond
  techs (4–5 HK) are genuinely unaffordable — but the UI gave no cue and clicking
  them just opened a details modal. Fix (`ResearchPanel.tsx`): ANY available tech
  is selectable regardless of affordability; unaffordable ones get a red cost
  badge + border (still clickable, so you can line one up); the confirm bar shows
  **"Need N more Hockey Knowledge"** and disables *Begin Research* until payable;
  current HK balance now shown in the research header. `selectResearch` already
  guards affordability engine-side (no-op if you can't pay).
- **Next Tasks box = must-resolve-only (Civ VI style, D56).** Dropped the
  "Choose research" and "Choose production (or save up)" nags and the dead
  End-Turn "Needs:" blocked line (`Dashboard.tsx CommandRail`). Research +
  production are optional upfront buys now — nothing gates End Turn.
- **Header currencies double as spend shortcuts** (`TopBar.tsx`): click **Funds
  → Production** (Club HQ prod tab), **Hockey Knowledge → Research**, and the
  active-research chip → Research. Hover lift/glow marks them as buttons.
- **Wanderer double-sound fix** (`PlayerRevealScene.tsx`): "A Wanderer Signs On"
  no longer plays BOTH the practice ambience and the `eventGood` stinger — the
  stinger already fired on the map encounter, so the reveal now rides ambience
  only. Goodie-hut encounters still get their stinger via the map EncounterOverlay.

Earlier commits this same session (already on `main`): EHM number-value attribute
columns + depth-chart Team view + view-squad (79df876), Club HQ bigger/readable +
player-file bio layout (ca35cb3), backlog logging (b72f14f), text-size bumps
(ca769b2), **economy D56 uniform pay-now/next-turn + research-as-upfront-HK-buy**
(800feba), **era-transition audio-garble fix + tryout-audio instrumentation**
(a760b44). Player development & aging Phase 1 shipped prior (D55).

### ❗ OPEN BUG #1 — tryout-music fade-in STILL doesn't work (owner-confirmed)
Highest priority. `[tryout-audio]` console instrumentation is LIVE in
`BackgroundMusic.tsx` (`primeTryoutAudioElement` + `startTryoutMusic` log
paused/readyState/currentSrc/volume + play() resolve/reject) — committed a760b44.
Audio path is now `.mp3` (`data/sceneAudio.ts` → `tryout-signing.mp3`; owner is
wary of m4a). **NEXT STEP:** owner triggers a tryout on the dev server and pastes
the `[tryout-audio]` lines; diagnose from that, apply the fix, then REMOVE the
instrumentation. Suspect: autoplay-gesture scoping OR the crossfade RAF starting
before the element finishes buffering (compare to the working scene-music path in
the same file).

### ▶️ WHAT'S NEXT (owner priorities, in order)
1. **Fix the tryout-music bug** (above) — needs the owner's console output first.
2. **Economy follow-up slices** (from the D56 discussion; research half is done):
   - **Spending-encouragement cues** (Polytopia-style): a little SFX + an
     "affordable" heart/glow indicator when you can afford a tech/build. Research
     panel now shows affordability; production side + the SFX are NOT done.
   - **Center-top calendar** above the map with a turn-over flip animation (move
     Month/Year there; subtle month-flip on End Turn).
   - **Inbox triage:** decide modal vs. notification vs. inbox-only per event
     (inbox is too noisy); then a **right-side notification rail with MUCH LARGER
     icons** for alerts worth attention (owner chose the right-rail approach).
3. **Backlog (docs/18) — split by mode:**
   - *Needs a design pass FIRST (brainstorm, don't build cold):* the per-turn
     hockey loop; back out the multi-level scout system; research economy model +
     tech pacing; travel tech branch / team bus. These are Opus design sessions —
     see docs/18, decide, THEN build.
   - *Ready to build (decided/scoped, Sonnet):* Confirm-the-Dynasty screen should
     show club uniques (special unit/facility/traits) instead of the meaningless
     resource numbers; uniform overlay sizing (Team/Indies/People/Scouting share
     one responsive footprint); player-file text/dead-space; wanderer outcome
     modal + map animation.
4. **Rival full economy parity** — DEFERRED by design (see the 2026-07-06 block
   below); only as a deliberate project once uniques + player dev are built out.

---

## 🌙 SESSION HANDOFF — 2026-07-06 (night)

Mid-session commit at bedtime. This commit bundles a big chunk of work; here's
exactly where things stand.

### ✅ DONE & VERIFIED this session (typecheck + build clean)
- **UI layout (Phase 1):** in-game tasks moved to bottom-right command dock, unit
  card to its left (Civ VI style); "Choose Research" simplified screen is now the
  DEFAULT (unlock icons + clock+integer turns), full tech tree behind a toggle.
- **Act II finish (Phase 2, D52):** Club Formation era exit set wired
  (scouting-network / territory-projected / club-identity / training-camp);
  player-file access points; see D52.
- **Compact map + terrain (Phase 3):** smaller default map (72×45), fewer lakes,
  fewer mountains, more jitter — a true uniform scale-down (8 majors kept). See
  `world.ts` constants.
- **Wandering neutral units (Phase 4, D53):** full feature — roam/spawn, scout-tell
  encounter (`WandererScene`), recruit/scrap, penalty box, nomad sprite + minimap
  dot, `DEV_SPAWN_WANDERER` dev button ("🧍 Spawn wanderers by scout").
- **Rival wanderer parity (D54):** rivals engage wanderers on identical odds
  (shared `buildWandererPlayer`); recruits grow rival roster, hostiles box the
  rival unit. Validated: 4,000-encounter sim (recruit 0.342 / legend 0.039 / all
  hostiles boxed).

### ❗ OPEN BUG — tryout music still doesn't fade in (owner-confirmed, UNRESOLVED)
The tryout/signing music does not fade in when tryouts start. This has survived
several fix attempts and is the #1 thing to pick up. What's been tried:
- Split prime vs. crossfade (fixed a double-fire); re-added `tryout.load()` in
  `primeTryoutAudioElement` (`BackgroundMusic.tsx`) — the delta vs. the last known
  working build `b195815`. **Owner reports it STILL doesn't fade in.**
- Re-encoded the source: `tryout-signing.wav` was 30MB WAVE_FORMAT_EXTENSIBLE
  (0xFFFE, decodes unreliably) → added `tryout-signing.m4a`; `data/sceneAudio.ts`
  `TRYOUT_SCENE_TRACK.url` now points to the `.m4a`.
- **NOTE:** both `tryout-signing.wav` (modified) and `tryout-signing.m4a` (new) are
  in this commit; the live path is the `.m4a`.
- **Next step:** instrument the tryout audio path — log `play()` promise
  resolution/rejection, `volume` over the fade RAF loop, and `readyState` at
  `startTryoutMusic` time. Suspect: autoplay-policy gesture scoping (the fade
  starts before a user gesture unlocks the element) OR the crossfade RAF never
  ramping because the element is still buffering. Compare live behavior against the
  working scene-music crossfade path in the same file.

### ▶️ WHAT'S NEXT (owner priorities, in order)
1. **Fix the tryout-music fade-in bug** (above) — owner flagged it explicitly.
2. **Rival full economy parity** — DEFERRED by design (D54). Only pick up as a
   deliberate project (rivals run the player's production/tech/development pipeline
   + a difficulty dial), and only once club uniques + player development/XP are
   actually built out. NOT a quick bolt-on. Club-unique perks for rivals judged
   low-value now (only Arizona/Calgary/Detroit builders are wired; rest are stubs).
3. **Parked follow-ons:** fighting/toughness tech (scrap-loss should grant progress
   toward it — the consolation currently pays +2 HK + XP only); named local rinks
   (per-club default names, can't collide with indie names); fundraising/youth
   academy (docs/18 PARKED).

## Next up (from the 2026-07-02 playtest)
- [x] **Indie art coverage (2026-07-03)** — the worldgen name pool
      (`HOCKEY_ORG_NAMES` in `engine/world.ts`) is now kept in LOCKSTEP with the
      art folders under `/assets/independents/<slug>/{card,background}.png`, so
      every placed independent ships with real art (32 clubs as of 2026-07-03).
      slug = lowercase, de-accented, dashed display name ("Baie-Comeau" ->
      `baie-comeau`). To add/remove an indie: drop/remove its folder AND its name
      in the pool. Archetype SVG fallbacks remain via onError for mid-add gaps.
- [ ] **Curate SFX + notification/dock icons** — current picks are placeholders;
      swap points documented in `public/assets/vendor/README.md` (FILES map in
      `src/engine/sfx.ts`; `NOTIF_ICONS` + DockButton icons in Dashboard).
      NEW placeholder slots (2026-07-03): `crowd` (mapped to bong_001 — wants a
      real arena-murmur bed) and `cardFlip` (ui-audio switch — wants a paper
      whoosh), used by the player-reveal cinematic + tryout pack.
- [x] **AI parity pass v1 (2026-07-03)** — builders/rinks + independent courting shipped; tryouts/research playbooks still ahead. Original scope: — rivals currently: found HQs, build
      and wander scouts, make first contact, contact independents, and advance
      eras on a seeded clock. They do NOT yet: research, produce builders,
      clear snow / build rinks, harvest, hold tryouts, or grow influence with
      independents. Plan: give each rival a lightweight monthly "playbook"
      (same engine functions the human calls — builderSystem/tryoutSystem/
      independentsSystem take a clubId) with era-appropriate priorities, so AI
      capability tracks player capability system-by-system.
- [x] **Economy upkeep pass (2026-07-03)** — shipped per D25. Original scope: — funds currently only go up. Design per-turn
      upkeep: club rinks (small), map units (1/turn?), and later player wages
      via contracts (Act III). Must keep the pond era forgiving; upkeep should
      arrive with Club Formation so the era transition FEELS like becoming a
      real organization.
- [x] **Player-reveal cinematic (2026-07-03)** — shipped as a SHARED reveal
      (`PlayerRevealScene` + `HockeyCard`): letterbox + crowd-murmur swell +
      card-flip revealing name/position/attrs/note. Fires for the first-ever
      player from ANY source and for every goodie-hut wanderer (fullest fanfare
      when also the first). Subsumes the original "first-tryout cinematic";
      first tryout also gets the letterbox/crowd framing.
- [x] **HQ "city" map presence (2026-07-03)** — `hqMarker` draws a per-era city
      (plaza, timber barn-arena w/ accent dome, buildings, skyscraper TOWERS at
      higher eras, chimney steam, lit windows, banner) crowned by the leader
      medallion on a standard; grows across all 5 eras and clearly out-scales the
      neutral org districts. Rivals share it, keyed to their own era.
- [ ] **Replace hand-drawn ItemArt with game-icons set** (CC-BY attribution in
      credits screen) where the curated SVGs fit; keep bespoke art for the
      hero pieces.
- [x] **Tryout card browsing + roster compare (2026-07-03)** — `TryoutScreen` is
      a CAROUSEL (glide through hopefuls, focal card centered, neighbours peek;
      no flip in browsing — the reveal flip is reserved for the first-player
      cinematic). `HockeyCard` front now has a **headshot slot** (deterministic
      tinted monogram placeholder now; real art drops into `HEADSHOT_POOL_SIZE`
      later). Adds a **roster-compare table** stacking the focused hopeful vs
      your current players at that position (▲ where they beat your best) —
      answers "is this LW better than my forwards?". Fog-of-talent (confidence
      ranges) is the deferred follow-up per D29.
- [x] **Independents detail layout pass (2026-07-03)** — card poster upper-left
      in a two-column body, the background art is now a blended full-screen
      backdrop (not a boxed thumbnail), and the prospect pipeline is a scaling
      TABLE (Pos / Prospect / Word on them) ready for long lists.
- [x] **Retire legacy region/"Local Hockey Search" layer (2026-07-03)** — done
      per DECISIONS.md D28. The whole discovery/region backchannel was deleted
      (files, types, actions, turn-loop calls, map orders, UI); independents are
      now the sole "places that matter". Not merged INTO a kept search — the
      passive RNG loop was cut entirely (owner: it was a disconnected backchannel
      with no player-facing effect). No card/rep replacement yet — cards parked.

## Deferred to a future coding-agent session (fully speced — read first)
> These are bigger design tasks the owner intentionally deferred. FULL context
> in DECISIONS.md D29/D30 and docs/13_ERA_ARC.md §6 "The scouting arc". Read
> those before starting; the direction is locked, only implementation remains.

- [x] **Economy pass — trial Polytopia pay-upfront (2026-07-03)** — shipped per
      D30 (see the Shipped note there): full upfront cost for units AND
      facilities, `ActiveProduction` is a months timer, base income 5 → 3/mo,
      full refund on pre-work cancel, and End Turn no longer requires a
      production pick (saving up is a legitimate play; research still gates).
      Validated headless (20 assertions).
- [x] **Scouting system v1 (2026-07-03)** — shipped per D31: individual scout
      characters (`state.scoutStaff`, the settled fork) with Judging Potential/
      Ability, quality tiers at production (Volunteer/Traveled/Ace ×1/×1.75/×2.5
      in `data/scouts.ts`), fieldwork XP → promotions (+1 weaker judging attr /
      5 XP), and **Establish Scouting Network** (scout + `scouting-reports`,
      2 months beside a contacted indie → prospects revealed with real seeded
      identities, +10 influence, +5 XP). UI: tier picker in ProductionPanel,
      Scouting Staff section in ClubHQ Personnel, revealed pipeline in the
      Independents ledger, network order in the map unit overlay. Validated
      headless (23 assertions). STILL AHEAD from D29: rival networks / Anchor
      Club race, recruiting revealed prospects (Act III), pro/spy scout + GM +
      standing-scout eras, fog-of-talent (below).
- [x] **Fog-of-talent v1 (2026-07-03)** — shipped per D32: networked prospects
      show estimate RANGES (`engine/talentFog.ts`) scaled by the establishing
      scout's Judging Ability (attrs) and Judging Potential (ceiling); truth
      always inside the range, center seeded off-true. Tryouts stay near-exact
      (rung 1); the fogged teaser row is the indie's-word rung. STILL AHEAD:
      rival-rumor rung (needs §4.2 roster snapshots), HockeyCard range bars
      (when prospects become cards), range COLLAPSE on better intel.
- [ ] **Level-1 rinks draw local talent (proposed, docs/13 §6.4)** — make map
      rinks periodically surface a tryout hopeful so they matter beyond
      +1 funds/tryouts. Non-random, structure-driven talent faucet.
- [ ] **Cards — PARKED (DECISIONS D29).** Feature has no clear meaning yet; do
      not build card triggers. Revisit as Civ-VI "great people" special unit or
      remove. Roster players stay first-class (D24).

## Act II — Club Formation Era (next major arc)

Full design: `docs/14_ACT2_CLUB_FORMATION.md`. Decisions: D33–D41. Build roughly
top-to-bottom — territory is the spine everything else reads from. **Match engine
is deferred to Act III** (D33); do not build it here.

### 1. Territory & borders (the spine — do first)
- [x] **Two-radius rink model** (D34, 2026-07-04) — `CLUB_RINK_RADIUS` became
      `HOME_RINK_RADIUS` (= 3; income/upkeep/tryout gate unchanged); territory
      projection radii live in `territorySystem.ts`. New `getPlayerRinks`
      returns every player rink at any distance.
- [x] **Computed tile ownership** (D34, 2026-07-04) — `engine/territorySystem.
      ts`: derived per call (never stored) from HQ (r=3) + player rinks level ≥1
      (r=2) + Affiliate independents (r=2), rounded-disk projection (same shape
      as the sight disks), nearest-source tie-break (ties favor the player).
      Rival ownership from their HQ + rinks; uncontacted rivals excluded.
- [x] **Civ VI-style border render** (D35, 2026-07-04) — `territoryBorderMarker`
      in `IsoWorldMap.tsx`: dark outer edge + bright inner ribbon in club colors
      on owned-tile edges facing other owners, explored tiles only; minimap gets
      a low-alpha club-color territory wash.
- [x] **Territory → tryout pool** (D35, 2026-07-04) — `territoryTryoutBonus`:
      +1 candidate per 7 owned tiles and +1 attribute floor per 10 (cap +3)
      BEYOND the 37-tile HQ founding footprint, stacking with unique bonuses.
- [x] **Territory → independent contention** (D35, 2026-07-04) —
      `accrueRinkPresence` (monthly, after `trackRivalOrgContacts`): a player
      rink (level ≥1) within `ORG_ZONE_RADIUS` (Chebyshev 3) of a CONTACTED
      indie pays +1 influence/mo (tier-ups logged); a rival rink in the zone
      marks their contact (+5) then accrues +1/mo. Club Scout hook comes with
      D38.
- [x] **Territory → rival grievance** (D35, 2026-07-04) — `rivalTerritoryNearby`
      (within 1 tile of contacted-rival territory): starting a rink build there
      flips that rival's `attitude` to wary + drops a "resents the build" log
      line (event log for now; migrates to the Inbox with D41).

### 2. Boundary enforcement (D36)
- [x] **Min build distance** (2026-07-04) — `buildBlockedByRival` in
      `territorySystem.ts`: rejects clear-snow / rink / pave within Chebyshev 3
      of a CONTACTED rival HQ or inside contacted-rival territory; wired into
      all three `can*` checks in `builderSystem`.
- [x] **Movement tiers by unit kind** (2026-07-04) — builders cannot enter
      known rival territory; scouts cross freely. `moveableTilesFor` moved from
      `world.ts` into `scoutSystem.ts` (avoids an import cycle with
      territorySystem) and gates builder tiles; `moveScout` enforces the same.

### 3. Seasonal tryouts & training camp (D37)
- [x] **Windowed tryouts** (2026-07-04) — spring (May) + camp (Aug–Sep) windows
      in `calendar.ts` (`tryoutWindowFor`); `tryoutGate` returns `out-of-season`
      with next-window copy. Windows apply FROM CLUB FORMATION on — the pond
      era stays any-month (same forgiving-pond doctrine as delayed upkeep,
      D25). Dev-panel Force Tryouts bypasses via `holdTryouts(state, {force})`.
      AI-club parity deferred: rivals have no recruiting loop yet to window.
- [x] **Training-camp cycle as an Act-II exit signal** (2026-07-04) —
      `state.trainingCampsHeld` counts tryouts held in a camp window; the
      `training-camp` era requirement (§7) will read it.

### 4. Scouts, networks & evaluation (D38, D39)
- [x] **Club Scout unit** (D38, 2026-07-04; revised by D46 2026-07-05) — the
      dead `basic-scout` placeholder became the `club-scout` map unit
      (club-formation era, `scouting-reports` tech, 14 funds, scout-tier picker
      applies). Only Club Scouts network (`networkTargetOrg` requires
      `unitDefId === "club-scout"`); establish is INSTANT and — per D46 — an
      EXPLICIT unit-card order with a celebration cinematic (auto-establish
      removed). Pond scouts lost the verb (v1 superseded).
- [x] **Scout assignment + reports** (D46/D48, 2026-07-05) — `ScoutMission` +
      `BEGIN_SCOUT_MISSION`/`RECALL_SCOUT`/`WATCH_PLAYER`: assigned scout pins
      on station, first batch sweeps the whole roster, then finite WATCH SLOTS
      (Volunteer 2 / Traveled 3 / Ace 4) gate repeat viewings; per-player
      sharpening (+3 effective judging per prior report, capped); reads go
      STALE (derived, `REPORT_STALE_MONTHS`) when no scout is on station.
- [x] **First-contact roster read (indies)** (D46, 2026-07-05) — first contact
      identifies an independent's FULL roster (8–10 named players, org's-word
      teasers; numbers wait for assignments). PARTIAL (2026-07-05, D51
      follow-up): rival rosters now EXIST (generated at first contact) and
      the dossier's "See their roster" shows a names/position/age list — the
      FOGGED ATTRIBUTE read (talentFog ranges, scout assignments at rival
      orgs) is still ahead, as are rival networks / the AI side of the
      Anchor race — `rivalSigningPressure` (D49) is its first teeth, but
      rivals still don't network or watch.
- [x] **SIGN_PROSPECT contested race** (D49, 2026-07-05) — networked org + a
      filed report + 8 Funds opens the race: seeded roll of your influence/
      reports/proximity vs rival influence; win converts the prospect to a
      roster Player (same id, history follows, signing cinematic); lose costs
      nothing but the player ("→ Rival" stays visible in the pipeline).
      Monthly `rivalSigningPressure` closes windows on its own. STILL AHEAD:
      the development pyramid (Act IV) — signings land on the big club for now.

### 5. Player & team ratings system (docs/15 — build order A SHIPPED 2026-07-05)
- [x] **Attribute model & ratings (docs/15 §8A, D42/D43)** — 1–100 scale;
      10 skater attrs in 5 EA groups + 6 goalie attrs (`PlayerAttrs` is a
      kind-discriminated union); positions C/W/D/G; first-class `potential`
      (true ceiling, engine-side) + `PlayerStyle` biasing generation + hidden
      Durability/Discipline traits. New: `data/attributes.ts`,
      `engine/ratings.ts` (derived `computeOverall`, star tiers, `teamRatings`
      sketch), `engine/playerGen.ts` (shared generation: tryouts, wanderers,
      prospects). `talentFog` rescaled to 1–100 (volunteer ±20 → ace ±5).
      Validated headless (96 assertions).
- [ ] **Ratings still ahead (docs/15 §8C)** — §8B is now SHIPPED (missions,
      watch slots, staleness, `SIGN_PROSPECT` — D46/D48/D49). Remaining:
      self-fog (current-fast/potential-slow), development & aging + the
      pyramid + Development Coach (Act IV), tryouts reframed (homegrown +
      castoffs), per-scout report-depth beyond the +3 sharpening curve.

### 6. Screens & information
- [x] **Scouting screen v2 (2026-07-05, docs/15 §7 + D44)** — EHM-style board:
      one sortable/filterable/searchable table (scope + position chips, name
      search, click-sort columns: Pos/Name/Age/Style/OVR/Ceiling/Source/
      Reports); row click opens the player file — true attribute bars for
      roster, fog-RANGE bars for prospects, ceiling read, and the scouting
      history (each filed report: scout, org, date, ceiling read, prose).
      `state.scoutReports` filed on every prospect reveal
      (`engine/scoutReport.ts` — deterministic prose from the scout's own
      ranges). Still ahead: by-scout view, rival/major coverage, report depth.
- [x] **Log → Inbox** (D41/D50, 2026-07-05) — `EventLogEntry` carries
      `from`/`read`; new `Inbox` screen with unread triage, sender lines
      (scout by name, rival wire, desk names by type), filters, mark-all-read;
      dock shows a live unread badge (inbox.png). `MARK_INBOX_READ` action.
- [x] **Player-file access points (2026-07-06)** — the EHM player file
      (`PlayerDetail`) now opens as a shared `PlayerFileOverlay` (exported from
      `ScoutingScreen.tsx`, z-index 120 so it floats over every modal) from:
      ClubHQ → Team rows (clickable `LineSlot`), the player-reveal cinematic
      ("View full profile"), and tryout candidate cards ("View full file",
      candidate mode via `rowForPlayerLike` — `TryoutCandidate` is a Player
      minus equipment, so it reuses the roster-row path). Dashboard owns the
      `fileTarget` state and threads `onOpenPlayerFile` to the three screens.
- [x] **Tryout music regression (2026-07-06)** — TWO faults, both from the
      "Harden audio" commit (2e4b31e):
      1. **No sound at all (root cause):** the tryout bed was swapped from an
         `.m4a` to a ~30 MB `tryout-signing.wav` that was
         `WAVE_FORMAT_EXTENSIBLE` (0xFFFE) — browsers decode that variant
         unreliably and the size stalled first play, so tryouts opened silent.
         Re-encoded to AAC/`.m4a` (~3.4 MB) via `afconvert` and repointed
         `TRYOUT_SCENE_TRACK`. (The source `.wav` is still on disk, unused —
         safe to delete to save ~30 MB.)
      2. **No crossfade:** the silent gesture-scoped *prime* had been collapsed
         into `startTryoutMusic`, so the fade fired TWICE (prime event + the
         `tryoutActive` effect), each resetting volume to 0 and stomping it.
         Restored `primeTryoutAudioElement` (unlock-only, no fade) as the event
         handler; the `tryoutActive` effect is again the single crossfade driver.
- [ ] **Indie 'Send Introduction' / influence refinement (playtest
      2026-07-05)** — owner: the current introduction verb + influence economy
      at each independent needs a design pass (per-org flavor, costs, what
      influence buys at each tier). Fold into the docs/15 §6 affiliate/farm
      refinement, which is already flagged "after playtesting."

### 7. Era wiring
- [x] **Confirm + wire `club-formation` `ERA_REQUIREMENTS`** (2026-07-06) —
      owner signed off on all four proposed gates (docs/14 §1). Added
      `scouting-network` / `territory-projected` / `club-identity` /
      `training-camp` to the `EraRequirementId` union (`types/game.ts`), the
      requirement list in `data/eras.ts`, and `selectors.isRequirementMet`:
      network = any `hockeyOrgs[].networkedByPlayer`; territory = `getPlayerRinks
      (world, 1).length >= TERRITORY_RINKS_REQUIRED` (= 3, on top of HQ);
      identity = `club-identity` researched; camp = `trainingCampsHeld >= 1`.

### Deferred to Act III (do NOT build in Act II)
- [x] **Match Engine v0 (D51, 2026-07-05)** — pulled forward once ratings
      (D42–D44) unblocked it, as a self-contained EXHIBITION (no calendar, no
      era wiring). docs/17_MATCH_ENGINE.md. Rival rosters generate at first
      contact (`RivalClub.roster`, shared playerGen, era-banded, 2C/3W/3D/1G);
      `engine/matchEngine.ts` is a pure seeded period-by-period shot-chance
      sim reading `teamRatings` for BOTH sides; `PLAY_EXHIBITION` from the
      rival dossier (contacted + full line + once a month, derived); result
      overlay + "Game Notes" Inbox letter; Dev Panel Force Exhibition.
      Validated headless (47 assertions). STILL AHEAD (Act III proper):
      calendar/standings, OT/shootout, penalties off Discipline, fatigue off
      Durability, style matchups, home ice, era wiring.
- [ ] Opponent results rumors (needs the sim — now UNBLOCKED by D51).
- [ ] Water traversal / `embark` (Halifax Harbor Ferry) — nice-to-have, not an
      exit gate.

## Done
- [x] M0 — Read docs, write plan, record decisions.
- [x] M1 — Skeleton: Vite+React+TS app, Landing → Founding → Dashboard shell,
      initial state, all panels present.
- [x] M2 — Club founding wired (Arizona Monsoon).
- [x] M3 — Monthly loop: End Month advances time, adds income, logs events.
- [x] M4 — Build & research: select, progress, complete, apply effects/unlocks.
- [x] M5 — Discovery: priorities reveal region cards over months.
- [x] M6 — Cards: staff/prospect/player cards appear via build/research/scout.
- [x] M7 — Era progress: requirement checklist + Club Formation unlock message.

> Note: the engine for M3–M7 is implemented alongside the M1 skeleton because the
> systems are cheap and they make the rhythm actually playable. UI is functional,
> not yet polished.

## Next candidates (not started)
- [ ] localStorage save/load (Phase 2).
- [ ] Visual pass: Arizona Monsoon identity, card styling, log readability (Step 8).
- [ ] Tune discovery odds / balance the 12-month arc so the era unlock lands well.
- [ ] Light unit tests around `endMonth` and selectors.
- [ ] Scouting map prototype (Step 9) — only after the loop is proven fun.

## Icebox / done record

Design themes that need a brainstorm before building — "make the map more
meaningful" (roads/trade routes, districts/urban footprint), fundraising/youth
academy, victory conditions, etc. — live in `docs/18_BRAINSTORM_BACKLOG.md`, NOT
here. `TASKS.md` holds decided/in-flight work only. Completed experiments are
recorded below.

- [x] **Compact default map + terrain tuning (2026-07-06)** — world shrunk to
      72×45 (was 120×75); `TILES_PER_MAJOR_CLUB` 1125→400 keeps the full 8
      majors + 12 indies (uniform scale-down of the old placement). Terrain:
      fewer lakes (`LAKE_BASIN` 0.89→0.93), fewer mountains (`MOUNTAIN_RIDGE`
      0.93→0.955, `MOUNTAIN_INLAND` 0.54→0.6), more jitter (0.15/0.22→0.20/0.28),
      `SEA_LEVEL` 0.47→0.42 for a healthy ~58%-land landmass. Headless worldgen
      sim clean. See docs/18 "Smaller default map" (✅).

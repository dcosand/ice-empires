# Ice Empires — Tasks

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
- [ ] **Territory → independent contention** (D35) — a player rink/Club Scout
      inside an indie's zone feeds the Anchor Club influence race.
      `independentsSystem.ts`.
- [ ] **Territory → rival grievance** (D35) — building inside/against a
      contacted rival's territory nudges `rival.attitude` wary + an inbox line.

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
- [ ] **Windowed tryouts** — Hold Tryouts only in spring (~May) + camp
      (~Aug–Sep); out-of-window copy names the next window. Apply to AI clubs.
      `tryoutSystem.ts` + the tryout gate/UI.
- [ ] **Training-camp cycle as an Act-II exit signal** — track a completed camp
      window for the `training-camp` requirement.

### 4. Scouts, networks & evaluation (D38, D39)
- [ ] **Club Scout unit** — new map unit, Club-Formation-era tech gate; the only
      unit that runs "Establish Scouting Network", established **on arrival**
      beside an indie (no on-site wait) → reveals prospects, unlocks recruiting,
      speeds influence. Rivals can too (Anchor race). Supersedes shipped v1
      (any scout + `scouting-reports`, 2-month park — D38). `scoutSystem.ts` /
      new `clubScoutSystem.ts`.
- [ ] **Scout assignment + reports** — assign a scout to an indie/major club;
      ongoing reports with detail/confidence that grow over time and go stale.
- [ ] **First-contact roster read** — low-confidence full roster shown on the
      major-club cinematic (tile + leader-overlay click) and the indie
      tile/ledger. Rivals/indies already carry seeded `prospects` (D21).

### 5. Player & team ratings system (D40 — prerequisite for Act III)
- [ ] **TODO: expand the ratings model** — more per-position attributes,
      current-vs-potential, per-attribute scouting confidence ranges, derived
      overall/role fit, and **team-level aggregates** (offense/defense/
      goaltending/special teams/cohesion). Graduate to
      `docs/15_PLAYER_AND_TEAM_RATINGS.md`. This gates the match engine.

### 6. Screens & information
- [ ] **Scouting screen** — a v1 global board now ships in main
      (`src/components/ScoutingScreen.tsx`, opened from the map dock): lists known
      roster players (true ratings) + revealed prospects (fog ranges) with their
      source. Act II extends it: toggle by-scout / by-subject, sortable/
      filterable/searchable tables, per-row confidence, rival/major coverage.
- [ ] **Log → Inbox** (D41) — promote `EventLog` to an inbox: events + news
      (team/scout/rival-GM/indie) with sender/source and read/unread triage.

### 7. Era wiring
- [ ] **Confirm + wire `club-formation` `ERA_REQUIREMENTS`** — proposed:
      `scouting-network`, `territory-projected`, `club-identity`,
      `training-camp` (docs/14 §1). Add requirement ids to the `EraRequirement`
      union + `selectors.isRequirementMet` cases.

### Deferred to Act III (do NOT build in Act II)
- [ ] Match Engine v0 (blocked on ratings, D33/D40).
- [ ] Opponent results rumors (needs the sim).
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

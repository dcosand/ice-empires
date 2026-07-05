# Ice Empires — Tasks

## Next up (from the 2026-07-02 playtest)
- [ ] **Indie art coverage (TODO — assets in progress; wiring shipped 2026-07-03)** — independents read
      `/assets/independents/<slug>/{card,background}.png` (slug = lowercase,
      de-accented, dashed display name: "Baie-Comeau" -> `baie-comeau`,
      "Québec City" -> `quebec-city`). Done: anchorage, baie-comeau, brandon,
      bratislava, victoria. Everything else falls back to archetype SVG
      vignettes until its art lands. Wire-up: `src/data/independents.ts`.
- [ ] **Curate SFX + notification/dock icons** — current picks are placeholders;
      swap points documented in `public/assets/vendor/README.md` (FILES map in
      `src/engine/sfx.ts`; `NOTIF_ICONS` + DockButton icons in Dashboard).
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
- [ ] **First-tryout cinematic** — the first-ever tryout deserves a meeting-
      scene-style moment (letterbox, crowd murmur SFX, card-flip reveal of
      candidates one by one).
- [ ] **HQ "city" map presence** — the club HQ tile should out-impress the
      independents' mini-districts: bigger footprint, barn-arena, banner,
      lights; grows visually per era.
- [ ] **Replace hand-drawn ItemArt with game-icons set** (CC-BY attribution in
      credits screen) where the curated SVGs fit; keep bespoke art for the
      hero pieces.
- [ ] **Tryout card-flip browsing** — flip through candidate profiles like a
      pack opening; hockey-card backs using club palette.
- [ ] **Merge legacy region/"Local Hockey Search" layer into independents**
      (one "places that matter" system; retire the parallel rumor regions).

## Act II — Club Formation Era (next major arc)

Full design: `docs/14_ACT2_CLUB_FORMATION.md`. Decisions: D28–D36. Build roughly
top-to-bottom — territory is the spine everything else reads from. **Match engine
is deferred to Act III** (D28); do not build it here.

### 1. Territory & borders (the spine — do first)
- [ ] **Two-radius rink model** (D29) — split `CLUB_RINK_RADIUS` into a home
      economy radius (income/upkeep/tryout gate, keep = 3) and a territory
      projection radius (every rink, any distance). `rinkSystem.ts`.
- [ ] **Computed tile ownership** (D29) — derive owned tiles each turn/render
      from HQ + player rinks (level ≥ 1) + Affiliate independents, radius
      projection, nearest-source tie-break. Rival ownership from their HQ +
      rinks, shown only once contacted. New `engine/territorySystem.ts`.
- [ ] **Civ VI-style border render** (D30) — club-colored boundary-ring stroke
      (bright inner + dark outer) extending in the 4 diamond directions from HQ
      and rinks; rival borders in their colors once contacted. `IsoWorldMap.tsx`
      (edit surgically — ~2,800 lines); add minimap treatment.
- [ ] **Territory → tryout pool** (D30) — in `holdTryouts`, add `+1 candidate
      per ~6–8 owned tiles` and step the attribute floor up at territory
      breakpoints, stacking with existing unique bonuses. `tryoutSystem.ts`.
- [ ] **Territory → independent contention** (D30) — a player rink/Emissary
      inside an indie's zone feeds the Anchor Club influence race.
      `independentsSystem.ts`.
- [ ] **Territory → rival grievance** (D30) — building inside/against a
      contacted rival's territory nudges `rival.attitude` wary + an inbox line.

### 2. Boundary enforcement (D31)
- [ ] **Min build distance** — reject builds within N tiles (default 3) of a
      known rival HQ / inside rival territory. Placement check in `builderSystem`.
- [ ] **Movement tiers by unit kind** — basic Scouts (+ Emissary) cross all
      borders; Rink Rats/builders cannot enter rival territory. Gate in the
      move/`moveableTilesFor` path.

### 3. Seasonal tryouts & training camp (D32)
- [ ] **Windowed tryouts** — Hold Tryouts only in spring (~May) + camp
      (~Aug–Sep); out-of-window copy names the next window. Apply to AI clubs.
      `tryoutSystem.ts` + the tryout gate/UI.
- [ ] **Training-camp cycle as an Act-II exit signal** — track a completed camp
      window for the `training-camp` requirement.

### 4. Scouts, networks & evaluation (D33, D34)
- [ ] **Scout Emissary unit** — new map unit, Club-Formation-era tech gate;
      "Establish Scouting Network" adjacent to an indie (2 months) → reveals
      prospects, unlocks recruiting, speeds influence. Rivals can too (Anchor
      race). `scoutSystem.ts` / new `emissarySystem.ts`.
- [ ] **Scout assignment + reports** — assign a scout to an indie/major club;
      ongoing reports with detail/confidence that grow over time and go stale.
- [ ] **First-contact roster read** — low-confidence full roster shown on the
      major-club cinematic (tile + leader-overlay click) and the indie
      tile/ledger. Rivals/indies already carry seeded `prospects` (D21).

### 5. Player & team ratings system (D35 — prerequisite for Act III)
- [ ] **TODO: expand the ratings model** — more per-position attributes,
      current-vs-potential, per-attribute scouting confidence ranges, derived
      overall/role fit, and **team-level aggregates** (offense/defense/
      goaltending/special teams/cohesion). Graduate to
      `docs/15_PLAYER_AND_TEAM_RATINGS.md`. This gates the match engine.

### 6. Screens & information
- [ ] **Scouting screen** — extend the existing screen if present, else build
      it. Toggle by-scout / by-subject; sortable/filterable/searchable tables;
      per-row confidence. **NB (2026-07-05): no scouting/inbox component is in
      the tree — confirm where the "already in main" screen lives before
      starting.**
- [ ] **Log → Inbox** (D36) — promote `EventLog` to an inbox: events + news
      (team/scout/rival-GM/indie) with sender/source and read/unread triage.

### 7. Era wiring
- [ ] **Confirm + wire `club-formation` `ERA_REQUIREMENTS`** — proposed:
      `scouting-network`, `territory-projected`, `club-identity`,
      `training-camp` (docs/14 §1). Add requirement ids to the `EraRequirement`
      union + `selectors.isRequirementMet` cases.

### Deferred to Act III (do NOT build in Act II)
- [ ] Match Engine v0 (blocked on ratings, D28/D35).
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

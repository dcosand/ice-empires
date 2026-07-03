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

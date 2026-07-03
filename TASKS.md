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

- [ ] **Economy pass — trial Polytopia pay-upfront (DECISIONS D30).** Current
      Funds model is Civ pay-over-time (`ActiveProduction.progressFunds`, one
      slot). Flip units to full upfront cost, tighten income, lean on D25 upkeep
      so purchases are real trade-offs. Small blast radius (~productionSystem.ts
      + production progress UI); cheap to trial/revert. Unlocks the paid-scout
      tier below.
- [ ] **Scouting system — units, attributes, per-era arc (DECISIONS D29,
      docs/13 §6).** Active unit-driven scouting that evolves each era; scout
      Judging-Potential/Judging-Ability attributes; hybrid acquisition (pay
      upfront for quality + XP promotions). OPEN FORK to settle first: scout
      ratings on individual scout characters (a "scout roster") vs. club-wide
      capability.
- [ ] **Fog-of-talent (DECISIONS D29, docs/13 §6.3).** Scouted player attributes
      become confidence RANGES set by an info-provenance ladder (tryout > your
      scout > indie's word > rival rumor); Potential and Ability are separate
      fogs; players carry a "known-via" provenance. Reshapes HockeyCard (folds
      into task: Tryout carousel + headshots + roster compare).
- [ ] **Level-1 rinks draw local talent (proposed, docs/13 §6.4)** — make map
      rinks periodically surface a tryout hopeful so they matter beyond
      +1 funds/tryouts. Non-random, structure-driven talent faucet.
- [ ] **Cards — PARKED (DECISIONS D29).** Feature has no clear meaning yet; do
      not build card triggers. Revisit as Civ-VI "great people" special unit or
      remove. Roster players stay first-class (D24).

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

# Ice Empires — Brainstorm Backlog

**Purpose:** A living inventory of design/build items not yet done, kept
separate from `TASKS.md` (which tracks work already speced and in flight).
This doc is for things that still need a brainstorm — a real design
conversation — before (or instead of) a coding session. The owner adds to it
directly; items graduate out to `TASKS.md`/`DECISIONS.md` once a session
actually specs or ships them.

**How to add an item:** append to the relevant section (or a new one) using
the template at the bottom. Don't worry about ordering within a section —
the "Suggested order" list just below is the current read on priority and is
expected to get reshuffled as items get added or the owner's judgment changes.

## Model-tier legend

Used per item below as a build-time recommendation, not a rule:

- **Opus** — high-ambiguity design work: brand-new systems, economy/balance
  judgment calls, cross-system architecture, anything where a wrong call is
  expensive to unwind later (closed unions, derived-vs-stored state, D3
  determinism). Worth the cost for the first pass even if later iterations
  don't need it.
- **Sonnet** — the default. Well-specified extensions of an existing pattern:
  new content following a shipped shape, a new screen wired like an existing
  one, a system that rides an established doctrine (derived state, seeded
  RNG, closed unions). Most of this backlog lands here once a brainstorm has
  actually happened.
- **Haiku** — narrow, mechanical, low-ambiguity: asset swaps, isolated bug
  fixes, content-only additions with zero new logic.

Brainstorm SESSIONS (the conversation itself) are worth running on Opus
regardless of what tier the eventual build gets — the expensive part is
getting the design right, not typing the code.

## Suggested order (top of backlog)

- ~~Wire Club Formation era exit requirements~~ — ✅ DONE (D52).
- ~~Smaller default map~~ — ✅ DONE (72×45, experiment shipped 2026-07-06).

1. Research economy model + tech pacing — owner-felt playability problem
   (techs come too fast); a decision + tuning pass, see Economy & funds.
2. Back out the multi-level scout system — owner-flagged confusion; subtractive
   simplification, see Units, scouts & personnel.
3. Name your rinks — cheap, pure upside, no design risk.
4. Make the rink → tryouts connection legible — likely a quick UI fix that
   resolves real player confusion about what forward rinks are for.
5. Victory conditions & endgame — foundational, everything else assumes an
   answer eventually.
6. Rival AI parity (research/tryouts/scouting) — the AI is visibly behind
   the player's capability curve.
7. Player development & aging — biggest missing system relative to how much
   of the roster/scouting arc already assumes it exists.
8. Season calendar & standings — unblocks the rest of Act III.

---

## Blocking / near-term

### Wire `club-formation` era exit requirements — ✅ DONE (D52)
Shipped 2026-07-06: `ERA_REQUIREMENTS[club-formation]` is filled
(`scouting-network`, `territory-projected` = HQ + 3 rinks, `club-identity`,
`training-camp`) and `selectors.isRequirementMet` checks each. Kept here only
as a pointer; no longer open.

### Rival AI parity
Rivals found HQs, wander scouts, make contact, court independents, and now
fight over signings — but don't research, hold tryouts, run scouting
networks, or watch prospects. The gap is now large enough that "AI capability
tracks player capability system-by-system" (the original plan, D26) needs a
real architecture conversation: one shared "playbook" abstraction per era, or
bespoke per-system AI hooks like today?
**Model: Opus** for the playbook-architecture brainstorm; **Sonnet** per
system once the shape is picked.

---

## Rinks & local improvements

### Name your rinks
Owner idea (2026-07-06): let the player name a rink when they build it, so
the map starts to carry personalized landmarks instead of generic markers.
`WorldRink` (`src/types/game.ts:599`) has no `name` field today. Low
ambiguity — add the field, a naming prompt on build completion (or an
optional rename later), and surface it in the tile inspector/rink marker
tooltip.
**Model: Sonnet.**

### What does "Level 1" rink imply about Level 2+?
Owner question (2026-07-06): rinks are explicitly called "Level 1 Outdoor
Rink" (`world.ts` comment, `WorldRink.level`), which reads as if higher
levels are coming, but only level 0 (cleared pond) and level 1 (built rink)
exist in code. There's a real design ghost here: the OLD game bible
(docs/01 §Buildings, docs/12 lines ~476-498) had a Small Arena → Mega Arena
facility ladder, but that was designed for the pre-D18 world where rinks
were an HQ facility. D18 moved rinks onto the map as builder-built objects
and that upgrade ladder was never carried forward — it's genuinely
undecided whether map rinks should get Level 2+ upgrades (bigger ice,
indoor arenas, capacity/vision/income bumps) or whether "Level 1" should
just get renamed to drop the implication.
**Model: Opus** for the design (decide if/how the old Arena ladder maps onto
D18's map-rink model); **Sonnet** to implement once scoped.

### Make the rink → tryouts connection legible
Owner question (2026-07-06): it's unclear what a rink outside the club's
home-economy radius (`HOME_RINK_RADIUS`, D34) actually buys you toward
tryouts. The honest answer today: only ONE thing is a hard gate — you need
at least one club rink (level ≥1, inside the home radius) to hold tryouts
at all (`tryoutSystem.ts:84`, `getClubRinks`). A forward rink's effect is
entirely INDIRECT: it projects territory (D34's separate projection radius),
which feeds `territoryTryoutBonus` (+1 candidate/7 owned tiles, +1 attribute
floor/10, D35) — but nothing in the UI draws that line from "I built a rink
over there" to "my tryout pool got bigger." This is more a legibility/UX
problem than a missing mechanic, but worth a real look at whether the
indirect chain is even the right design (vs. a forward rink having a more
direct tryout effect of its own).
**Model: Sonnet** if the fix is UI legibility (tooltips/breakdown showing
where the tryout bonus comes from); **Opus** if the brainstorm concludes the
underlying mechanic itself should change.

---

## Pacing & world scale

### Smaller default map
Owner playtest note (2026-07-06): `WORLD_WIDTH`/`WORLD_HEIGHT` (120×75,
`engine/world.ts:20-21`) makes early game exploration slow — it takes too
long to stumble onto independents or rival scouts, which is where most of
the fun (first contact, tryouts, territory) actually starts. The generation
RULES are fine as-is (major-club count and independent density already
scale off `width * height` via `TILES_PER_MAJOR_CLUB`, so shrinking the
constants should shrink travel time between features while keeping the same
density) — this is a "just try smaller numbers and playtest" experiment, not
a redesign. Worth checking `settlementSeparation`/`chooseStart` still behave
sensibly at a smaller size (minimum spacing between HQs shouldn't collapse
to zero) before calling it done.
**Model: Sonnet** — parameter tuning + playtest, not new design. Try a couple
of sizes (e.g. 70×45, 50×32) and see which feels right before committing.

**✅ Implemented (experiment) 2026-07-06:** compacted to **72×45 (3240 tiles**,
36% of the old area). To keep the SAME 8 majors + 12 independents (rather than
letting the count drop with area), `TILES_PER_MAJOR_CLUB` was lowered 1125→400 —
so the placement is a uniform scale-down of the old map (identical relative
spacing, guaranteed to pack the same), just ~1.7× closer in absolute tiles.
Terrain was tuned alongside (owner request): fewer lakes (`LAKE_BASIN` 0.89→0.93),
fewer mountain ranges (`MOUNTAIN_RIDGE` 0.93→0.955, `MOUNTAIN_INLAND` 0.54→0.6),
more per-tile randomization (`BIOME_JITTER_T/M` 0.15/0.22→0.20/0.28), and
`SEA_LEVEL` 0.47→0.42 (+ smaller edge falloff) so the smaller sampling window
still yields a healthy ~58%-land single landmass instead of an archipelago.
Headless worldgen sim (8 majors + 12 indies place every seed; job tmp
`worldgen-sim.ts`). PLAYTEST NEXT: does 72×45 feel right, or try smaller still?

---

## Map life & encounters

### Wandering neutral units (recruit-or-scrap)  — ✅ SHIPPED 2026-07-06 (D53)
**Status: built and validated.** `engine/wandererSystem.ts` (roam/spawn/despawn,
scout-tell, recruit/scrap resolution, penalty box), `Wanderer` type + `world.wanderers`,
`WorldUnit.penaltyBoxTurns`, `WandererScene.tsx` encounter popup, nomad sprite in
`IsoWorldMap.tsx` + minimap dot + penalty-box card notice, `DEV_SPAWN_WANDERER`
dev button. **Rivals have full parity** — a rival scout that bumps a wanderer
engages on the *identical* odds (shared `tryoutSystem.buildWandererPlayer` + shared
constants; recruit grows the rival roster incl. rare good/legend, hostile boxes the
rival unit 1–2 turns via `RivalUnit.penaltyBoxTurns`); logs only for contacted rivals.
Validated headless: player path 1106 assertions; rival path 4,000 encounters
(recruit 0.342 vs 0.35 target, legend 0.039 vs 0.043, all hostiles boxed).
**Parked follow-on:** consolation "progress toward a fighting/toughness tech" for
losing a scrap (currently pays +2 HK + scout XP only — the tech doesn't exist yet).

**Follow-on — wanderer outcome needs an immediate payoff modal + map animation**
(owner, 2026-07-07): after the scout chooses to engage in `WandererScene`, the
resolution is anticlimactic — a recruit fires the `PlayerRevealScene` cinematic,
but a *scrap* (and a recruit that *passes*) only writes an Inbox/log line
(`resolveScrap` / the "They passed" branch in `wandererSystem.ts` call
`prependLog` and return), so the player gets **no immediate on-screen result** —
they have to open the Inbox to find out what happened. Wants an immediate
follow-up modal on resolve (win OR loss) — e.g. an `EncounterOverlay`-style
outcome sheet — paired with **a map animation** (a scrap/penalty-box beat, a
"they drifted off" beat). This is also the natural mount point for the
positive/negative **event SFX** (`eventGood`/`eventBad`, event-sfx-01/02 —
wired 2026-07-07): the goodie-hut `EncounterOverlay` and the recruit reveal got
them immediately, but the scrap/"passed" outcomes have no modal to hang the
sound on yet, so they currently cue off the resolution instead. Cross-refs:
`RESOLVE_WANDERER` (`gameReducer.ts`), the one-popup rule (encounter > rival >
independent), `pendingEncounter`/`EncounterOverlay` as the reusable shape.
**Model: Sonnet** — reuses the existing overlay + reveal patterns and a
map-marker animation; no new system, just a new outcome surface.

_Original brainstorm (kept for context):_
### Wandering neutral units (recruit-or-scrap)  — GREENLIT 2026-07-06
Owner idea (2026-07-06): Civ games have barbarians / neutral map units; we have
no on-map combat (our "combat" is the simulated hockey game), so instead add
**visible neutral "wanderers"** that roam the map in the early game. Any major
club can interact with one:
- **Recruit** — attempt to sign them to play hockey. A chance they join; a
  *remote* chance they're actually good; an *even more remote* chance they
  become a **club legend**.
- **Bad-guy wanderers** — some are hostile and introduce your pond scouts to the
  first-ever ice-hockey **fights / scraps**, which sends your scout to the
  **penalty box** (immobilized) for a turn or two.
The point: chance encounters with real risk/payoff that make the early game fun,
and give the otherwise-quiet map some life between settlements. Builds on the
existing goodie-hut `wanderer` encounter + the shared `PlayerRevealScene` (which
already fires for wanderer recruits) and `world.scouts` roaming-unit model, but
promotes wanderers to persistent, moving, interactable units. Vision details
(movement, blind-vs-tell risk, odds, penalty-box severity, rival AI in v1) being
confirmed with the owner before the build.
**Model: Opus** for the first pass (new roaming-unit system + encounter/penalty
mechanic + odds/balance); **Sonnet** for follow-on content/tuning.

## Units, scouts & personnel

### Back out the multi-level scout system
Owner call (2026-07-07, from the Helsinki Production screen): the scouting
lineup has sprawled into several overlapping "levels" that don't earn their
complexity, and the player can't tell them apart or why they'd want one over
another. Today there are effectively **three axes of scout variety stacked on
top of each other**:
1. **Multiple scout UNITS** — Pond Scout (`pond-scout`), Club Scout
   (`club-scout`, gated on `scouting-reports`, the only one that lays networks
   — D38), and Regional Scout (`regional-scout`, gated on `regional-scouting`,
   still a "Future unit" stub with no behavior) — plus recruiting/development
   HQ-staff units in the same list (Rink Evangelist, Local Coach, Recruiter).
2. **Quality TIERS at purchase** — Keen Volunteer / Traveled Scout / Ace Scout
   (`data/scouts.ts` `SCOUT_TIERS`, cost ×1 / ×1.75 / ×2.5, sets the judging
   roll band).
3. **Judging PROMOTIONS in the field** — `scoutStaff.applyScoutPromotions`
   (fieldwork XP bumps the weaker of Judging Potential / Judging Ability every
   5 XP).
Owner wants this **simplified back down** for now — the current implementation
"isn't useful and doesn't make a whole lot of sense" to a player. We may bring
back promotions and different unit levels later, but only once they're
legible and each tier has an obvious reason to exist. Undecided: how far to
collapse it — e.g. one scout unit + keep quality tiers, or one scout unit with
a single flat judging stat and no tiers/promotions at all. Cross-refs: D29/D31
(scout characters, tiers, XP), D38 (Club Scout instant networks), D32
(fog-of-talent reads scout judging — whatever survives must still feed
`talentFog.ts`). Watch the closed unions (`ScoutQualityTier`) and the
tier-gated `WATCH_SLOTS` when cutting.
**Model: Opus** — it's a subtractive design call that touches scout units,
purchase flow, `scoutStaff` promotions, fog-of-talent width, and several
closed unions at once; getting the collapse right (and reversible) is the
expensive part, not the deletion.

## Economy & funds

### Research economy model + tech pacing
Owner questions (2026-07-07), two linked design calls on how research should
feel:
1. **Purchase model — Polytopia vs. Civ VI.** Should a tech be bought like our
   current production builds (Polytopia-style, D30): pay the whole cost up
   front from the single Funds pool, unlock next turn? Or accrue as a
   per-turn value like Civ VI (science points chip away at a tech over several
   turns)? Related: Polytopia pulls **units AND research from the same
   currency pool**, while Civ VI separates **science (research) / gold
   (purchases) / production (build)** into three currencies. Today Ice Empires
   already half-commits to the Civ split — `hockeyKnowledge` funds research
   (science-per-turn) while `funds` buys units/facilities — so "go full
   Polytopia (one pool)" vs. "keep the HK/Funds split" is the real fork.
2. **Pacing — techs come too fast.** With the current (Civ-ish) approach the
   player rips through the 40-tech tree in very few turns compared to how long
   Civ makes you work for each tech. Regardless of which purchase model wins,
   the acquisition rate needs to slow down (higher tech costs, lower
   HK income, or a per-era gate) so the tree paces across an era instead of
   emptying early.
These interact: the pacing fix depends on which currency model is chosen, so
brainstorm them together. Cross-refs: D30 (pay-upfront economy), the
`ResourceSet` closed union (`funds`/`hockeyKnowledge`/`reputation`),
`selectors.getMonthlyIncome`, `data/research.ts` costs.
**Model: Opus** — currency-model + economy-balance judgment call with wide
blast radius (touches `ResourceSet`, income selectors, research costs, and how
production reads the pool); **Sonnet** to implement once the model + numbers
are picked.

### Fundraising & the youth academy (cash-positive district)  — PARKED
Owner idea (2026-07-06): players hit a wall where upkeep (field units + rink
maintenance) outpaces income and the treasury goes negative — see the club's
Treasury card (base +3, rinks +3, minus ~8 upkeep = underwater). Needs
player-driven ways to **generate more funds**:
- **Intrasquad fundraiser scrimmages / exhibitions for local fans** — put on a
  show to raise money (ties into the match engine).
- **Learn "fundraising"** as a researchable art.
- **Youth Academy** — a cash-positive on-map / district-like improvement a Rink
  Rat can build. Gated behind **local coach / volunteer coaching + Rules of the
  Game**; sited on (or adjacent to / within 2–3 tiles of) the club's Level-1 rink
  or HQ. First real "district" that earns recurring Funds, echoing the
  Districts/urban-footprint icebox idea below.
**Model: Opus** for the economy-balance design (upkeep vs. new faucets, what
gates what); **Sonnet** to implement once the numbers are picked.

## Act III — Competitive Hockey

### Season calendar & standings
Match Engine v0 (D51) is exhibition-only, no schedule, no season structure.
Needs a design pass: how many games/season, does it interact with the
tryout calendar (D37), what triggers a season, how do standings feed
anything (reputation? era progress?).
**Model: Opus** for the design (touches calendar, era wiring, rival AI);
**Sonnet** to implement against the spec.

### OT / shootout resolution
Ties currently stand (fine for a friendly). A real season likely wants a
decider. Small, self-contained extension of `matchEngine.ts`.
**Model: Sonnet.**

### Penalties off Discipline
`Discipline` is a hidden trait (D42) explicitly reserved for "close games and
penalties worth swinging" but nothing reads it yet. Needs a rules design
(what triggers a penalty, PK/PP effect, does it interact with team ratings).
**Model: Opus** for the design; **Sonnet** to implement.

### Fatigue off Durability
Same shape as Discipline/penalties — `Durability` is reserved but unused.
Needs a design for how fatigue accrues across a season and decays it back.
**Model: Opus** for the design; **Sonnet** to implement.

### Style matchups
`PlayerStyle` (Sniper/Playmaker/…) biases attribute generation (D43) but
doesn't yet affect match outcomes beyond the attributes it already biased.
Is there a real matchup layer here (style vs. style) or is biased generation
the whole payoff?
**Model: Opus/owner** to decide if this is even a distinct system; **Sonnet**
to implement if yes.

### Home ice advantage
Well-understood pattern (a ratings nudge for the home side). Low ambiguity.
**Model: Sonnet**, possibly **Haiku** once the multiplier is chosen.

### Opponent results rumors
Now unblocked by D51 (rivals have rosters and a sim to run for them offline).
Needs the Inbox to surface results the player didn't play in.
**Model: Sonnet.**

### Water traversal / embark
Halifax Harbor Ferry flavor unit. Nice-to-have, isolated, not an exit gate.
**Model: Haiku/Sonnet** — narrow blast radius either way.

---

## Act IV — Development & Organization

### Player development & aging
No aging system exists at all — `Player.age` is a field nothing increments
(confirmed via `docs/09_OPEN_QUESTIONS.md` Q34). This is the biggest gap
relative to how much of the scouting/ratings arc (docs/15 §8C) already
assumes development exists (`potential` vs. current OVR, self-fog). Needs a
dedicated design session: aging curves by position, development windows,
what a Development Coach actually modifies.
**Model: Opus** — this is architecture-sensitive (derived-vs-stored,
determinism) and touches ratings, scouting, and roster systems at once.

### Affiliate / minor-league pyramid
"Affiliate" today is just the top independent-relationship tier (D21) — no
development slots, call-ups, or assignment mechanics. Q35/Q36 in the open
questions doc are both unanswered. Cross-cuts independents, roster, and the
aging system above (probably should be designed together).
**Model: Opus.**

### Self-fog (own-roster potential reveal)
D43 flags this: the UI never shows your own players' true ceiling until
"scouting/development earns the read." No display mechanism exists yet — a
subtle information-design problem (how does trust get earned, does it decay).
**Model: Opus** for the design; **Sonnet** to implement once spec'd.

### Development Coach staff role
Named in docs/15 §8C as the thing that modifies development once it exists.
Follows the existing staff/scout-character pattern once development itself
is designed.
**Model: Sonnet** (rides an established shape) — but blocked on the aging
system above being designed first.

---

## Screens & UX polish

### Player-file access points
The EHM-style player file only opens from the Scouting board today. Needs
entry points from ClubHQ Team rows, the reveal cinematic ("view full
profile"), and tryout candidate cards (which need a candidate-mode variant
since candidates aren't roster/prospects).
**Model: Sonnet** — pattern already exists, just more entry points.

### Tryout music cross-fade regression — ✅ FIXED 2026-07-07
Playtest note (2026-07-05): tryout scene audio stopped cross-fading like it
did the day before. **Two distinct bugs, both fixed 2026-07-07:**
1. *Tryout bed opened in silence.* `startTryoutMusic` gated the crossfade on
   `tryout.paused ? play() : Promise.resolve()`. Because `primeTryoutAudioElement`
   already made the element non-paused, the fade attached to `Promise.resolve()`
   instead of a real `play()`; if that primed play was still buffering or later
   rejected, we ramped the volume of an element that never actually started →
   silence. Fix: always drive the fade off a real `play()` resolution (no-op when
   already playing). Also dropped prime's `load()` re-fetch, which stalled the
   first play.
2. *Scene ambience never stopped.* `PlayerRevealScene` played `playSfx("crowd")`,
   and `crowd` was mapped to the full-length practice tracks — but `playSfx` is
   fire-and-forget with **no stop handle**, so the practice/hockey ambience kept
   playing after the reveal scene closed. Fix: put the reveal scene on the same
   `setContactMusicActive(true/false)` controller the meeting scenes use, so it
   fades IN on mount and fades OUT + stops on unmount. Removed the dead `crowd`
   SFX entry so nobody reintroduces the same trap.

### SFX + notification/dock icon curation
Current picks are placeholders (`public/assets/vendor/README.md`, `FILES` map
in `engine/sfx.ts`, `NOTIF_ICONS` in Dashboard). No logic changes, just asset
swaps.
**Model: Haiku.**

### Replace hand-drawn ItemArt with the game-icons set
CC-BY attribution already planned for the credits screen; keep bespoke art
for hero pieces only.
**Model: Haiku.**

### Indies "Send Introduction" / influence economy refinement
Playtest note (2026-07-05): the introduction verb and influence economy at
each independent need a real pass — per-org flavor, costs, what influence
actually buys at each tier. This is a balance/economy judgment call, not a
mechanical change.
**Model: Opus** for the design; **Sonnet** to implement.

---

## Map meaningfulness (icebox — needs a brainstorm before any building)

### Roads / trade routes
Proposed: establishing a scouting network lays a visible route to the
independent that speeds unit travel along it (Civ-style roads), making the
network a physical map investment. Touches movement, territory, and
rendering at once — genuinely undesigned.
**Model: Opus** for the design; likely **Opus** for the build too given the
cross-system surface (movement + territory + IsoWorldMap).

### Districts / urban footprint
Proposed: buildable tiles near HQ (Team Shop for recurring funds, Marketing
space for reputation/influence/tryout draw) that give territory something to
*do* beyond income + claims. Likely wants its own doc once it firms up (per
the original icebox note).
**Model: Opus** for the design.

---

## Foundational / undecided (from docs/09_OPEN_QUESTIONS.md)

### Victory conditions & endgame
No victory condition exists at all (Q19). Eras are the only progress spine
and they're endless by design (D5, Q20). Worth deciding whether this stays
endless-only (Civ-style "keep playing") or gets a defined win state —
this answer likely reshapes how Act IV/V get scoped.
**Model: Opus** — foundational, wide blast radius on everything downstream.

### League formation
Q15, unanswered. Likely entangled with the Act III season/standings work
above — probably the same brainstorm.
**Model: Opus.**

### Rival alliances / diplomacy depth
Only `rival.attitude` (friendly/wary, D20) exists today, and it currently has
no mechanical teeth — Q18 asks whether alliances (scouting treaty, trade
route, shared tournament, prospect loan/affiliate) are worth building. Owner
framing (2026-07-06): attitude should matter through **what deals a rival is
willing to offer or accept** — friendly clubs open better/more trades,
wary ones close off or sour terms. `RivalMeetingScreen.tsx` already has dead
placeholder buttons for this ("Let's make a deal" → Make a trade / Share
intel / Trade tech, lines ~161–206) with no logic behind them yet — this is
the natural home for the mechanic once it's designed.
**Model: Opus** for the design (what a trade actually is, how attitude gates
it); **Sonnet** to implement against the shipped placeholder UI.

### Rival GM tone/voice pass
Q16 — no comedy-register decision has been made; current copy is dry and
functional. Lower systemic risk than the others in this section (it's a
writing pass, not an architecture decision).
**Model: Sonnet.**

### Cards — build or cut
Parked since D29: no clear identity (coaches-on-cards feel odd, nothing puts
them on the map). Needs an owner decision — revisit as a Civ-VI "great
people" special unit, or remove the feature and its dead code entirely.
**Model: Opus** for the decision itself; **Sonnet** to execute either
direction.

---

## Template for new entries

```
### <short name>
<what it is, why it's not done, what's genuinely undecided about it, and
any doc/decision cross-references.>
**Model: <tier>** <one-clause reason, and a second tier if the brainstorm
and the build warrant different ones>.
```

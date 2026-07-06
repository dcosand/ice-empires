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

1. Wire Club Formation era exit requirements — blocks Act III entirely.
2. Victory conditions & endgame — foundational, everything else assumes an
   answer eventually.
3. Rival AI parity (research/tryouts/scouting) — the AI is visibly behind
   the player's capability curve.
4. Player development & aging — biggest missing system relative to how much
   of the roster/scouting arc already assumes it exists.
5. Season calendar & standings — unblocks the rest of Act III.

---

## Blocking / near-term

### Wire `club-formation` era exit requirements
`ERA_REQUIREMENTS[club-formation]` is an empty list (`src/data/eras.ts:62`) —
clubs can never advance past Club Formation no matter what they build.
Proposed ids already named in TASKS.md: `scouting-network`,
`territory-projected`, `club-identity`, `training-camp`. Needs a brainstorm
only to pin down thresholds (how much territory? one network or several?);
the wiring itself is mechanical.
**Model: Sonnet** for wiring once thresholds are picked; a short Opus/owner
conversation first to pick the thresholds.

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

### Tryout music cross-fade regression
Playtest note (2026-07-05): tryout scene audio stopped cross-fading like it
did the day before. Check `BackgroundMusic.tsx` scene-transition handling.
**Model: Haiku** — isolated bug fix.

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
Only `rival.attitude` (friendly/wary, D20) exists today. Q18 asks whether
alliances (scouting treaty, trade route, shared tournament, prospect
loan/affiliate) are worth building.
**Model: Opus** for the design; **Sonnet** to implement.

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

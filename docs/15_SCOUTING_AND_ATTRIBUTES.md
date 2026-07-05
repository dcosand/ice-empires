# Ice Empires — Scouting, Player & Team Attributes

**Date:** 2026-07-05
**Status:** Design — not yet coded. This is the ratings/scouting doc that
`docs/14_ACT2_CLUB_FORMATION.md` §8 reserved (it called for
`docs/15_PLAYER_AND_TEAM_RATINGS.md`); it supersedes the deferred "player & team
ratings" placeholder in `docs/13_ERA_ARC.md` §4 and fulfils Act II §8. Read
alongside Act II §5–§9 — this doc details the *ratings + scouting* half; Act II
owns territory, borders, the seasonal calendar, and the Scouting screen / Inbox
those reports flow into. **See §9 for how the two docs reconcile.**
**Purpose:** Define the player/goalie attribute model, the scouting experience that
is the fun spine of the game, and how attributes will eventually drive competitive
matches. This is the ratings foundation the Act III match engine reads from.

---

## 0. The one-paragraph thesis

Scouting is the fun spine of Ice Empires. We borrow **EHM's scouting feel** (prose
reports, inexact reads, repeat viewings, hidden gems, potential vaguer than current
ability) and dress it in an **EA-NHL-familiar 1–100 skin** (grouped attributes, a
single OVR, a Player Style). Attributes, development, aging, and signing all exist
to make one thing tense and rewarding: **the lifecycle of a player from unknown
prospect to franchise star to aged-out legend.** The target is deep enough for a
hockey-GM brain, shallow enough that nobody needs a spreadsheet.

---

## 1. Where we are today (baseline)

- `Player.attrs` = **5 attributes** (`skating, shooting, passing, checking,
  goaltending`) on a **1–20** scale (`src/types/game.ts`). Pond-era locals roll 1–6.
- Positions are only **F / D / G**; goalies are a single `goaltending` number, and
  skaters carry a dead `goaltending: 1`.
- **No player development or aging** — attributes are rolled once and never change.
- **No match engine** — deliberately deferred to Act III, gated on this doc's work.
- The two talent tracks **don't connect**: **prospects** live in independents'
  pipelines as fogged "???" slots (`OrgProspect`, revealed by a scout network) and
  are a dead-end ledger; the **roster** comes only from random **Hold Tryouts**.
- The **fog engine already exists and is good**: `src/engine/talentFog.ts` (honest
  ranges — truth always inside — but the center is seeded off-true), and per-scout
  judging attributes (`ScoutCharacter.judgingAbility / judgingPotential`).

The scouting *plumbing* is built. This doc turns it into the game's centerpiece.

---

## 2. Reference systems (what we borrow, what we drop)

| Source | Borrow | Drop |
|---|---|---|
| **EHM** (~27 skater / 24 goalie attrs, 1–20; CA/PA 1–200) | Prose scout reports, star ratings, **potential vaguer than current ability**, repeat-scouting sharpening, role-weighted generation, assignment-produces-reports cadence | The 1–200 second scale; hidden personality attrs (Adaptability, Ambition, Loyalty, Pressure, Professionalism, Sportsmanship, Temperament); the sheer attribute count |
| **EA NHL** (1–100, six category groups, OVR, Player Style) | **1–100 scale**, category grouping, a single **OVR**, **Player Style** labels, goalies show only goalie stats | Splitting shots into slap/wrist × power/accuracy; splitting skating into accel/speed/agility/balance |
| **archibalduk/hockey_match_engine** (event-based, deterministic single-RNG, per-situation resolvers) | The match-resolution architecture (matches our D3 determinism rule); **CA/PA role-weighting** math for OVR + generation | (reference only) |

**Never add:** Form / Morale / Contract depth (manager-sim, orthogonal to the 4X
era arc). One honest **1–100** scale everywhere.

---

## 3. The attribute model

**Scale:** 1–100. Elite ≈ 90–99, average ≈ 75, pond-era locals ≈ 20–45.

### Skater attributes — 10, grouped EA-style

| Group | Attribute | Rolls up (EHM/EA equivalents) |
|---|---|---|
| Offense | **Shooting** | slap + wrist accuracy & power, deflections |
| Offense | **Passing** | passing, vision / creativity |
| Offense | **Puck Control** | deking, stickhandling, puck protection |
| Defense | **Checking** | pokecheck, defensive positioning, stick work |
| Defense | **Physicality** | hitting, strength, board play |
| Skating | **Speed** | acceleration + top speed |
| Skating | **Agility** | agility, balance, edges |
| Sense | **Hockey IQ** | anticipation, off-puck movement, both-zone awareness |
| Sense | **Faceoffs** | faceoffs (matters mostly for Centers) |
| Mental | **Compete** | work rate, determination, consistency |

### Goalie attributes — 6 (its own dedicated set)

**Reflexes** · **Positioning** · **Glove/Hands** (glove + blocker) · **Rebound
Control** · **Athleticism** (recovery + lateral/agility) · **Composure** (goalie
"compete" / clutch).

Goalie scouting becomes its own mini-game rather than reading one number.

### Hidden traits (off the card; feed prose + the future sim)

**Durability** (injury proneness + stamina across a season) · **Discipline**
(penalty tendency → feeds power plays in the match sketch). Keeping these two off
the visible card is how we stay "moderate, not a spreadsheet."

### OVR, Potential, Style, Position

- **OVR** — a position/role-weighted 1–100 roll-up of the visible attributes
  (offense-weighted for forwards, defense/skating for D). One familiar headline
  number, plus a **0.5–5 star** tier for at-a-glance reads.
- **Potential** — promoted from prospects-only to a **first-class ceiling OVR on
  every `Player`** (enables development & aging with no later data-model change).
- **Player Style** — a closed union assigned at generation that **biases attribute
  distribution** (role-weighting, per archibalduk's CA/PA model) and later feeds
  match matchups:
  - Forwards: `Sniper` · `Playmaker` · `Two-Way` · `Power Forward` · `Grinder`
  - Defense: `Offensive D` · `Two-Way D` · `Defensive D` · `Enforcer`
  - Goalies: `Butterfly` · `Hybrid` · `Standup`
- **Positions** expand `PlayerPosition = "F" | "D" | "G"` → **`"C" | "W" | "D" |
  "G"`** (Center / Wing / Defense / Goalie). The Center split makes Faceoffs and
  line construction meaningful without L/R handedness micromanagement.

---

## 4. The scouting arc — one player's lifecycle (the spine)

This is the emotional throughline every mechanic serves.

1. **Unknown.** A prospect exists in an independent's pipeline as a fogged "???" —
   only position + a teaser. You don't know he's there until a **basic scout**
   explores out and makes **first contact** with the org.
2. **Under watch.** You **assign a scout** to that org (Civ VI "spy" style, for a
   duration you choose). After a few turns a **club report** arrives; you point the
   scout at **specific players** to generate **player reports** — but attention is
   finite, so you must pick who to watch.
3. **Evaluated.** Early reports are **wide ranges + vague prose** ("raw, but the
   frame is there…"). **Repeat viewings / longer missions / better scouts** narrow
   the range and firm the **potential** read — but never to certainty; fog persists.
4. **Coveted.** A rival's scouts are on him too. His **development** may be trending
   up (your fresh reports catch it). The window to act is closing.
5. **Signed — or lost.** You commit to a **contested signing race**: your scouting
   depth + org relationship + funds + map proximity vs the rivals bidding. Win and
   he joins your roster; dawdle and he's gone.
6. **Developed.** As a homegrown/signed young player he **grows toward his (fogged)
   potential** in your rink/academy system; your own read on him sharpens from
   "rough" to precise as he plays.
7. **Peak & decline.** He primes, stars for you, then **ages out** — forcing you
   back to step 1 for the next generation. The empire must keep scouting.

### The progression fantasy (what the arc feels like across eras)

- **Pond era:** learn to evaluate **your own talent first** — the tutorial for
  reading anyone else.
- **Then:** unearth **hidden gems** in backwater orgs.
- **Then:** **out-scout rivals** for contested talent.
- **Endgame:** run a **scouting empire** with coverage across the whole map.

---

## 5. Scout units & the assignment ("spy") system

### Scout taxonomy (era-gated; builds on Act II's two-tier split)

Act II (`docs/14` §5) already defines the base split — **keep those names**, layer
specialization on later:

- **Scout** (Act I/II, existing) — explore, reveal indies, first contact, build
  connections. Cheap, generalist, crosses all borders. Today's scout.
- **Club Scout** (Act II, `docs/14` §5) — the network-builder: establishes a
  scouting network on arrival at a contacted org, revealing its prospect slots and
  unlocking recruiting. This is the unit that runs the mission model below.
- **Amateur scout / Professional scout** *(Act IV elaboration — Hockey Operations)*
  — a later specialization of the Club Scout, **not a rename of it**: amateur scouts
  specialize in **young prospects** at indies/junior orgs (high potential, high
  fog); professional scouts read **established players on rival rosters** (lower
  fog, for signing/poaching). Deferred to Act IV per the era arc; Act II keeps the
  clean two-tier split and "saves the specialized-scout budget for later eras."
- Tiers within any type reuse the existing **Volunteer / Traveled / Ace** quality
  ladder (`src/data/scouts.ts`). **Better scouts cost more and/or take longer to
  produce** — the quality-vs-tempo tension.

### The mission mechanic (Civ VI spy analog)

This **extends Act II's assignment model** (`docs/14` §5.1: "an assigned scout
produces ongoing reports whose detail and confidence increase over time"). Act II
makes network-*establishment* immediate on arrival; the mission is the ongoing
*observation* that deepens after that:

- Sketch shape: `ScoutMission { unitId, targetId, startMonth, duration, watchedPlayerIds[] }`.
- Each mission tick accrues **club-report depth** (org intel: how big the pipeline
  is, its tone, which prospects exist) and, for each watched player, **player-report
  depth**.
- **Duration + repeat missions** raise club depth; **repeat viewings** raise
  per-player depth. Finite watch slots per scout = the **"you can't watch everyone"**
  tension.
- **Confidence is not a stored badge — it is the width of the estimate range**, per
  Act II §6. Depth narrows `attrEstimates` / `potentialEstimate` toward (never onto)
  the truth; reports go stale if the scout leaves. Any internal depth counter drives
  that width and is never rendered as a number.
- **Distance is a real cost:** travel time to reach a target scales with map
  distance, and reaching far targets is gated by **traversal tech** (water tiles →
  air travel; Act II §10 keeps this a Club-Formation capability, scheduled after
  territory/scouting land). Nearby talent is cheap to watch; distant talent is an
  investment.

### Report delivery

Reports surface through Act II's existing surfaces, not a new system: a **headline
entry in the Inbox** (`docs/14` §9, the promoted Log — "Scout Petrov filed a report
on Frostbite U") and **full prose + stars + narrowed ranges on the org/player card
and the Scouting screen** (`docs/14` §7). Nudge, then drill-down.

---

## 6. Fog, development & aging

### Self-fog (your own roster)

Your own players show **rough estimates immediately**, with a narrow-but-nonzero
fog that **tightens with games played / your own evaluation**. Learning to read
your own guys is the early-game teacher for reading outsiders. *(This reverses
today's invariant that the own roster is fully known — the boldest single change,
and it touches every roster UI surface.)*

> **⚠ Revises Act II §6.** Act II specifies the own roster is *near-exact* ("you
> watched them play"). This doc intentionally changes that to **rough-then-precise**
> per the design interview — the early game should make you *earn* an accurate read
> of your own talent. Update `docs/14` §6 (and `docs/10_DECISIONS.md`) to match when
> this lands.

### Development

*(Development & aging are **Act IV** mechanics per the era arc — "Hockey
Operations: scouting, recruiting, development." They are specced here because they
close the scouting loop, but the attribute model in §3, including a first-class
`potential` on every `Player`, is the **Act II foundation** that makes them
possible without a later data-model change.)*

Young players carry a **fogged potential** and **grow toward it** monthly; rink /
academy facilities + coaching **accelerate** growth. An age-keyed growth curve
governs the rise.

### Aging: peak then decline

Players rise toward potential, **peak in their prime, then fade and retire**. This
drives real roster churn and keeps the scouting loop perpetually necessary — you
scout not to complete a checklist, but to replace stars before they're gone.

### Acquiring a prospect: the contested signing race

`SIGN_PROSPECT` resolves a **seeded contested roll** — your (scouting depth + org
relationship + funds offered + map proximity) vs each interested rival's bid. Win →
the prospect converts to a `Player` on your roster; lose → he signs elsewhere and
leaves the pool.

### Tryouts, reframed

Tryouts are no longer random walk-ons. They become:
- **Homegrown youth** produced by your own rinks (raw, develop over time), and
- **Castoffs** — overlooked / aging players cut from indies & rivals who show up
  for a roster shot (cheap, known-ish, no signing race).

Prospects (scouted → signed) are the **main, high-quality pipeline**; tryouts are
the homegrown + bargain-bin complement.

---

## 7. How attributes drive competitive matches (Act III sketch)

*Not built now — this is the spec the match engine will read.* Modeled on
archibalduk's event-based, deterministic, single-RNG resolver approach, but coarser
to fit a 4X.

**Team ratings** are computed on the fly from the deployed lines (like income /
territory, never stored):

- **Attack** — Shooting + Passing + Puck Control of your top forwards
- **Defense** — Checking + Hockey IQ of D + forwards
- **Transition** — Speed + Agility across the roster
- **Physical / Discipline** — Physicality vs Discipline (hits, forced turnovers,
  penalties)
- **Goaltending** — the goalie's 6-attribute roll-up

**Match resolution** is a seeded per-period contest mapping each group to a phase
of play: Transition → zone entries & odd-man rushes; Puck Control / Passing →
sustained pressure (chance quality); Shooting vs Goaltending → chances become goals;
Checking / Hockey IQ → chance suppression & takeaways; Physical vs Discipline →
late-game wear (stamina / Durability) + power plays; Compete / Composure →
close-game & playoff swing.

**Player Styles** add rock-paper-scissors matchup flavor (an Enforcer/Grinder line
blunts a skill line; a Speed team punishes a slow D pairing; a Sniper needs a
Playmaker to feed him).

**The hook that gives matches stakes:** you deploy lines based on your *scouted*
read, so a fog-misjudged player over- or under-performs versus expectation — the
scouting spine directly decides games.

---

## 8. Build order (for the implementation session)

A multi-part effort; suggested sequencing, foundation first.

- **A — Attribute model & ratings.** `src/types/game.ts` (new `PlayerAttrs` 10 +
  `GoalieAttrs` 6, `PlayerPosition` C/W/D/G, `potential`/`overall`/`style`,
  `PlayerStyle` union — closed-union edits are compiler-guided sweeps, see
  `CLAUDE.md` gotchas); new `src/data/attributes.ts` (defs, groups, labels, OVR
  weights, Style→generation weights); new `src/engine/ratings.ts` (`computeOverall`,
  `starTier`, `teamRatings`); `src/engine/tryoutSystem.ts` regen on 1–100;
  `src/components/HockeyCard.tsx` + tryout/roster screens for grouped 1–100 bars,
  OVR + stars + Style, goalie vs skater block.
- **B — Scouting arc.** New `src/engine/scoutReport.ts` (deterministic prose from
  attribute bands + Style + judging); extend `src/engine/talentFog.ts` to 1–100 +
  **confidence-narrowing**; `ScoutMission` state + actions (`ASSIGN_SCOUT_MISSION`,
  `WATCH_PLAYER`, `RECALL_SCOUT`) with report-depth accrual in `endMonth`'s scouting
  step (`src/engine/scoutSystem.ts`, extend `revealOrgProspects`); scout taxonomy in
  `src/data/scouts.ts`; `SIGN_PROSPECT` contested-race resolver + prospect→`Player`
  conversion; report notification + card detail in `IndependentsScreen.tsx`.
- **C — Development, aging, self-fog.** Monthly growth toward potential
  (facility/coaching-scaled); age curve (rise → prime → fade → retire); self-fog on
  own roster that tightens with games; tryouts reframed (homegrown + castoffs).
- **D — Traversal & match sketch.** Water/air traversal tech + `moveableTilesFor`
  reach; fold the §7 sketch into `docs/13_ERA_ARC.md` when the match engine lands.

**Also update:** `docs/13_ERA_ARC.md` (ratings/scouting sections) and append
numbered entries to `docs/10_DECISIONS.md` (1–100 scale; 10+6 attribute model;
C/W/D/G positions; scouting-as-spine; Civ-VI assignment model; development & aging
as core; contested signing).

---

## 9. Relationship to Act II (`docs/14`)

This doc is the **§8 ratings deliverable** Act II reserved. They interlock; neither
should be read alone.

**Alignment (this doc details what Act II asked for):**

| Act II calls for | This doc provides |
|---|---|
| §8 "expand beyond 5 attrs, positional relevance, current vs potential" | §3: 10 skater + 6 goalie attrs on 1–100, C/W/D/G, first-class `potential` |
| §8 "derived overall & role fit" | §3: OVR + star tier, position/role weighting |
| §8 "team-level aggregate ratings a match engine reads" | §7: Attack/Defense/Transition/Physical-Discipline/Goaltending sketch |
| §6 "confidence = width of the estimate range" | §5–§6: depth narrows range width; no separate badge |
| §5.1 "assigned scout produces ongoing reports that deepen over time" | §5: the mission model (duration + repeat viewings) |
| §7 Scouting screen · §9 Inbox | §5 report delivery routes through both |
| §5 Scout / Club Scout two-tier split | §5: kept as-is; amateur/pro deferred to Act IV |

**Deviations (deliberate — reconcile the older doc when this lands):**

1. **Own-roster fog.** Act II §6 says own roster is *near-exact*; this doc changes
   it to **rough-then-precise self-fog** (design interview). Update §6.
2. **Development & aging.** Act II holds these out; this doc specs them as **Act IV**
   mechanics but requires the `potential`/attribute foundation built in Act II.
3. **Contested signing.** This doc's `SIGN_PROSPECT` race is the concrete form of
   Act II §5's unspecified "recruiting actions."

**No conflicts** on: match engine deferral to Act III, territory/borders, the
seasonal tryout calendar, water traversal scheduling — those remain Act II's.

---

## 10. Open questions (for the build session)

- **Self-fog scope:** exactly how rough is the initial own-roster read, and does it
  tighten purely from games played, or also from spending a scout on your own guys?
- **Aging pace vs era length:** eras can be long — does a player live across
  multiple eras, and how fast is the decline so churn feels real but not punishing?
- **Signing-race inputs & weighting:** the relative weight of scouting depth vs org
  relationship vs funds vs proximity in the `SIGN_PROSPECT` roll.
- **Watch-slot economy:** how many players a single scout can watch at once (the
  hard cap that makes "can't watch everyone" bite).
- **Amateur vs pro fog gap:** how much lower the base fog is on established rival
  players (pro scouts) vs raw prospects (amateur scouts).

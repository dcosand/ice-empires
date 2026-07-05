# Ice Empires — Act II: Club Formation Era (system design)

**Date:** 2026-07-05
**Status:** Designed, not yet coded. Supersedes the prose in `docs/13_ERA_ARC.md §4`.
**Core question:** *Can we become a real club?*

Act II is the turn from "a founder with a vision" into "an organization with
territory, a scouting apparatus, a calendar, and neighbors who notice where you
build." The **match engine moves to Act III** — we do not yet know enough about
player/team attributes to make competition feel good (see §8). Act II earns the
right to compete by building the evaluation and territory systems that a match
engine will later read from.

---

## 1. Exit criteria (proposed — confirm before wiring `ERA_REQUIREMENTS`)

`data/eras.ts` currently has `club-formation: []` (never advances). Proposed
checklist, all tied to systems built in this act:

1. **`scouting-network`** — Establish a scouting network with ≥1 independent
   (Scout Emissary completes the 2-month action → that org's prospects revealed).
2. **`territory-projected`** — Project visible borders: HQ + ≥3 rinks generating
   a contiguous claimed area (exact rink count TBD in balancing).
3. **`club-identity`** — Research **Club Identity** (tech #9).
4. **`training-camp`** — Complete at least one full seasonal tryout cycle
   (a training-camp window, §4) — proves the calendar/recruiting loop, not just
   a one-off tryout.

Deliberately **not** an exit gate: winning (or playing) a competitive game.
That's the Act III entry criterion once §8 lands.

---

## 2. Territory & borders

Today a rink does exactly three things: grants radius-1 *live* vision
(`RINK_SIGHT`, a trip-wire — see §2.5), pays +1 Funds/mo **only within Chebyshev
3 of HQ**, and satisfies the Act-I "≥1 rink" check. A rink built far from home is
strictly worse than one built at home — backwards for a 4X whose doctrine is
"expansion = building rinks, not settling cities." Act II fixes that by making
**every** rink project territory, and by making territory *do things*.

### 2.1 Ownership model

Tile ownership is computed (not stored per-tile — derive each render/turn from
sources, like income):

- **Sources**: HQ, every player rink (any level ≥ 0? — use ≥ 1; a cleared pond
  is not yet a claim), and every **Affiliate** independent (tier 3).
- **Projection**: each source claims tiles within a radius (HQ largest, rinks
  smaller, Affiliates medium). Ties broken by nearest source; unclaimed stays
  neutral. Rival territory computed the same way from their HQ + rinks, and is
  only *shown* once that rival is contacted.
- **Geometry**: the map is an iso diamond grid. Borders extend outward in the
  four diamond directions from each source (see §2.4 render).

### 2.2 Two-radius rink model (keep income local, let claims travel)

Split the single `CLUB_RINK_RADIUS = 3` into two independent radii:

- **Home economy radius** (unchanged, = 3): income (+1 Funds/mo), the rinks/2
  upkeep tax (D25), and the Hold-Tryouts gate all still require a rink *near
  HQ*. This stops a player from snowballing income by spamming rinks across the
  map.
- **Territory projection radius** (new, applies to every rink regardless of
  distance): feeds §2.1 ownership. A rink 20 tiles out plants a flag — it claims
  land, it does not pay rent.

### 2.3 What territory DOES (the payoff — territory must never be mere decoration)

1. **Recruiting pool (headline effect).** Bigger territory ⇒ bigger population
   ⇒ more and better tryout turnout. Concretely, in `holdTryouts`
   (`tryoutSystem.ts`):
   - **Volume**: candidate `count` gains `+1 per N owned tiles` (N ≈ 6–8),
     stacking with existing unique bonuses (Warming-House Crew, Rink Evangelist).
   - **Quality**: the attribute floor/span (`POND_ATTR_MIN`/`POND_ATTR_SPAN`)
     steps up at territory breakpoints (e.g. every ~10 owned tiles nudges the
     floor +1), the same lever the Rink Evangelist already pulls.
   This gives forward rinks *and* Affiliate independents a second reason to
   exist, and makes borders something the player feels every tryout.
2. **Independent contention (Anchor race).** A player rink (or Scout Emissary,
   §5) inside an independent's zone counts toward influence / Anchor Club
   contention against rivals — landing a claim near an indie before a rival is a
   real land-grab.
3. **Rival grievance.** Building inside or hard against a contacted rival's
   projected territory nudges `rival.attitude` toward wary and drops a log/inbox
   line ("Detroit Forge resents the rink you raised on their ice"). Attitude
   already exists (D20); this gives it teeth.
4. **Movement & build gating** (§3): territory is enforced, not advisory.

### 2.4 Rendering (Civ VI style, club colors)

Colored border ribbons matching the club's palette (`club.accent` /
secondary), drawn on the **boundary ring** of owned tiles — a bright inner
stroke + darker outer edge in the four diamond directions, extending outward
from HQ and each rink (reference: Civ VI territory borders). Rival borders use
their club colors and appear only once contacted. Implementation lives in
`IsoWorldMap.tsx` (respect the fog tiers; borders draw on explored tiles). A
low-alpha tile-top tint is optional; the crisp edge stroke is the priority.

### 2.5 Rink vision — keep it, but understand it

`revealed` (terrain) is already permanent-once-seen for every unit (D27), so a
rink is **not** an exploration tool. `RINK_SIGHT = 1` feeds `visibleTiles()` —
the *live* set that gates rival unit positions and the "out of sight" note. A
forward rink is therefore a permanent **early-warning trip-wire** on contested
ground: it tells you when a rival unit walks past it this month. That job gets
*more* valuable once borders and roster snapshots exist. Keep `RINK_SIGHT`.

---

## 3. Boundary enforcement

Two rules, both cheap (rival objects already carry `hqTile`).

### 3.1 Minimum build distance

Reject rink builds / snow-clearing on tiles within **N tiles of any known rival
HQ**, and (once §2 lands) on any tile **inside a rival's projected territory**.
Placement-time check in `builderSystem` — same shape as Civ's "too close to
settle." Open question: flat N (2–3) for all rivals, or scale N with the
rival's era (more territorial once past Pond Hockey)? Default to flat 3 unless
balancing says otherwise.

### 3.2 Movement tiers by unit kind

Once territory tiles exist, entry is gated by unit kind:

- **Basic Scouts** (and the future Scout Emissary): cross **all** borders freely
  from game start. Recon and diplomacy travel; that is their job.
- **Rink Rats / builders** (and unique builder variants — Asphalt Crew, Barn
  Raisers, Foundry Crew): **cannot enter a rival's territory.** Work crews stay
  home.

This creates the "reach the independent behind Detroit" puzzle: route a scout
through, but a builder must go around or wait. **No open-borders mechanic for
now** — scouts already pass, so there is nothing to negotiate yet; revisit if we
later want builders to cross with permission (a Diplomacy-branch payoff).

---

## 4. Seasonal tryouts & training camp (make the calendar matter)

Tryouts today cost 3 Funds and can run any month — the month/year is flavor.
Change: tryouts are **windowed**, twice per year, for player *and* AI major
clubs:

- **Spring tryouts** (≈ May) and **Training Camp / open tryouts** (≈ Aug–Sep),
  mirroring the real hockey calendar. Outside the windows, Hold Tryouts is
  disabled with copy naming the next window ("Next tryouts open in May").
- Still costs Funds; the window is an *additional* gate, not a replacement.
- Pool volume & quality scale with territory (§2.3).
- This is the seam where Ice Empires starts to feel like Eastside Hockey
  Manager: scouting, evaluation, and camps become scheduled, anticipated events
  rather than an any-time button. A completed camp cycle is an Act-II exit gate
  (§1).

AI clubs recruiting on the same calendar also makes rival roster snapshots (§6)
change meaningfully across the year.

---

## 5. Scout tiers & scouting networks

Today there is **one** scout tier — the generic `Scout` does everything (move,
reveal, survey, passive first-contact). No club has a unique *map* scout unit
(the non-builder uniques are stationary personnel). Two-tier split:

- **Scout** (existing, unchanged verbs): explore, survey regions, passive
  first-contact snapshot (§6). Cheap, early, generalist. Crosses all borders.
- **Scout Emissary** (new, gated by a Club-Formation-era tech — reuse
  **Scouting Reports** #15, or add a new Scouting & Reach tech): the only unit
  that can run **Establish Scouting Network** — a 2-month action while parked
  adjacent to an independent → reveals that org's real prospect slots
  (`prospects[].revealed = true`, real names/attrs), unlocks recruiting actions,
  and accelerates influence. Rivals can do the same: this is where **Anchor
  Club** competition (the suzerain analog) begins.

Rather than per-club unique scouts, keep the split clean and save the uniques
budget for later eras.

### 5.1 Assignment model

A scout (basic or Emissary) can be **assigned** to an independent or a contacted
major club. An assigned scout produces ongoing reports whose **detail and
confidence increase over time** (§6). This is the data source for the scouting
screen (§7) and the on-tile/cinematic roster views (§6).

---

## 6. Player evaluation & scouting confidence

The FHM/EHM "squad voyeurism earned through map play" loop:

- **First contact** with an independent or major club grants an immediate
  **low-confidence full-roster read** — you see the whole player list, but with
  wide uncertainty (ranges/blurred ratings, not exact numbers).
- That list is viewable on the entity's surface: the **major club full-screen
  cinematic** (click the club tile *or* their leader-image overlay) and the
  **independent tile / ledger**.
- Assigning a scout (§5.1) — especially a Scout Emissary that has established a
  network — **tightens confidence and reveals more attributes** the longer they
  observe. Reports go stale if the scout leaves.

This requires a real ratings system with confidence, which we do not have yet
(§8). Build §8 first, or in lockstep.

---

## 7. The Scouting screen

> **Repo note (2026-07-05):** no scouting-screen or inbox component exists in
> `main`/this branch yet (only `EventLog.tsx`). The user recalls one landing in
> `main`; it is not in the tree. Tasks are written as "extend if present,
> otherwise build."

A full-screen scouting hub:

- **Two organizing views, toggleable**:
  - **By scout** — each of your scouts (basic + Emissary + assigned) with their
    current assignment, location, and latest report.
  - **By subject** — each team / independent / major club with the accumulated
    reports and current confidence on their players.
- **Full tables**: sortable, filterable, searchable columns (name, position,
  age, each attribute, overall, confidence). This is the EHM data surface.
- Confidence is shown per row (exact vs range vs unknown).
- Depends on the ratings system (§8) for meaningful columns.

---

## 8. Player & team ratings system  ⭐ prerequisite for Act III competition

Current model is too thin to simulate hockey: `PlayerAttrs` = 5 numbers
(skating, shooting, passing, checking, goaltending) on a 20 scale
(`types/game.ts:291`). Before any match engine we need:

- **Expanded player attributes** — more than five, with positional relevance
  (e.g. a defenseman's gap control vs a winger's finish), and a separation of
  **current ability vs potential**.
- **Confidence / scouting ranges** — every rated attribute carries an
  uncertainty that scouting (§6) narrows. The ratings and the scouting system
  are the same feature from two sides.
- **Overall & role fit** — a derived headline number per position so tables
  (§7) and lines (`ClubHQScreen`) can rank.
- **Team-level attributes** — aggregate/emergent ratings (team offense, defense,
  goaltending, special teams, cohesion) that a match engine reads. We cannot
  design the match engine until we know what these are and how they compose.

**This is the gating design task for Act III.** Treat it as its own doc when it
matures (`docs/15_PLAYER_AND_TEAM_RATINGS.md`).

---

## 9. The Inbox (evolve the Log)

Promote the event Log (`EventLog.tsx`) into an **Inbox**: the same monthly event
entries **plus** news items — messages from your team, scout reports, rival-GM
notes, and independent overtures. Categorized, with read/unread state, so the
player triages news the way a GM reads the morning wire. Keep the existing log
categories; add sender/source and news-type entries.

---

## 10. Deferred to Act III (explicitly out of Act II)

- **Match Engine v0** — blocked on §8 (player/team ratings). This is the whole
  reason competition left Act II.
- **Opponent results rumors** — need a sim to seed real results; until then, no
  fabricated scores.
- **Water traversal / embark** — still a Club-Formation-era *capability* on
  paper (Halifax's Harbor Ferry), but not required for Act II exit; schedule
  after territory/scouting land, or pull forward only if an island start proves
  a trap in playtest.

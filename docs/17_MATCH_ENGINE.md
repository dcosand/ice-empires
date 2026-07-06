# Ice Empires — Match Engine v0 (exhibition games)

**Date:** 2026-07-05
**Status:** Design + shipping in the same session (D51). This is the docs/15 §7
match sketch made concrete — the first time hockey is actually *played* in Ice
Empires. Deliberately scoped to a self-contained **exhibition** feature: no
competition calendar, no standings, no era transition. Those stay Act III.
**Read alongside:** docs/15 §7 (the team-ratings sketch this implements),
docs/14 §8/§10 (why the sim waited for ratings), docs/13 §4–5 (the era arc it
will eventually serve).

---

## 0. Why now, and why this small

docs/14 deferred the match engine to Act III, "blocked on §8 (player/team
ratings)." The ratings foundation shipped (D42–D44): 1–100 attributes, derived
OVR, and a `teamRatings` aggregate in `engine/ratings.ts`. That unblocks the
sim. What has NOT shipped is the Act III competition layer (schedules, leagues,
standings, era entry criteria), so v0 is a **friendly exhibition against a
contacted rival**: one button, one seeded sim, one result screen, one Inbox
letter. It exists to (a) prove the ratings surface can drive a credible game,
(b) give the roster the player has been building a reason to exist, and (c) be
the engine Act III schedules will call in a loop.

**Not in v0** (explicit non-goals): opponent-results rumors, water traversal,
the competition calendar, player development/aging, injuries, penalties/power
plays, line deployment, home-ice advantage, overtime/shootouts (ties stand —
it's a friendly).

---

## 1. Team strength: how both sides compose

Both sides go through the **same** function — `ratings.teamRatings(roster)` —
so player and rival strength are computed identically and stay honest (derived,
never stored, like income and territory):

| Rating | Composed from | Drives in the sim |
|---|---|---|
| **attack** | Shooting + Passing + Puck Control of geared forwards | chance conversion (vs goaltending) |
| **defense** | Checking + Hockey IQ of D + forwards | chance suppression (vs transition) |
| **transition** | Speed + Agility across geared skaters | chance generation (vs defense) |
| **physicality** | Physicality across geared skaters | small conversion nudge (board battles) |
| **goaltending** | Goalie 6-attribute OVR roll-up (geared goalies) | chance conversion (vs attack) |

- The **player's side** is `teamRatings(state.roster)` — the geared-only filter
  is built in, so an ungeared bench never plays. The `hasFullLine` gate (§4)
  guarantees ≥6 geared players including a goalie before a game can start.
- The **rival's side** is `teamRatings(rival.roster)` — which requires rivals
  to *have* rosters (§2). Rival players generate pre-geared (`hasEquipment:
  true`); an AI club is assumed to equip its own team.
- Compete/Composure (the docs/15 §7 "close-game swing") and Durability/
  Discipline (penalties, wear) are **deferred** — they arrive with the Act III
  layer that has close games worth swinging (playoffs, calendars, fatigue).
  v0 uses the five ratings above and nothing else; if a future sim iteration
  needs more surface, extend `teamRatings` (derived), never store new fields.

---

## 2. Rival rosters (the true prerequisite)

Rivals have never had players — `roster` lived only on `GameState`. Now:

- **Storage:** `RivalClub.roster: Player[]` — initialized `[]` at worldgen
  (`placeRivals`), filled at **first contact**. Rosters are *people* and
  therefore stored state (like `state.roster`); *ratings* stay derived. An
  empty roster simply means "not contacted yet," which is fine because every
  consumer (exhibitions now, the Act II rival roster read later) is gated on
  contact anyway.
- **Generation:** `rivalAI.generateRivalRoster` rolls through the shared
  `engine/playerGen.ts` helpers (never a forked generator): nationality-
  weighted identities from the rival club's weights, style → attribute-band
  rolls, potential, hidden traits. Nine players on a fixed template —
  **2 C, 3 W, 3 D, 1 G** — so every rival can always ice a legal line.
- **Era-appropriate bands** (the same `AttrBand` shape tryouts use), keyed to
  the rival's CURRENT era at contact time:

  | Rival era | Band (min + span) | Feel |
  |---|---|---|
  | pond-hockey | 20 + 25 | pond locals, same as your tryouts |
  | club-formation | 28 + 27 | organized, a cut above walk-ons |
  | competitive-hockey | 38 + 27 | real hockey players |
  | hockey-operations | 48 + 27 | professional operation |
  | dynasty | 58 + 30 | a machine |

- **When:** all three first-contact paths generate the roster the moment
  `contacted` flips — the human walking into them (`triggerRivalContact`), a
  rival walking into the human (`checkRivalContactAtScouts`), and the dev
  panel (`devMeetRival`). `playExhibition` keeps a defensive ensure. Rosters
  do NOT regenerate when a rival later advances eras — v0 accepts a slightly
  dated rival team; refreshing/AI development is Act III/IV work.
- Rival players are engine-side truth. **Never render their attributes
  directly** — when the Act II "rival roster read" lands, it goes through the
  same fog (`talentFog`) as everyone else. v0's result screen shows only
  names and match events, which is public information.

---

## 3. The sim: seeded period-by-period shot-chance model

`engine/matchEngine.ts` — `simulateMatch(seed, home, away)`, a **pure
function**: seed in, `{ result, seed }` out (the playerGen convention). No
`Math.random` (D3), no state access, no UI. NOT a single dice roll — the game
is resolved as chances inside periods, so the box score is real, not
retrofitted.

For each of **3 periods**, each team attacks:

1. **Chance generation** (transition vs defense):
   `chances = clamp(round(5 + (att.transition − def.defense) / 12 + jitter·3), 2, 12)`
   where `jitter` is a seeded 0..1 roll per team-period. At parity that's
   ~15–24 chances a game — the "shots" line of the box score.
2. **Chance conversion** (attack vs goaltending, physicality as a nudge):
   each chance scores with
   `p = clamp(0.11 + (att.attack − def.goaltending)·0.005 + (att.physicality − def.physicality)·0.001, 0.02, 0.40)`
   At parity ≈ 11% — a ~4-goal game on ~19 shots a side, hockey-shaped. A
   20-point attack edge over the opposing goalie roughly doubles it.
3. **Goal attribution:** scorer drawn from the attacking side's geared
   skaters weighted by Shooting (+15 forward bias); a second seeded roll adds
   an assist 65% of the time, weighted by Passing among the other skaters; a
   seeded minute within the period. This is where individual attributes leak
   into the narrative — snipers finish, playmakers feed.

**Ties stand.** It's an exhibition; "settled nothing" is a period-correct
result. Overtime/shootouts arrive with games that must produce a winner.

**Star of the game:** the winning side's goalie if they faced ≥12 shots and
allowed ≤1 (a stolen game reads as goaltending); otherwise the top point
scorer (goals+assists, earliest goal breaks ties); in a scoreless tie, the
busier goalie. One star, one line of copy — not a three-star ceremony.

### Box score (`MatchResult`, plain JSON in `types/game.ts`)

- `home` / `away` line: club id, display name, final score, shots, per-period
  goals (`periodGoals: number[]`).
- `goals[]`: period, minute, club id, scorer name + id, optional assist name.
- `star`: player id/name/club + a stat line ("2G 1A" / "18 saves on 19").
- `month`, and an `id` for the history list.

---

## 4. Initiation, gating & delivery

- **Action:** `PLAY_EXHIBITION { rivalClubId }` → `gameReducer` →
  `matchEngine.playExhibition` (the CLAUDE.md "new action" recipe).
  `structuredClone` + mutate, the signProspect pattern.
- **Gate** (`exhibitionGate`, with a hint string like every other gate):
  1. rival exists and is **contacted** — you can't book a game with a rumor;
  2. **`hasFullLine`** — 6+ geared players including a goalie (the same bar
     as the era requirement: no line, no game);
  3. **one exhibition per month** — derived from `matchHistory` (no stored
     flag), so a turn can't be spent fishing the RNG for a better score.
  Exhibitions are **free** in v0 — the friendly is its own reward; costs and
  frequency come with the Act III calendar.
- **Where:** the rival dossier's "Arrange exhibition" placeholder button
  (RivalMeetingScreen, dossier mode) goes live — meet the leader, challenge
  the club. Plus a Dev Panel button (§5).
- **Results reach the player two ways:**
  1. `state.pendingMatchResult` stages a **result overlay** the moment the
     action resolves (the pendingTryout/pendingNetwork state-staged pattern,
     rendered through the standard TaskOverlay chrome in Dashboard): final
     score with both crests, period-by-period line, shots, the goal reel,
     and the star. `ACKNOWLEDGE_MATCH_RESULT` dismisses it.
  2. An **Inbox letter** (D50): type `rival`, `from: "Game Notes"` — the
     morning-wire writeup with the score line and star, so the result
     survives the overlay's dismissal.
- `state.matchHistory: MatchResult[]` (newest first) keeps every played game —
  matches are events that happened, and Act III standings/records will read
  this list. `devResetTurn1` clears it.

---

## 5. Dev & validation

- **Dev Panel:** "Force exhibition" — contacts the nearest rival if none is
  (roster included), pads the player roster with geared generated players to
  a legal line if needed, bypasses the once-a-month limit, and runs the real
  `playExhibition` path. Same doctrine as Force Tryouts: bypass the gates,
  never the engine.
- **Headless sim** (the established pattern: esbuild-bundled script through
  the real engine functions): determinism (same seed → byte-identical
  result), seed advancement (different seed → different game), score sanity
  over hundreds of sims (mean total goals in a hockey-shaped band, shots
  within clamps, box score internally consistent — period goals sum to the
  score, every goal has a legal scorer), and skill mattering (a materially
  stronger team wins a clear majority over many seeds while upsets stay
  possible).

---

## 6. What Act III adds on top (so v0 doesn't grow sideways)

The competition calendar (scheduled fixtures, records, standings), era entry/
exit wiring, OT/shootouts, Compete/Composure close-game swing, penalties &
power plays off Discipline, fatigue/injuries off Durability, line deployment
and style matchups (the docs/15 §7 rock-paper-scissors), home ice, and
opponent-results rumors (now unblocked: the sim can seed real scores). All of
it calls `simulateMatch` — the resolver is built once, here.

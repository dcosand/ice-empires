# Ice Empires — Open Questions

**Date:** 2026-07-06
**Version:** 0.3 — resolved against four days of shipped work
**Purpose:** This started as a v0.2 (2026-06-27) list for one-question-at-a-time
design interviews, written before most of the game existed. It went stale:
most of it has since been answered by `DECISIONS.md` (D1–D51) and the actual
code. This pass resolves every question it can against what's shipped, marks
what the game answered differently than the original guess, and keeps only
the genuinely undecided ones as live open questions. The one-question-at-a-
time interview format is retired — design now happens playtest-first, recorded
in `DECISIONS.md` after the fact.

**Still genuinely open, highest priority first:** player development/aging
(Q12/Q34), affiliates (Q35/Q36), league formation & victory conditions
(Q15/Q19/Q20), rival alliances (Q18), rival GM voice/tone (Q16).

---

## 1. Core loop

**Q1. What is the main monthly decision?**
RESOLVED — E, balanced. Every month touches economy (build/research),
recruiting (tryouts/scout assignments), and territory; no single axis
dominates by design (D16, D24, D35).

**Q2. How important is unit movement in the first real prototype?**
RESOLVED — A, essential from the beginning. Scouts and builders have been
on the map since Month 1 of the founding turn (D12, D14, D19), not deferred.

**Q3. What is the first mini-game?**
RESOLVED, differently than guessed — no month-1 mini-game shipped. The
closest thing, "First Scrimmage," arrived as the Match Engine v0 exhibition
(D51) at the end of Club Formation, not in Month 1. Tryouts (D24) are the
actual earliest repeatable set-piece.

**Q4. How literal should the map be?**
RESOLVED — closest to D, a hand-authored tile grid with real terrain
(pond/desert/forest/mountain) and no procedural generation or real-world
geography (D12). Mythic-hockey flavor, not earth-like continents.

**Q5. Should real region/league names be used?**
RESOLVED — real hockey-city names (Moscow, Tampere, Bratislava, Baie-Comeau,
etc. — `HOCKEY_ORG_NAMES` in `engine/world.ts`) are used for independents; no
real league/brand names (no NHL/OHL/QMJHL) appear anywhere.

**Q6. How many regions in a standard game?**
SUPERSEDED — the region layer this question was about was deleted wholesale
(D28). Independents are the "places that matter" now; count follows art
coverage (~32 named orgs as of 2026-07-03), not a designed board size.

---

## 2. Map

**Q7. Should Hockey Knowledge be stored currency or science-per-turn?**
RESOLVED — B, science-per-turn (D1). Unchanged since v0.1.

**Q8. Should Talent be numeric?**
RESOLVED, reversed from the original lean — yes, numeric, and central from
Act I on: 1–100 scale, 10 skater + 6 goalie attributes (D42), generated for
every tryout candidate, wanderer, and prospect (`playerGen.ts`).

**Q9. Should Reputation be spendable or threshold-based?**
RESOLVED — B, threshold/unlock. Reputation is never spent; actions require
rep thresholds (D16).

---

## 3. Resources

**Q10. When do players become central?**
RESOLVED, reversed from the original lean — immediately. Roster players are
first-class from the Pond Hockey era's first tryout (D24), not deferred to
Club Formation or later.

**Q11. What should scouting hide?**
RESOLVED (partially) — true potential and true attribute values are hidden
behind fog-of-talent estimate ranges (D32/D39), later shown as static
scout-belief reads + Ability/Potential stars (D47). Durability and Discipline
exist as hidden traits (D42). NOT modeled: injury risk, personality, bust
probability, development curve — see Q12.

**Q12. How should development work?**
STILL OPEN — no development or aging system exists yet. `docs/15
_PLAYER_AND_TEAM_RATINGS.md` §8C (Act IV) calls for development + aging +
an affiliate pyramid + a Development Coach; none of it is built. Highest-value
remaining design/build gap alongside Q34.

---

## 4. Players/prospects

**Q13. How should games resolve?**
RESOLVED — C, auto-sim with visible modifiers. Match Engine v0's seeded,
period-by-period shot-chance model reads both teams' derived `teamRatings`
(D51).

**Q14. What are games for?**
PARTIALLY OPEN — today a game is an exhibition: a result screen + an Inbox
letter (D51), nothing else. No reputation/budget/standings stakes yet;
that's Act III calendar/standings work, not started.

**Q15. When does a league form?**
STILL OPEN — no league-formation concept exists in any doc or code path yet.

---

## 5. Competition

**Q16. How funny should rival GMs be?**
STILL OPEN — no tone pass has been done on rival-facing copy. Current
dossier/meeting text is dry and functional, not written for a comedic
register either way.

**Q17. How much sabotage?**
RESOLVED — B, soft sabotage. Rivals court independents for influence (D26),
contest and poach signed prospects (`rivalSigningPressure`, D49), and turn
wary over territory encroachment (D35). No hard sabotage or Shadow GM mode.

**Q18. Can rival GMs become allies?**
STILL OPEN — `rival.attitude` (friendly/wary, D20) is the only relationship
axis shipped. No treaty, alliance, or shared-benefit mechanics exist.

---

## 6. Diplomacy

**Q19. Which victory type is central?**
STILL OPEN — no victory condition of any kind exists. Eras (D17) are the
only progress spine, and they're endless (see Q20).

**Q20. Hard ending or endless?**
RESOLVED — C, endless. Month 12 doesn't hard-stop (D5); no era hard-stops
either. There is currently no concept of "winning" the game.

---

## 7. Victory

**Q21. Web or game engine long term?**
RESOLVED — web, locked: React 18 + PixiJS 8 + TypeScript + Vite (see
`CLAUDE.md`). No engine-swap plan.

**Q22. Use map library/engine?**
RESOLVED, differently than guessed — a PixiJS canvas isometric map
(`IsoWorldMap.tsx`), not the originally-guessed React/SVG approach.

**Q23. Multiplayer mode?**
RESOLVED (for now) — A, single-player only (D11). No multiplayer work has
started; explicitly deferred, not decided against forever.

---

## 8. Technical

**Q24. How realistic should art be?**
RESOLVED — B, premium illustrated strategy. Per-club art (`clubAsset`),
HockeyCard portraits, and independent card/background art (32 orgs) all
follow this direction.

**Q25. Should Arizona Monsoon get real logo exploration now?**
RESOLVED/moot — every club now ships real art via `assetKey` (D9), not a
placeholder. The original caution ("don't over-invest before the loop
works") is satisfied — the loop works.

**Q26. What should the map look like?**
RESOLVED — isometric terrain with Polytopia-reveal + Civ VI line-of-sight
fog (D27), club-colored territory borders (D35), rink/hockey-org markers,
minimap wash. Matches the "frozen-world, not too dark" goal.

---

## 9. Visuals

**Q27. How many hockey regions should be active in a standard game?**
SUPERSEDED — same answer as Q6. Independents replaced regions; count
follows art coverage, not a target size.

**Q28. What does a hockey region produce?**
RESOLVED — independents produce influence/relationship-tier progress,
revealed prospects (via scouting networks), and are the contested site of
the Anchor Club race against rivals (D21, D35, D38).

**Q29. How city-state-like should hockey regions be?**
RESOLVED — B/C, an active-ish ecosystem: contact → influence ladder →
revealed prospects → contested signings, not a passive yield tile (D21).

---

## 10. (retired) Next interview question

The v0.2 doc ended with a single "what would make you smile" prompt for the
next interview session. That format is retired — see the priority list at
the top of this doc for where design attention should go next.

---

## 11. Recruitment and scouting

**Q30. How should Scouting Coverage increase?**
RESOLVED, narrower than guessed — mainly A: the Club Scout's explicit unit
actions (network + assignment, D38/D46) are the whole lever. Coverage is
tech-gated (`scouting-reports`), not built from passive facility income.

**Q31. How should Recruitment Influence behave?**
RESOLVED, different math than guessed — not a Civ VI religious-pressure
spread. It's a seeded bid contest: your influence + filed reports +
map-proximity bonus vs. each contesting rival's influence, plus a random
roll each side (D49) — closer to option D, weighted odds, than the original
lean toward B.

**Q32. Can rivals contest your recruitment pipeline?**
RESOLVED — yes. Rivals court independents for influence (D26), can outbid
and poach already-signed prospects (`rivalSigningPressure`, D49), and get
prickly over territory encroachment (D35).

---

## 12. Player aging and development

**Q33. When should named teenagers appear?**
RESOLVED, reversed from the original lean — immediately. Every tryout
candidate, wanderer, and independent prospect is a named individual with an
age from the Pond Hockey era on; no gating to a later era.

**Q34. How much aging realism is enough?**
STILL OPEN — `Player.age` exists as a field but nothing increments it
anywhere in the codebase. No aging curve, no development windows. Paired
with Q12 as the biggest remaining systems gap.

---

## 13. Affiliates/minors

**Q35. When does the first minor affiliate unlock?**
STILL OPEN — no minor-affiliate system exists. "Affiliate" today is just the
top relationship tier of an independent (D21, 50+ influence), not a
development pipeline.

**Q36. What do affiliates do?**
STILL OPEN — undesigned beyond the relationship tier. No development slots,
call-ups, or attribute-growth mechanics built yet.

---

## 14. Team attributes

**Q37. Which team attributes appear first?**
RESOLVED, differently than guessed — the shipped model is individual
attributes (10 skater / 6 goalie, D42), not team-wide grades. Team-level
aggregates DO exist (`ratings.teamRatings`: attack/defense/transition/
physicality/goaltending) but are engine-internal for the match sim, not
surfaced to the player as club stats. Chemistry and Morale are explicitly
excluded going forward (D42: "never add Form/Morale/Contract depth").

**Q38. Should Team Attributes be visible numbers?**
RESOLVED for individuals, open for teams — individual attributes render as
true bars (your roster) or fogged/static scout reads (prospects and rivals,
D47). Team-level numbers aren't surfaced as a separate stat block anywhere
yet — no decision needed unless team-level display becomes a feature.

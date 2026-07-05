# Ice Empires — The Five-Act Era Arc

**Date:** 2026-07-02 (Act II design revised 2026-07-05)
**Status:** Act I (Pond Hockey Era) implemented; Act II designed, not yet coded.
**Purpose:** Define the game's five-era narrative arc, each era's core question and exit criteria, and the 40-tech tree. **The detailed Act II design now lives in `docs/14_ACT2_CLUB_FORMATION.md`** — §4 below is a summary that points there.

---

## 1. The five acts

| Act | Era id | Era name | Core question |
|---|---|---|---|
| I | `pond-hockey` | Pond Hockey Era | Can we make hockey exist? |
| II | `club-formation` | Club Formation Era | Can we become a real club? |
| III | `competitive-hockey` | Competitive Hockey Era | Can we beat other clubs? |
| IV | `hockey-operations` | Hockey Operations Era | Can we build the machine: scouting, recruiting, development, affiliates? |
| V | `dynasty` | Dynasty Era | Can we sustain greatness? |

### Era transition model

Per-club milestone checklists (Humankind-style), not a global clock: a club
advances the moment its CURRENT era's requirements are all met
(`data/eras.ts ERA_REQUIREMENTS`, checked in `engine/eraSystem.ts`).
For competitive pressure, AI rivals advance eras on their own seeded schedule
(`rival.eraId`), and transitions of contacted rivals are broadcast in the log
("Detroit Forge has entered the Club Formation Era").

Reference: Civ V advances your era on your first tech of a new column; Civ VI
(R&F) advances a global World Era on turn thresholds; Humankind uses per-civ
era stars. We chose per-club milestones as the best fit for club-building.

### The founder's vision (why hockey exists before rinks)

Nobody plays hockey at game start. Each club's founder saw the game in a
vision on winter ice (Arizona: in a rare desert frost) and has been trying to
explain it ever since. Act I is literally making the vision real: shovel a
pond → cut sticks → hold tryouts → teach the rules → meet the others who,
awkwardly, also invented hockey.

## 2. Act I — Pond Hockey Era (implemented)

**Exit criteria** (all required):
1. First contact with ≥1 rival major club
2. First contact with ≥1 independent org
3. ≥1 Level-1 rink built (map rink via the Rink Rats builder)
4. "Rules of the Game" researched
5. A full line: ≥6 geared players including a goalie

**Core loop**: explore with scouts → clear a frozen pond → build a Level 1
rink (club rinks within HQ radius 3 pay +1 funds/mo and host tryouts) →
harvest stickwood into equipment → hold tryouts for terrible-but-lovable
locals → gear a full line → meet a major and an independent.

**Economy** (two currencies + one stat + one inventory):
- **Funds** — production & purchases (Budget + Operations merged)
- **Hockey Knowledge** — research (science-per-turn)
- **Reputation** — standing, never spent; actions require thresholds
- **Equipment** — shed inventory; 1 gears each player

## 3. The 40-tech tree

Branches: Hockey Fundamentals · Icecraft & Infrastructure · Team Formation ·
Scouting & Reach · Club Formation · Pipelines & Influence · Competition ·
Diplomacy · Legacy. (Data: `src/data/research.ts`; UI: era-column ×
branch-row tree in `ResearchPanel`.)

| # | Tech | Branch | Era | Prerequisites |
|--:|---|---|---|---|
| 1 | Basic Skating | Hockey Fundamentals | Pond Hockey | — |
| 2 | Stick & Gear Basics | Hockey Fundamentals | Pond Hockey | — |
| 3 | Ice Surveying | Icecraft & Infrastructure | Pond Hockey | — |
| 4 | Outdoor Rinkcraft | Icecraft & Infrastructure | Pond Hockey | Ice Surveying |
| 5 | Local Tryouts | Team Formation | Pond Hockey | Basic Skating + Stick & Gear Basics |
| 6 | Scouting Rumors | Scouting & Reach | Pond Hockey | — |
| 7 | First Contact | Scouting & Reach | Pond Hockey | Scouting Rumors |
| 8 | Rules of the Game | Hockey Fundamentals | Pond Hockey | Basic Skating + Stick & Gear Basics + Local Tryouts |
| 9 | Club Identity | Club Formation | Club Formation | Rules of the Game |
| 10 | Volunteer Coaching | Team Formation | Club Formation | Local Tryouts + Outdoor Rinkcraft |
| 11 | Organized Practice | Team Formation | Club Formation | Volunteer Coaching |
| 12 | Basic Positions | Hockey Fundamentals | Club Formation | Rules of the Game |
| 13 | Hoser's Craft | Icecraft & Infrastructure | Club Formation | Outdoor Rinkcraft |
| 14 | Local Recruitment | Pipelines & Influence | Club Formation | Club Identity + Local Tryouts |
| 15 | Scouting Reports | Scouting & Reach | Club Formation | First Contact |
| 16 | Clubhouse | Icecraft & Infrastructure | Club Formation | Club Identity |
| 17 | First Scrimmage | Competition | Club Formation | Organized Practice + Basic Positions |
| 18 | Local Tournament | Competition | Competitive Hockey | First Scrimmage |
| 19 | Defensive Shape | Competition | Competitive Hockey | Organized Practice + Basic Positions |
| 20 | Shooting Mechanics | Competition | Competitive Hockey | Organized Practice + Stick & Gear Basics |
| 21 | Team Systems | Competition | Competitive Hockey | Defensive Shape + Shooting Mechanics |
| 22 | Special Teams | Competition | Competitive Hockey | Team Systems |
| 23 | Rival GM Contact | Diplomacy | Competitive Hockey | Local Tournament + First Contact |
| 24 | Arena Operations | Icecraft & Infrastructure | Competitive Hockey | Local Tournament + Hoser's Craft |
| 25 | Regional Scouting | Scouting & Reach | Hockey Operations | Scouting Reports |
| 26 | Relationship Visits | Pipelines & Influence | Hockey Operations | Local Recruitment + Regional Scouting |
| 27 | Recruiting Pipeline | Pipelines & Influence | Hockey Operations | Relationship Visits |
| 28 | Development Partnership | Pipelines & Influence | Hockey Operations | Recruiting Pipeline + Organized Practice |
| 29 | Player Projection | Scouting & Reach | Hockey Operations | Regional Scouting |
| 30 | Ice Resurfacing | Icecraft & Infrastructure | Hockey Operations | Arena Operations + Hoser's Craft |
| 31 | Junior Affiliate | Pipelines & Influence | Hockey Operations | Development Partnership |
| 32 | Operations Department | Club Formation | Hockey Operations | Clubhouse + Arena Operations |
| 33 | Pro Systems | Competition | Dynasty | Team Systems + Player Projection |
| 34 | International Scouting | Scouting & Reach | Dynasty | Regional Scouting + Player Projection |
| 35 | Full Farm System | Pipelines & Influence | Dynasty | Junior Affiliate + Operations Department |
| 36 | Sports Science | Team Formation | Dynasty | Development Partnership + Pro Systems |
| 37 | Global Development | Pipelines & Influence | Dynasty | Full Farm System + International Scouting |
| 38 | Hall of Fame Culture | Club Formation | Dynasty | Pro Systems + Arena Operations |
| 39 | Mega Arena | Icecraft & Infrastructure | Dynasty | Ice Resurfacing + Hall of Fame Culture |
| 40 | Dynasty Infrastructure | Legacy | Dynasty | Global Development + Hall of Fame Culture + Mega Arena |

Act-I gates wired in code: Ice Surveying → Rink Rats; Outdoor Rinkcraft →
Build Rink; Stick & Gear Basics → Harvest Branches; Local Tryouts → Hold
Tryouts; First Contact → Send Introduction; Rules of the Game → era exit;
Scouting Reports → map Scout recruitment.

## 4. Act II — Club Formation Era (summary — full design in docs/14)

Core question: *Can we become a real club?* **Full system design:
`docs/14_ACT2_CLUB_FORMATION.md`.** Headline shift from the original plan: the
**match engine moves to Act III** — we do not yet know enough about player/team
attributes to make competition feel good, so Act II builds the evaluation and
territory systems a match engine will later read from.

Proposed exit criteria (confirm before wiring `ERA_REQUIREMENTS`): establish a
scouting network with ≥1 independent, project visible borders (HQ + rinks),
research Club Identity, and complete one seasonal training-camp cycle.

Systems built in Act II (see docs/14 for each):
- **Territory & borders** — every rink projects a claim (two-radius model: home
  economy radius stays local, territory projection travels). Civ VI-style
  club-colored borders from HQ + rinks. Territory *does things*: scales the
  tryout pool (volume + quality), contests independents, and irritates rivals.
- **Boundary enforcement** — min build distance from rival HQs/territory; basic
  scouts cross all borders, Rink Rats/builders cannot enter rival territory.
- **Seasonal tryouts & training camp** — tryouts windowed twice/year (spring +
  camp) for player and AI; the calendar starts to matter (EHM feel).
- **Scout tiers & networks** — base Scout (generalist) vs Club Scout
  (establishes a scouting network at an independent → reveals prospects; Anchor
  Club race). Scouts can be assigned for ongoing reports.
- **Player evaluation & confidence** — first contact gives a low-confidence
  full-roster read on the club/indie surface; assigned scouts tighten it.
- **Scouting screen** — by-scout / by-subject views, sortable/filterable tables.
- **Player & team ratings system** — expand attributes + add confidence and
  team-level aggregates. This is the gating prerequisite for the Act III match
  engine.
- **The Inbox** — evolve the event Log into an inbox (events + scout/team/rival/
  indie news).

Deferred to Act III: match engine v0 (blocked on ratings), opponent results
rumors, and water traversal (`embark`; Halifax's Harbor Ferry) as a
nice-to-have rather than an exit gate.

## 5. Acts III–V — sketch only

- **III Competitive Hockey**: leagues/tournaments, standings, special teams,
  Rival GM diplomacy (trades/demands on the meeting surface), arenas.
- **IV Hockey Operations**: full pipelines (Relationship Visits → Recruiting
  Pipeline → Development Partnership → Junior Affiliate), player projection,
  operations department, aging/cohorts.
- **V Dynasty**: pro systems, international/global reach, farm system,
  Hall of Fame culture, Mega Arena, and a legacy victory condition
  (Dynasty Infrastructure).

---

## 6. The scouting arc (designed 2026-07-03, not yet coded)

Locked with the product owner; see DECISIONS.md D28–D30. This is the spine that
replaces the retired "Local Hockey Search" backchannel. **Core principle:**
scouting is always something the player *actively does on the map*, and it means
something different in each era. There should be a scouting "thing to do" every
turn.

### 6.1 Per-era scouting

| Era | Scouting is… | Active verb | Unit | Tangible payoff |
|---|---|---|---|---|
| I Pond | finding hockey exists at all | move your scout; sign wanderers off huts; hold tryouts near your rink | founder / basic scout | bodies on the roster + map reveal |
| II Club | networking with a *place* | build a **dedicated Scout**, travel it to an independent, **park it to Establish a Scouting Network** (must be made clearly required) | Scout | that indie's fogged prospects become real, recruitable names |
| III Competitive | sizing up *opponents* | travel a **professional / "spy" scout** to rival HQs for intel; pre-game / pre-scrimmage scouting reports | Pro Scout | dated roster intel; begin signing the indies you networked in II |
| IV Operations | running a scouting *department* | a **GM** figure (possibly the club leader) flies to indies for affiliates / farm teams + influence; leagues, drafts, free agents, agent negotiations | GM | prospect pipeline + drafting |
| V Dynasty | global reach | **permanent amateur scouts** assigned across the map | standing scout network | find gems others miss; beat/steal signings from majors |

Emotional payoff shifts by phase: early = **explore & discover**; mid = **make
strategic bets on independents + build your roster**; late = **draft, discover
talent others miss, beat majors to big-name signings, "steal" players from other
majors**.

### 6.2 Scout attributes (scouts are not equal)

Two attributes, both improving with experience:
- **Judging Potential** — projecting a young player's ceiling.
- **Judging Ability** — reading current skill accurately.

**Acquisition = hybrid** (see D30, gated on the economy pass):
- **Pay upfront for a quality tier** at production (EHM job-market feel: splurge
  on an ace vs. field two cheap eyes). Requires scarcer funds to matter.
- **Earn promotions** through fieldwork (Civ-XP: networking indies, hut
  campfires). Every scout grows an arc.

~~Open question for the implementing agent: do scout ratings live on individual
scout characters (a "scout roster" like the player roster — the owner leaned
this way) or a club-wide capability derived from reputation/hockey knowledge?
Decide before building.~~ **SETTLED 2026-07-03 (D31): individual scout
characters.** Shipped as `state.scoutStaff` — named scouts tied to map units,
tiers Volunteer/Traveled/Ace picked at production, promotions every 5 fieldwork
XP (+1 to the weaker judging attribute). §4.5's Establish Scouting Network
shipped alongside (see D31 for what's still ahead: rival networks, recruiting
revealed prospects, the later-era scout types of §6.1).

### 6.3 Fog-of-talent (information provenance)

A scouted player's attributes are **estimates**, not exact numbers. Confidence is
set by *how* you learned about them — tightest to loosest:

1. **Tryout on your own ice** → near-exact (you watched them play).
2. **Your scout visited the indie** → good; tightness scales with that scout's
   Judging Potential / Judging Ability.
3. **The indie's own word** (just contacted) → vague and *biased* — they oversell
   their own kids.
4. **Rumor from another major** → variable/secondhand.

**Potential and Ability are separate fogs** (a scout can read current skill
tightly but whiff on ceiling). Every scouted player carries a **"known-via"
provenance** that sets range tightness. This reshapes the HockeyCard: attribute
bars become **confidence ranges** that sharpen as better intel arrives — a dud
can look like a gem until you get eyes on him. (Ties to task #6.)

> **SHIPPED v1 2026-07-03 (D32)**: rungs 1–3 live. Networked prospects store
> true attrs + ceiling engine-side and render only estimate ranges
> (`engine/talentFog.ts`; half-width `max(1, round((16 − judging)/3))`, truth
> guaranteed inside, center seeded off-true). Rung 4 waits on §4.2 rival
> snapshots; HockeyCard range bars wait until prospects render as cards; range
> collapse on better intel (tryout after network) is future work.

### 6.4 Talent sources (all player-driven, no RNG backchannel)

- Campfire **goodie huts** (active map discovery) — keep.
- **Tryouts** near your rink — keep (and the most accurate intel, per 6.3).
- **Level-1 rinks periodically draw a local hopeful** — PROPOSED, so map rinks
  matter beyond +1 funds/tryouts. A structure-driven, non-random faucet.

### 6.5 Cards — PARKED

The coach/prospect **card** feature has no clear meaning yet (coaches-on-cards
feel odd; nothing puts them on the map). Do **not** build card triggers. Revisit
later whether cards become a Civ-VI-style "great people" special unit or are
removed entirely. Roster players stay first-class (D24), never cards.

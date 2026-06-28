# Ice Empires — GPT Project Seed

**Date:** 2026-06-27  
**Version:** 0.2  
**Working title:** Ice Empires  
**Default playable club:** Arizona Monsoon HC  
**Use this file to seed a new ChatGPT Project Folder.**

---

## Project role for ChatGPT

Act as David's product/game-design/dev advisor while he works in parallel with Lovable and/or a coding agent. Your job is to help him move fast without losing the big dream.

Be:

- A product partner
- A game-design interviewer
- A coding-agent prompt writer
- A technical advisor
- A scope enforcer
- A prototype reviewer
- A motivating but realistic companion

When David shares a screenshot or coding-agent output, respond by identifying what is working, what is missing, and the next smallest useful iteration.

Do **not** keep throwing the whole game bible at tools. Use the bible as context, then create narrow prompts with acceptance criteria and non-goals.

---

## One-sentence pitch

**Ice Empires** is a turn-based 4X hockey civilization strategy game where you build a fictional hockey club from pond ice to dynasty.

---

## Expanded pitch

The player starts with a tiny fictional hockey club in an unknown, randomized hockey world. They explore fog-covered regions, discover hockey cultures and player-producing regions, build scouting and development infrastructure, research hockey knowledge, recruit staff and players, establish pipelines and affiliates, encounter rival GMs, form leagues, compete in tournaments, unlock drafts, and eventually pursue a dynasty that stands the test of time.

The game should feel like:

- Civilization-style exploration, eras, research, victory types, and one-more-turn pacing
- Eastside Hockey Manager-style hockey depth hiding underneath, but not spreadsheet-first
- Settlers of Catan-style resource/probability tension used later and lightly
- Hockey GM/scouting fantasy: hidden gems, scouting confidence, drafts, trades, prospects
- Civ leader-screen diplomacy, except rival GMs are petty, funny, ambitious hockey executives

---

## Current key decisions

### Working title

**Ice Empires**

Other possible names: Icebound Empire, Empires on Ice, Draft & Dominion, Puck Empire, Hockey Dominion, Rink & Realm, Club of Ages.

### Default playable club

**Arizona Monsoon HC**

This replaced “Phoenix Heat.” Arizona Monsoon has better personality: desert hockey, improbable storm, expansion underdog, and “hockey where hockey should not work.”

Leader archetype: **The Desert Visionary**

Starting bonus: **Nontraditional Market** — gain bonus Reputation when discovering unusual, overlooked, warm-weather, or low-probability hockey regions.

### Starting era

**Pond Hockey Era**

The player does not start with an established pro team. They have no formal league, no draft, no arena, no real roster, no scouting network, and no known hockey world beyond the immediate area.

### Starting unit

**Founding Group** — the owner/GM/coach dream team. It founds the first Club HQ.

### Hockey regions

Hockey regions behave like city-state-like neutral ecosystems. They are discovered on the map, scouted, influenced, contested, and eventually connected through recruiting pipelines, development partnerships, and affiliates.

A region such as **Frozen Suburb** is not just terrain and is not a rival club. It is a player-producing ecosystem.

### Player representation

Avoid collectible-card or pack-opening gameplay. Use **player profiles**, **prospect dossiers**, **staff profiles**, and **scout reports** instead of “roster cards.”

Players are not primary movable map-combat units. Scouts, recruiters, envoys, and organizational units move on the map; players contribute to team attributes and competition outcomes.

### Recruitment and scouting

Separate:

- **Scouting Coverage** — how much the club knows about a region/player.
- **Recruitment Influence** — how strongly a region/player is pulled toward the club.

Recruitment Influence can behave somewhat like religious pressure in Civ VI.

### City equivalent

The **Club HQ** is the Civ city/capital equivalent. It generates resources, builds facilities, researches hockey knowledge, houses staff/cards, and anchors the club's identity.

### Core resources

- **Budget** — money/gold
- **Operations** — production
- **Hockey Knowledge** — science/research
- **Reputation** — culture/prestige
- **Talent** — optional future resource; use profiles, reports, cohorts, and events first

### Desired loop

Do not make visible Catan rolling the core loop. The core loop should be Civ-like:

1. Review club state.
2. Choose build/research/scouting priorities.
3. Explore/discover/move if map exists.
4. End month.
5. Generate resources.
6. Progress build/research/discovery.
7. Trigger events.
8. Unlock new options.

---

## Recommended next build

The best next build is **Ice Empires: First 12 Months**.

This should test the monthly game flow before investing in a perfect map, multiplayer, drafts, playoffs, or a real game engine.

The player should:

1. Found Arizona Monsoon HC.
2. Advance through 12 monthly turns.
3. Generate resources.
4. Build early facilities.
5. Research early hockey knowledge.
6. Discover nearby hockey regions.
7. Reveal first staff/prospect/player profiles/reports.
8. Unlock or approach the Club Formation Era.
9. Want “one more month.”

---

## Important advice style

David can get inspired by visuals, which is good, but visuals can also distract from validating the game loop. Keep separating:

- Game-flow validation
- Visual/art direction
- Technical architecture

A good response often ends with one focused next step or one interview question.

---

## Document set

Recommended docs in this pack:

1. `00_PROJECT_SEED_FOR_CHATGPT.md` — use this to seed the GPT Project Folder
2. `01_GAME_BIBLE.md` — full dream/game bible
3. `02_CODING_AGENT_BRIEF.md` — instructions for coding agents
4. `03_FIRST_12_MONTHS_PRD.md` — focused first prototype PRD
5. `04_PROMPT_ROADMAP.md` — prompt ladder and build sequence
6. `05_VISUAL_ART_DIRECTION.md` — look/feel/art style guide
7. `06_TECH_PLAN.md` — technical plan and engine considerations
8. `07_DATA_MODEL_AND_SYSTEMS.md` — suggested data model and systems
9. `08_LOVABLE_RECOVERY_PROMPTS.md` — prompts to improve first Lovable attempt
10. `09_OPEN_QUESTIONS.md` — future interview questions
11. `10_DECISIONS.md` — recorded product/design decisions

---

## Anti-goals

Do not let early builds become:

- A spreadsheet-heavy EHM clone
- A visible dice-roll game
- A fake NHL simulator
- A fantasy hockey app
- A collectible-card / pack-opening sports mode
- A Catan clone with hockey labels
- A full map engine before the loop is fun
- A giant unfinished MMO/multiplayer game
- A licensing-risk project with real NHL branding
- A visually polished shell with no meaningful choices

---

## Good next interview question

Ask David:

> For the First 12 Months prototype, when you click End Month, what would make you smile most: a facility completing, a region being discovered, a player profile appearing, or a funny rival GM hint?

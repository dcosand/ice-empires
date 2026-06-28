# Ice Empires Docs Pack

**Date:** 2026-06-27  
**Version:** 0.2

This folder contains the v0.2 working design and build docs for **Ice Empires**, a turn-based 4X hockey civilization strategy game.

## Recommended use

### To seed a new ChatGPT Project Folder

Use:

> `00_PROJECT_SEED_FOR_CHATGPT.md`

Then add the rest of the docs as Project source material.

### To brief a coding agent

Give the coding agent:

1. `01_GAME_BIBLE.md`
2. `02_CODING_AGENT_BRIEF.md`
3. `03_FIRST_12_MONTHS_PRD.md`
4. `06_TECH_PLAN.md`
5. `07_DATA_MODEL_AND_SYSTEMS.md`

Tell the agent to plan first and not code the whole bible.

### To continue with Lovable

Use:

> `08_LOVABLE_RECOVERY_PROMPTS.md`

### To guide visuals

Use:

> `05_VISUAL_ART_DIRECTION.md`

### To continue design interviews

Use:

> `09_OPEN_QUESTIONS.md`

## File list

- `00_PROJECT_SEED_FOR_CHATGPT.md` — seed doc for a new GPT Project Folder
- `01_GAME_BIBLE.md` — full dream/game bible
- `02_CODING_AGENT_BRIEF.md` — agent behavior and first build brief
- `03_FIRST_12_MONTHS_PRD.md` — focused first prototype PRD
- `04_PROMPT_ROADMAP.md` — prompt ladder and scope sequence
- `05_VISUAL_ART_DIRECTION.md` — look/feel/art style guide
- `06_TECH_PLAN.md` — technical plan and engine considerations
- `07_DATA_MODEL_AND_SYSTEMS.md` — suggested types, systems, and architecture
- `08_LOVABLE_RECOVERY_PROMPTS.md` — prompts to recover/improve first Lovable attempt
- `09_OPEN_QUESTIONS.md` — future interview questions
- `10_DECISIONS.md` — recorded product/design decisions and unresolved decisions


## v0.2 design updates

This replacement pack preserves the original v0.1 structure while updating the relevant sections based on the latest design decisions:

- Hockey regions now behave like city-state-like neutral ecosystems that produce players, staff, resources, and pipeline opportunities.
- “Cards” language has been replaced with profiles, dossiers, reports, and front-office records to avoid collectible-card gameplay implications.
- Scouting Coverage and Recruitment Influence are separate systems.
- Recruitment Influence can behave like a Civ VI religion-style pressure system.
- Players are not primary movable map-combat units.
- Team strength is represented by hockey attributes, not one generic number.
- Player aging is acknowledged, with youth cohorts early and individual prospects later.
- Minor/junior affiliates are now explicit midgame systems.
- Research techs are club-agnostic.

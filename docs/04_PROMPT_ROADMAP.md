# Ice Empires — Prompt Roadmap

**Date:** 2026-06-27  
**Purpose:** Use this as the prompt ladder for Lovable or coding agents. One prompt, one job.

---

## 1. Prompting rule

The bible is for context. Prompts are for execution.

Each prompt should include:

1. Context
2. Single objective
3. Acceptance criteria
4. Non-goals
5. What to preserve
6. What to avoid

Bad:

> Build the entire hockey Civ game.

Good:

> Implement monthly turn resolution for First 12 Months. Do not add map movement, draft, playoffs, multiplayer, or diplomacy.

---

## 2. Build order

### Step 0 — Agent planning

Goal: agent reads docs and plans before coding.

Expected output:

- Understanding
- Implementation plan
- File structure
- Data model
- Risks
- First milestone

### Step 1 — App skeleton

Goal: app runs.

Scope:

- Landing screen
- Start button
- Main dashboard shell
- Mock game state

Non-goals:

- No mechanics
- No map
- No animations

### Step 2 — Monthly turn loop

Goal: playable months.

Scope:

- End Month button
- Resource income
- Month counter
- Event log entries
- Basic state updates

Non-goals:

- No dice roll mechanic
- No scouting
- No draft
- No map movement

### Step 3 — Build projects

Goal: Club HQ feels productive.

Scope:

- Build panel
- Select active build
- Progress each month
- Complete facilities
- Apply effects

Acceptance criteria:

- Outdoor Rink, Equipment Shed, Clubhouse, Volunteer Coaching Bench are available.
- Completed buildings appear in Club HQ.
- Effects modify yields/unlocks.

### Step 4 — Research projects

Goal: Hockey Knowledge feels like Civ science.

Scope:

- Research panel
- Select active research
- Monthly progress
- Completion/unlocks

Acceptance criteria:

- Basic Skating, Organized Practice, Scouting Reports, Youth Development can complete.

### Step 5 — Discovery/region cards

Goal: test exploration before map engine.

Scope:

- Hidden region card grid
- Discovery priorities
- Reveal regions over time
- Region detail panel

Non-goals:

- No hex movement
- No terrain rendering
- No Catan roll

### Step 6 — Staff/prospect/player cards

Goal: add hockey dopamine.

Scope:

- Card model
- Card panel
- Cards unlocked by events/build/research/discovery
- Simple effects

Non-goals:

- No roster management
- No contracts
- No advanced development

### Step 7 — Era progress

Goal: complete the first arc.

Scope:

- Club Formation Era requirements
- Progress panel
- Unlock message

Non-goals:

- Do not implement full next era yet.

### Step 8 — Visual pass

Goal: make it feel like Ice Empires.

Scope:

- Visual hierarchy
- Arizona Monsoon identity
- Dark ice/empire palette
- Card styling
- Event log readability

Non-goals:

- No final art
- No logo rabbit hole
- No gameplay rewrites

### Step 9 — Scouting Map Prototype

Goal: test map/movement/fog.

Scope:

- Simplified hex/region map
- Scout unit
- Fog
- Tile reveal
- Terrain types
- Region detail panel

Non-goals:

- No full procedural world generator
- No combat
- No full diplomacy

### Step 10 — Rival GM first contact

Goal: test Civ leader-screen fantasy.

Scope:

- One rival GM
- Triggered contact
- Dialogue popup
- Relationship meter
- 3–4 response options

Non-goals:

- No full diplomacy engine
- No trade UI

### Step 11 — First mini-game

Goal: first hockey competition.

Recommended: Local Tournament.

Scope:

- Simple bracket/event
- Club strength estimate
- Rewards
- Rival hint

Non-goals:

- No full game simulation
- No playoffs
- No draft

---

## 3. Coding-agent kickoff prompt

```text
Read the attached GAME_BIBLE.md, FIRST_12_MONTHS_PRD.md, TECH_PLAN.md, and DATA_MODEL_AND_SYSTEMS.md. Do not code yet. Produce a concise plan for the First 12 Months prototype, including file structure, data model, milestones, risks, and the smallest useful first implementation.
```

---

## 4. Lovable prompt pattern

```text
Revise the current Ice Empires prototype. Focus only on [one thing]. Preserve [existing good pieces]. Remove/de-emphasize [bad mechanic]. Do not implement [future systems]. Acceptance criteria: [specific list].
```

Lovable is good for visual sketches, dashboard concepts, card styling, and layout. It is weaker at ambiguous giant game-system prompts.

---

## 5. Scope traps

### Visual rabbit hole

Symptom: map/logo/art consumes all energy before monthly loop is fun.

Antidote: timebox visual passes and use `05_VISUAL_ART_DIRECTION.md`.

### Simulation rabbit hole

Symptom: player stats/contracts/lines appear too early.

Antidote: keep players as cards/events until needed.

### Map engine rabbit hole

Symptom: procedural hexes/pathfinding/fog take over.

Antidote: validate with region cards first.

### Multiplayer rabbit hole

Symptom: accounts/rooms/websockets before game is fun.

Antidote: single-player local prototype first.

---

## 6. Review loop

After every iteration ask:

1. What changed?
2. What improved?
3. What broke?
4. Did it validate the intended thing?
5. Did it add unwanted scope?
6. What is the next smallest useful prompt?

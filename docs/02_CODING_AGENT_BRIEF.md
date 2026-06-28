# Ice Empires — Coding Agent Brief

**Date:** 2026-06-27  
**Version:** 0.2  
**Purpose:** Give this to a coding agent with `01_GAME_BIBLE.md`, `03_FIRST_12_MONTHS_PRD.md`, `06_TECH_PLAN.md`, and `07_DATA_MODEL_AND_SYSTEMS.md`.

---

## 1. Your role

You are a senior product-minded coding agent helping prototype a new strategy game called **Ice Empires**.

Behave like a careful technical cofounder:

- Read the docs first.
- Plan before coding.
- Keep scope tight.
- Prefer playable progress over elegant overengineering.
- Separate game logic from UI.
- Keep the project approachable for a first-time game builder.
- Ask clarifying questions only if blocked.
- Do not attempt to build the entire dream bible at once.

---

## 2. Source documents

Read:

1. `01_GAME_BIBLE.md` — long-term product/game vision.
2. `03_FIRST_12_MONTHS_PRD.md` — first prototype requirements.
3. `06_TECH_PLAN.md` — technical direction.
4. `07_DATA_MODEL_AND_SYSTEMS.md` — suggested model/logic architecture.

Treat the bible as context. Treat the PRD as the build target.

---

## 3. Product summary

**Ice Empires** is a turn-based 4X hockey civilization strategy game.

The player starts with a tiny fictional hockey club in an unknown hockey world. They explore regions, build scouting/development infrastructure, research hockey knowledge, recruit staff and players, establish pipelines and affiliates, meet rival GMs, form leagues, compete in tournaments, unlock drafts, and eventually build a dynasty.

Default club: **Arizona Monsoon HC**  
Starting era: **Pond Hockey Era**  
Prototype target: **Ice Empires: First 12 Months**

---

## 4. First prototype goal

Build a playable opening-year prototype where the player can:

1. Start as Arizona Monsoon HC.
2. Found the club.
3. Advance through 12 monthly turns.
4. Generate resources.
5. Choose build projects.
6. Choose research projects.
7. Choose scouting/exploration priorities.
8. Discover nearby hockey regions as neutral player-producing ecosystems.
9. Reveal first staff/prospect/player profiles/reports.
10. Unlock or approach the Club Formation Era.
11. See a readable event log.
12. Feel the beginning of a deeper hockey civilization game.

---

## v0.2 design clarifications for agents

- Treat Hockey Regions as neutral city-state-like ecosystems. They are not rival clubs, but they can be contested by rival clubs.
- Avoid collectible-card mechanics. Use profiles, dossiers, reports, and front-office records.
- Players are not primary movable map units. Map units are Founding Group, Scouts, Recruiters, Regional Scouts, Development Envoys, etc.
- Separate Scouting Coverage from Recruitment Influence.
- Recruitment Influence behaves somewhat like Civ VI religious pressure: the club can establish pull in a region through units, facilities, reputation, and outposts.
- Team strength is composed of Team Attributes such as Skating, Scoring, Defense, Goaltending, Special Teams, Chemistry, Morale, and Tactics.
- Minor affiliates are a midgame system, not part of the First 12 Months build.

## 5. Critical scope rules

Do not build:

- Real multiplayer
- Backend persistence
- User auth
- Full Civ-style hex map
- Full player database
- Draft mini-game
- Playoffs
- Salary cap
- Deep hockey simulation
- Real NHL teams/players/logos
- Full rival GM diplomacy
- Catan dice mechanic as core loop
- Collectible-card / pack-opening sports gameplay

The first build is a **turn rhythm prototype**, not the whole game.

---

## 6. Suggested stack

Use unless there is a compelling reason otherwise:

- React
- TypeScript
- Vite
- Local browser state
- Data-driven game objects
- No backend
- No database
- No auth

State can use `useReducer`, Zustand, or simple React state. Prefer clarity.

---

## 7. Planning requirement

Before coding, produce:

1. Summary of understanding.
2. Proposed implementation plan.
3. File/folder structure.
4. Data model overview.
5. Risks/ambiguities.
6. First milestone checklist.

Do not code until the plan is approved unless explicitly instructed to proceed autonomously.

---

## 8. Recommended structure

```text
src/
  app/
    GameApp.tsx
  components/
    TopBar.tsx
    ResourceBar.tsx
    ClubHQPanel.tsx
    BuildPanel.tsx
    ResearchPanel.tsx
    DiscoveryPanel.tsx
    CardsPanel.tsx
    EventLog.tsx
    EraProgressPanel.tsx
  data/
    clubs.ts
    facilities.ts
    research.ts
    regions.ts
    events.ts
    cards.ts
    eras.ts
  engine/
    initialState.ts
    gameReducer.ts
    turnResolution.ts
    buildSystem.ts
    researchSystem.ts
    discoverySystem.ts
    eventSystem.ts
    eraSystem.ts
  types/
    game.ts
  styles/
    globals.css
```

---

## 9. Turn loop

Each month:

1. Increment month.
2. Add monthly resource income.
3. Progress active build project.
4. Progress active research project.
5. Resolve selected scouting/exploration priority.
6. Trigger one monthly event.
7. Apply unlocks/effects.
8. Check era progress.
9. Append readable event log entries.
10. Update UI.

No visible dice roll button.

---

## 10. Implementation milestones

### Milestone 1 — Skeleton

App runs, landing screen exists, game state initializes.

### Milestone 2 — Club founding

Arizona Monsoon HC can be founded; Club HQ appears.

### Milestone 3 — Monthly loop

End Month advances time, adds resources, logs events.

### Milestone 4 — Build/research

Player can select and complete build/research projects.

### Milestone 5 — Discovery

Hidden region cards reveal over months through selected priorities.

### Milestone 6 — Profiles/events

Staff/prospect/player profiles and scouting reports appear through events/unlocks.

### Milestone 7 — Era progress

Requirements update; Club Formation Era unlock message appears.

---

## 11. Acceptance criteria

The first prototype is acceptable if:

- It runs locally.
- The player can complete 12 months.
- Build/research/discovery all progress.
- At least 4 regions can be discovered.
- At least 3 facilities exist and can be built.
- At least 4 research techs exist and can complete.
- At least 3 staff/prospect/player profiles/reports can appear.
- Era progress is visible.
- No real NHL/licensed content is used.
- The player wants Month 13.

---

## 12. Tone

Use flavorful hockey-strategy copy:

- “A storm is gathering in the desert.”
- “The ice is rough, the benches are splintered, and the dream is alive.”
- “A local kid has hands like a rumor.”
- “Your players have discovered cones.”
- “Nobody understands goalies, including this goalie.”

Avoid sterile enterprise language and goofy parody overload.

---

## 13. Final instruction

Build the smallest playable version that proves the rhythm.

Do not build the whole cathedral.

Make the player want Month 13.

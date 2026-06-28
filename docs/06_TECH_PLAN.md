# Ice Empires — Technical Plan

**Date:** 2026-06-27  
**Version:** 0.2  
**Purpose:** Guide technical decisions for a first-time game builder using coding agents, with awareness of an Intel iMac on macOS Sonoma and possible later Steam/game-engine ambitions.

---

## 1. Executive recommendation

Start with a **web-based React + TypeScript prototype**.

Do not start in a full game engine yet.

Reason:

- The first risk is game-design risk, not rendering/engine risk.
- The first prototype is mostly turn-loop, cards, resources, decisions, and UI state.
- Web is faster to iterate with coding agents.
- React/TypeScript is easier to inspect, prompt, debug, and refactor.
- Good data/model separation can later be ported to Godot, Unity, or another engine.

Recommended first stack:

- React
- TypeScript
- Vite
- Local state
- Plain CSS or Tailwind optional
- No backend
- No database
- No multiplayer

---

## 2. Technical phases

### Phase 1: Flow prototype

Goal: prove First 12 Months.

Tech:

- React + TypeScript + Vite
- Local state
- Data-driven mock content

### Phase 2: Logic prototype

Goal: separate game engine logic from UI.

Add:

- Reducer/state machine
- Turn resolver
- Build/research/discovery systems
- localStorage save/load
- Basic tests if helpful

### Phase 3: Map prototype

Goal: test Civ-like map/fog.

Options:

- React SVG
- Canvas
- PixiJS
- Phaser

Recommendation: React/SVG or Canvas first. Do not jump to Godot only for a simple strategy map.

### Phase 4: Web vertical slice

Goal: playable version with more systems.

Add:

- Better saves
- More data
- AI rival hints
- Scouting/region systems
- Hotseat maybe

### Phase 5: Engine evaluation

Consider Godot, Unity, web wrapper, or continuing web.

### Phase 6: Steam-style prototype

Only after loop validation.

---

## 3. Why not start with a game engine?

Early Ice Empires is not blocked by physics, 3D, controller input, or advanced rendering.

It is blocked by:

- Is the monthly loop fun?
- Do build/research/scouting decisions matter?
- Does the player care about the club?
- Does discovery create curiosity?
- Does the game avoid spreadsheet gravity?

A web prototype answers those faster.

---

## 4. Dev setup notes

Known setup:

- Intel iMac
- macOS Sonoma
- First-time game development
- Comfortable using AI coding agents

### React/Vite

React/Vite should be a comfortable first path on an Intel Mac. It is lightweight relative to game engines and works well with coding agents.

### Godot

Godot is a plausible future engine for a 2D/strategy indie game. Official Godot documentation lists macOS support for x86_64 and ARM CPUs, and Godot's macOS download page lists Vulkan-compatible hardware as recommended with OpenGL 3.3/OpenGL ES 3.0 as minimum graphics requirements.

Implication:

- An Intel iMac on Sonoma should be plausible for learning/prototyping in Godot, depending on GPU and project complexity.
- Godot is worth evaluating later if the game wants a true native strategy-game shell.

### Unity

Unity is powerful, but probably not the best first step. Official Unity 6.4 system requirements list macOS Monterey 12 or newer, x64 architecture with SSE2, and Metal-capable Intel/AMD GPUs.

Implication:

- An Intel iMac on Sonoma may satisfy current Unity editor OS/architecture requirements if its GPU is Metal-capable.
- Unity is heavier and more complex than needed for the first prototype.
- Unity becomes more interesting for 3D, console ambition, larger teams, or production pipelines.

### Steam path

If promising, Steam can be reached through:

- Native Godot/Unity build
- Web app wrapped in Electron/Tauri
- Rebuild/port after mechanics are validated

Do not optimize for Steam before the game is fun.

---

## 5. Recommended project structure

```text
ice-empires/
  README.md
  package.json
  vite.config.ts
  tsconfig.json
  src/
    App.tsx
    main.tsx
    components/
      TopBar.tsx
      ResourceBar.tsx
      ClubHQPanel.tsx
      BuildPanel.tsx
      ResearchPanel.tsx
      DiscoveryPanel.tsx
      RegionReportPanel.tsx
      ProfilesPanel.tsx
      EventLog.tsx
      EraProgressPanel.tsx
    data/
      clubs.ts
      facilities.ts
      research.ts
      regions.ts
      events.ts
      people.ts
      playerProfiles.ts
      teamAttributes.ts
      regionInfluence.ts
      affiliates.ts
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
      selectors.ts
    types/
      game.ts
    styles/
      globals.css
```

---

## 6. State management

Start simple:

- `useReducer` is a good fit for turn-based deterministic state.
- Zustand is fine if component prop drilling becomes annoying.
- Avoid Redux Toolkit unless needed.
- Avoid XState unless the state machine becomes complex.

---

## 7. Data-driven design

Game content should live as data:

- Facilities
- Research techs
- Hockey regions
- Profiles/reports
- Events
- Eras

Game rules should live in engine modules.

Avoid hard-coding build/research effects inside UI components.

---

## 8. Turn resolver

Core flow:

```text
endMonth(gameState):
  1. increment month
  2. calculate income
  3. add resources
  4. progress build
  5. progress research
  6. resolve discovery priority
  7. trigger monthly event
  8. apply unlocks
  9. check era progress
  10. append log entries
  11. return new state
```

This should be easy to test and reason about.

---

## 9. Save/load

Phase 1: no save needed.

Phase 2: localStorage.

Phase 3: export/import JSON save.

Later: backend or Steam cloud if needed.

---

## 10. Multiplayer strategy

Do not implement early.

Possible future forms:

- Hotseat — easiest
- Async multiplayer — likely best long-term web form
- Live multiplayer — hardest

Recommendation: single-player local prototype first, then hotseat, then async if fun.

---

## 11. Engine decision framework

Stay web if:

- Game is mostly UI/cards/map/turns.
- You need rapid iteration.
- AI coding-agent productivity matters.
- Web distribution matters.

Move to Godot if:

- Native app/Steam becomes important.
- Map/animation polish becomes central.
- You want lightweight open-source engine workflow.

Move to Unity if:

- 3D or advanced production needs emerge.
- Console path becomes serious.
- Team grows.
- Asset/tool ecosystem matters more than simplicity.

---

## 12. Suggested initial commands

```bash
npm create vite@latest ice-empires -- --template react-ts
cd ice-empires
npm install
npm run dev
```

---

## 13. Repo docs

Recommended docs inside repo:

```text
README.md
GAME_BIBLE.md
FIRST_12_MONTHS_PRD.md
TECH_PLAN.md
DATA_MODEL_AND_SYSTEMS.md
TASKS.md
PROGRESS_LOG.md
DECISIONS.md
```

`TASKS.md` tracks work.  
`PROGRESS_LOG.md` tracks what changed.  
`DECISIONS.md` records product/tech decisions.

---

## 14. Sources checked

- Godot official system requirements: https://docs.godotengine.org/en/stable/about/system_requirements.html
- Godot macOS download requirements: https://godotengine.org/download/macos/
- Unity official system requirements: https://docs.unity3d.com/Manual/system-requirements.html
- Vite official guide: https://vite.dev/guide/

Always re-check engine requirements before committing to a long-term engine path.


## 15. v0.2 technical implications

The data model should support the refined design without forcing the First 12 Months prototype to implement every system.

Add or reserve structures for:

- `HockeyRegion`
- `ScoutingCoverage`
- `RecruitmentInfluence`
- `PlayerProfile`
- `StaffProfile`
- `YouthCohort`
- `TeamAttributes`
- `AffiliateClub`
- `RegionOutpost`

Do not build the full systems yet unless specifically prompted.

Near-term implementation rule:

> The First 12 Months prototype can display simplified region reports and player profiles, but the naming/data model should not imply collectible-card gameplay.

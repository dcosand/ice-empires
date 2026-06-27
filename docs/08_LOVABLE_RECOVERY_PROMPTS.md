# Ice Empires — Lovable Recovery Prompts

**Date:** 2026-06-27  
**Purpose:** Focused prompts to improve the first Lovable prototype without dumping the whole bible again.

---

## 1. Current issue

The first Lovable output had useful structure:

- Top bar
- Hex map
- Resource counters
- Era/turn display
- Right-side tile panel
- Event log
- Bottom actions

But it made the Catan-style roll mechanic too central.

Desired direction:

> Civ-like monthly strategy loop: choose, build, research, explore, end month, resolve progress/events.

The Catan probability layer should be passive/later.

---

## 2. Recovery Prompt 1 — Fix the turn loop

```text
Revise the Ice Empires prototype to remove the visible dice/roll mechanic as the main gameplay loop.

The game should feel like Civilization, not Catan.

Preserve the current top bar, map area, right-side panel, bottom action bar, and event log where useful.

Replace the roll-focused turn mechanic with a monthly turn loop.

Each turn/month should let the player:
1. Review club resources.
2. Select a unit or club action.
3. Manage Club HQ decisions.
4. Choose or review build project.
5. Choose or review research project.
6. Click End Turn / End Month.
7. Resolve income, build progress, research progress, exploration, and passive events.
8. Append a monthly summary to the event log.

Remove the Roll button from the main UI.

If tile probability numbers remain, make them secondary details in the tile inspector only. They should not dominate the UI.

Acceptance criteria:
- No visible Roll button as primary action.
- End Turn resolves monthly progress.
- Event log reads like a monthly chronicle, not dice results.
- Player has meaningful choices before ending the turn.
- Prototype feels closer to Civ's opening turns.

Non-goals:
- Do not implement drafts.
- Do not implement playoffs.
- Do not implement full diplomacy.
- Do not implement multiplayer.
```

---

## 3. Recovery Prompt 2 — Improve map fantasy

```text
Revise the Ice Empires map so it feels more like a randomized Civilization-style hockey world, not an abstract hex board in space.

Preserve the hex/tile layout if useful, but make the map communicate terrain and world geography.

The map should include:
- Land and water/coastline shapes
- Tundra
- Frozen lakes
- Forest
- Mountains
- Urban regions
- Desert/dryland regions
- Fog of war
- Hockey region overlays only after discovery

The world does not need to be geographically accurate. It should be a mythic hockey world where places like Finnish Goalie Lakes or Prairie Rink Belt can appear in randomized locations.

Visual hierarchy:
1. Terrain first
2. Fog/discovery state second
3. Hockey resource/region icon third
4. Full text details in side panel, not crammed on every tile

Acceptance criteria:
- Map looks more earth-like/terrain-based.
- Fog is visually satisfying.
- Discovered tiles reveal terrain.
- Explored tiles reveal hockey region/resource info.
- Arizona Monsoon HC has a clear home tile/Club HQ marker.

Non-goals:
- Do not build procedural world generation yet.
- Do not implement perfect pathfinding.
- Do not add new gameplay systems.
```

---

## 4. Recovery Prompt 3 — Add unit movement

```text
Add simple Civilization-style unit selection and movement to the Ice Empires prototype.

The player should start with one Founding Group unit.

Founding Group:
- 2 movement points per turn
- Can move to adjacent revealed tiles
- Can reveal fog around itself
- Can found Arizona Monsoon HC on a valid tile

After the club is founded, the unit becomes club leadership and the Club HQ is created.

If Scouting Reports research is completed, allow training a Scout unit.

Scout:
- 3 movement points per turn
- Reveals fog around itself
- Can Survey Region on discovered tiles

UX requirements:
- Clicking a unit selects it.
- Possible move tiles are highlighted.
- Moving uses movement points.
- Fog reveals after movement.
- Bottom action bar updates based on selected unit.

Acceptance criteria:
- Player can select and move Founding Group.
- Founding Group can found club.
- Scout can eventually be trained/moved.
- End Turn resets movement points.

Non-goals:
- No combat.
- No complex terrain movement costs yet.
- No rival units yet.
```

---

## 5. Recovery Prompt 4 — Club HQ as city

```text
Improve the Club HQ panel so it feels like the player's capital city in Civilization.

When Arizona Monsoon HC is founded, show:
- Club name
- Era
- Leader archetype
- Monthly resource yields
- Facilities built
- Current build project
- Current research project
- Staff/prospect cards
- Era progress

Add build project selection:
- Outdoor Rink
- Equipment Shed
- Clubhouse
- Volunteer Coaching Bench

Add research selection:
- Basic Skating
- Organized Practice
- Scouting Reports
- Youth Development

Each End Turn should progress build and research.

Acceptance criteria:
- Player can choose a build.
- Player can choose research.
- Progress updates each turn.
- Completed buildings/research apply simple effects.
- Event log records completions.

Non-goals:
- No full tech tree.
- No multiple cities/clubs.
- No advanced roster management.
```

---

## 6. Recovery Prompt 5 — First 12 Months dashboard alternative

Use this if the map keeps getting in the way.

```text
Create an alternate prototype view called First 12 Months Dashboard that focuses on the opening-year game flow instead of map movement.

Keep Ice Empires, Arizona Monsoon HC, Pond Hockey Era, and the same resources.

This view should show:
- Month counter
- Club HQ summary
- Resource income
- Build project panel
- Research project panel
- Discovery priority panel
- Hidden/discovered region cards
- Staff/prospect/player cards
- Event log
- Era progress toward Club Formation Era
- End Month button

The goal is to test whether the monthly decision loop is fun before investing in the full map.

Acceptance criteria:
- Player can complete 12 months.
- Build/research/discovery all progress.
- At least 4 region cards can be revealed.
- At least 3 cards/events can appear.
- Club Formation Era can unlock.

Non-goals:
- No hex map needed in this view.
- No unit movement needed in this view.
- No draft/playoffs/diplomacy.
```

---

## 7. Visual pass prompt

```text
Do a restrained visual pass for Ice Empires.

Goal: Make the prototype feel like a premium indie 4X hockey strategy game without over-polishing.

Visual direction:
- Dark icy strategy UI
- Arizona Monsoon accents: monsoon teal, deep navy, desert orange
- Clear resource counters
- Card-driven panels
- Subtle ice/frost textures
- Strong hierarchy
- Avoid spreadsheet-heavy layouts
- Avoid cartoon kids-game look
- Avoid NHL-like branding

Improve:
- Top bar readability
- Club HQ panel
- Event log
- Cards
- End Turn button
- Arizona Monsoon identity

Do not:
- Rebuild the gameplay loop
- Add new systems
- Spend effort on final logos
- Add real NHL imagery
```

---

## 8. Recommendation

Use Lovable for visual direction, dashboards, cards, layout, and rival GM screen concepts.

Use a coding agent for game logic, data model, turn resolution, and the First 12 Months prototype.

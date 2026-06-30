# Ice Empires — Club HQ Buildings, Local Improvements & Early Map Actions

**Date:** 2026-06-29  
**Version:** 0.3  
**Status:** Definitive design direction / repo-ready  
**Purpose:** Define the difference between Club HQ buildings, local tile improvements, early map interactions, and the pre-institutional opening of Ice Empires.

---

## 1. Design summary

Ice Empires should not treat every facility as a generic building inside one giant Club HQ panel.

Facilities are split into three categories:

1. **Club HQ Buildings** — rare, expensive, institution-defining projects built at the Club HQ. They are closer to Civ wonders or district-level investments than small improvements.
2. **Local Tile Improvements** — visible improvements placed on nearby map tiles inside the club’s local footprint.
3. **Regional / Independent Relationships** — scouting, recruiting, feeder, and affiliate relationships with neutral hockey ecosystems farther away.

Short version:

> **HQ Buildings define what the club can become. Local Improvements make the map visibly change. Independents expand the club’s reach beyond home.**

---

## 2. Core design principle

The player does not begin with a professional hockey organization.

The player begins in the **Pond Hockey Era**, before organized skating, rink operations, leagues, drafts, scouting offices, or formal development systems exist.

Early actions should therefore feel pre-institutional:

- discover
- inspect
- clear
- gather
- salvage
- inspire
- mark
- practice badly
- slowly become a real club

The game should not start with advanced construction crews, professional rink staff, polished training facilities, or formal affiliate networks.

North star:

> **The player should feel like they are turning a frozen pond and a stubborn idea into a hockey civilization.**

---

## 3. Facility categories

### 3.1 Club HQ Buildings

Club HQ Buildings are major institutional projects.

They are expensive, rare, and transformative. They should unlock new verbs, systems, units, and strategic options.

They should feel like Civ wonders, capital buildings, or major organizational milestones.

Examples:

- Clubhouse
- Scouting Office
- Training Center
- Youth Academy
- Arena
- Analytics Lab
- Medical Room
- Broadcast Booth
- Hall of Fame
- Full Farm System Headquarters

### 3.2 Local Tile Improvements

Local Tile Improvements are built on nearby tiles within the club’s local footprint.

They visually change the map and make terrain matter.

Examples:

- Cleared Pond
- Makeshift Practice Ice
- Outdoor Rink
- Floodlit Outdoor Rink
- Local Notice Board
- Equipment Cache
- Dryland Training Lot
- Community Hockey Program
- Sponsor Signage

### 3.3 Regional / Independent Relationships

Regional relationships are not ordinary buildings.

They represent scouting coverage, recruitment influence, feeder relationships, and affiliates with neutral hockey ecosystems.

Examples:

- Scouting Network
- Recruiting Pipeline
- Development Partnership
- Feeder Relationship
- Junior Affiliate
- Minor Affiliate

These belong to the Independents system, not the local HQ building list.

---

## 4. Terrain decision: Pond is first-class terrain

Pond should be a first-class base terrain type, not a decorative overlay.

The opening fantasy depends on ponds being gameplay-bearing.

Recommended type direction:

```ts
type WorldTerrain =
  | "water"
  | "mountain"
  | "ice"
  | "pond"
  | "plains"
  | "coastal"
  | "tropical"
  | "desert"
  | "high-desert";
```

Clarification:

- **water** = ocean / deep water / not normally passable early
- **mountain** = impassable peaks
- **ice** = snowfield / glacial / frozen ground biome
- **pond** = small skateable/buildable water body and future rink site
- **plains** = open grassland / general land
- **coastal** = beach / shoreline terrain
- **tropical** = jungle/green growth terrain
- **desert** = dunes / dryland
- **high-desert** = mesa / badlands

Do not model “frozen pond” as a separate base terrain.

Instead:

```ts
type PondSurfaceState = "frozen" | "thin-ice" | "open-water";

type Tile = {
  terrain: WorldTerrain;
  surfaceState?: PondSurfaceState;
};
```

For the current game, ponds can default to `surfaceState: "frozen"`.

Later, seasonal freezing/thawing can matter.

Decision:

> **Pond is the terrain. Frozen is the state.**

---

## 5. Tile model

Each map tile should be understood as layered information.

### 5.1 Base terrain

The physical ground or surface.

Examples:

- pond
- ice
- plains
- desert
- high-desert
- coastal
- water
- mountain

### 5.2 Feature overlay

A natural modifier or connective feature.

Examples:

- river
- shoreline
- seasonal freeze
- trail/road later

### 5.3 Standing object

A visible thing on the tile that the player can interact with.

Examples:

- grove
- pine stand
- palm grove
- cacti
- rocks
- ice shards
- scrap pile
- old shed
- local rumor marker
- empty lot
- community marker
- schoolyard
- frozen net

### 5.4 Hockey layer

The club-created or hockey-specific meaning.

Examples:

- Club HQ
- Cleared Pond
- Makeshift Practice Ice
- Outdoor Rink
- Local Notice Board
- Scouting Network marker
- Recruiting Pipeline marker
- Independent marker
- Rival influence marker

This layered model keeps terrain simple while making the map feel full of verbs.

---

## 6. Early game interaction philosophy

Polytopia is a useful reference because the player can immediately see and interact with objects on the map.

Ice Empires should learn from that, but not copy its speed or tone.

The early Ice Empires lesson is not:

> Build a complete improvement immediately.

The correct lesson is:

> Interact with visible things immediately.

The first few turns should include map objects that clearly invite action:

- a frozen pond to inspect or clear
- a grove to gather from
- a scrap pile to salvage
- a local rumor to investigate
- a community marker to inspire
- rough ice to mark for practice

The player should be able to create at least one visible map change very early, even if it is humble.

---

## 7. Starting unit: Founding Group

The player starts with the **Founding Group** only.

The Founding Group represents the owner / GM / coach / parents / local believers / stubborn dreamers trying to make hockey exist.

It is not a professional construction crew.

### Founding Group actions

| Action | Target | Result |
|---|---|---|
| Move | Adjacent passable tile | Reveals nearby fog |
| Found Club HQ | Valid land tile | Creates Arizona Monsoon / player club |
| Inspect Pond | Pond tile | Reveals pond quality / future rink potential |
| Clear Snow | Frozen pond tile | Creates Cleared Pond state |
| Gather Stickwood | Grove/tree object | Gains Operations or Primitive Stickmaking progress |
| Salvage Scrap | Old shed/scrap pile | Gains Operations or equipment progress |
| Inspire Locals | Community/rumor marker | Gains Reputation, volunteers, or event |
| Mark Practice Area | Cleared Pond | Creates earliest practice site once appropriate |

The Founding Group should provide early interaction without pretending the club is already operationally mature.

---

## 8. Early improvement progression

The first rink should not appear instantly.

Recommended progression:

### Stage 0 — Natural Pond

A first-class pond terrain tile.

Possible states:

- frozen
- thin ice
- open water later

Early value:

- can be inspected
- can be cleared
- can become hockey infrastructure later

### Stage 1 — Cleared Pond

Created when the Founding Group clears snow from a frozen pond.

Effect:

- visible map change
- small Operations reward
- enables primitive practice events
- can support Basic Skating progress

### Stage 2 — Makeshift Practice Ice

A crude practice surface.

Requires one or more of:

- Cleared Pond
- Basic Skating in progress or completed
- Gathered materials
- local volunteers

Effect:

- improves Skating development
- small Hockey Knowledge gain
- unlocks practice stories/events
- may reveal raw local players

### Stage 3 — Outdoor Rink

The first real local hockey improvement.

Requires one or more of:

- Makeshift Practice Ice
- Basic Skating
- Primitive Stickmaking
- Frozen Surface Maintenance
- Operations cost

Effect:

- +Operations/month
- unlocks scrimmage / tryout events
- supports Local Coach or Volunteer Trainer events
- visibly appears on the tile

### Stage 4 — Floodlit Outdoor Rink

A more formal upgrade.

Requires:

- Outdoor Rink
- relevant tech/facility
- Operations/Budget cost

Effect:

- more practice capacity
- more Reputation
- better local recruitment
- night practice / community events

---

## 9. Club HQ responsibilities

The Club HQ should not magically build every map improvement.

HQ is the institutional center. It should focus on big organizational choices.

Recommended HQ monthly focus options:

| Focus | Meaning |
|---|---|
| Build HQ Facility | Progress major HQ building/wonder |
| Train Unit | Produce Scouts, Recruiters, Volunteers, etc. when unlocked |
| Train Players | Improve team attributes / player development |
| Run Tryouts | Reveal or recruit local player profiles |
| Fundraise | Gain Budget / sponsor events |
| Organize Club | Improve morale, reputation, unlock local events |

Research can run separately as a Civ-style Hockey Knowledge project.

Tile improvements should mostly be created by units or direct map actions, not by HQ-only menu clicks.

---

## 10. Early unit progression

Do not start with Rink Crew.

Rink Crew implies a level of operational maturity the club should not have yet.

Recommended unit progression:

| Unit | Unlock timing | Role |
|---|---|---|
| Founding Group | Start | Found HQ, inspect, clear, gather, salvage, inspire |
| Local Volunteers | Early event / Inspire Locals / Club HQ | Help clear, gather, assist primitive improvements |
| Scout | Early research or HQ action | Explore fog, discover Independents, first contact |
| Recruiter | Local Recruitment tech | Build Relationship Influence and run tryouts |
| Regional Scout | Scouting Office / later era | Establish Scouting Coverage networks |
| Development Coach / Envoy | Organized Practice / Youth Development | Improve training, youth clinics, development partnerships |
| Rink Crew | Frozen Surface Maintenance / Outdoor Rink / Club Formation | Maintain and upgrade rink infrastructure |

This progression preserves the fiction that the club is learning how to become organized.

---

## 11. Club HQ Buildings as wonders

Club HQ Buildings should be limited, expensive, and highly meaningful.

They should unlock capabilities rather than merely adding small passive yields.

### Design rules

HQ Buildings should:

- Be expensive relative to the era
- Take meaningful time to complete
- Unlock new verbs/systems/units
- Create strategic identity
- Feel like institutional milestones
- Be few enough that choosing one matters
- Visibly appear in the HQ panel and possibly on the map/HQ tile

HQ Buildings should not:

- Be spammed every few turns
- Provide only tiny passive bonuses
- Replace local tile improvements
- Make the map irrelevant
- Feel like a generic city building list from Civ with hockey labels

---

## 12. Example HQ Buildings by era

### Pond Hockey Era / Early Club Formation

| HQ Building | Role |
|---|---|
| Clubhouse | Identity, morale, reputation, local organization |
| Equipment Room | Basic equipment, tryouts, player readiness |
| Volunteer Coaching Bench | Hockey Knowledge, practice structure |
| Local Office | Fundraising, organizing, basic admin |

### Club Formation Era

| HQ Building | Role |
|---|---|
| Training Center | Player development, team attributes |
| Scouting Office | Scout training, Scouting Coverage reports |
| Youth Academy | Youth cohorts, long-term development |
| Medical Room | Injury mitigation, player availability |

### Regional League Era

| HQ Building | Role |
|---|---|
| Small Arena | Budget, home ice, tournaments |
| Broadcast Booth | Reputation/Budget from games |
| Team Identity Hall | Morale, fan culture, rivalry boost |
| League Operations Room | league proposals, rules, schedules |

### Scouting Network / Draft-Rights Era

| HQ Building | Role |
|---|---|
| Analytics Lab | hidden traits, market inefficiencies |
| Player Development Center | prospect growth, development slots |
| Agent Relations Office | signings, rights, negotiations |
| Affiliate Operations Desk | manage feeder/affiliate relationships |

### Professionalization / Dynasty Era

| HQ Building | Role |
|---|---|
| Sports Science Center | advanced development, injury prevention |
| Global Scouting Bureau | distant regions, global talent |
| Full Farm System Headquarters | multiple affiliates, assignments |
| Hall of Fame | legacy, prestige, dynasty victory |
| Mega Arena | major Budget/Reputation engine |

---

## 13. Unique HQ building per club

Each playable club should have at least one unique HQ building/wonder.

This gives every club a special identity and a reason to play differently.

### Arizona Monsoon unique building

#### Desert Ice Initiative

**Era:** Early Club Formation / possibly Pond Hockey if tuned carefully  
**Type:** Unique HQ Building  
**Theme:** Nontraditional hockey growth in a desert market

Possible effects:

- Desert and high-desert tiles can support certain hockey improvements earlier.
- Gain bonus Reputation when improving nontraditional hockey terrain.
- Improve Relationship Influence with nontraditional Independents.
- Unlocks special events around parking-lot skating, desert tryouts, and stubborn local believers.
- Reduces cost of dryland training or cooling-related improvements.

Flavor:

> “Everyone said the desert would never grow hockey. The club wrote that down as a challenge.”

### Other club examples

| Club archetype | Unique HQ Building | Possible effect |
|---|---|---|
| Helsinki-style cold tactical club | Northern Goalie School | Better goalie discovery/development |
| Calgary-style foothills club | Prairie Barn Network | Stronger rural/rink-belt influence |
| Stockholm-style development club | Coastal Development Campus | Better youth/skill development |
| Halifax-style maritime club | Grit Harbor Clubhouse | Better physicality/morale in tournaments |
| Prague-style diplomatic club | Transfer Embassy | Better negotiation and cross-region recruiting |

---

## 14. Local Tile Improvements

Local improvements should be visible on the map.

They are how the player sees their club footprint grow.

### Example local improvements

| Improvement | Built on / from | Requires | Effect |
|---|---|---|---|
| Cleared Pond | frozen pond | Founding Group action | visible change, primitive practice potential |
| Makeshift Practice Ice | Cleared Pond | Basic Skating progress / materials | Skating practice, small Knowledge |
| Outdoor Rink | Makeshift Practice Ice | Basic Skating + Operations | +Operations, tryout/scrimmage events |
| Floodlit Outdoor Rink | Outdoor Rink | tech/building | +Reputation, more practice capacity |
| Local Notice Board | passable land near HQ | Club organization / volunteers | tryout/recruitment events |
| Equipment Cache | old shed/scrap | salvaged materials | supports player readiness |
| Dryland Training Lot | desert/high-desert/plains | Organized Practice | Skating/conditioning development |
| Community Hockey Program | settlement/community marker | Reputation / Recruiter | local influence, youth events |
| Sponsor Signage | urban/community/sponsor marker | Fundraising | +Budget |

If the game does not yet have urban/suburb terrain, do not force those into base terrain. Use standing objects, tags, or region context instead.

---

## 15. Club Footprint

The player should visually see local expansion without founding extra cities.

Recommended concept:

> **Club Footprint** = the local developed area around Club HQ where the club can build and improve tiles.

Club Footprint can expand through:

- HQ buildings
- Reputation
- Outdoor Rink / local improvements
- Community events
- Clubhouse
- local programs

Club Footprint is different from Independent Pipeline Influence.

| Concept | Where it applies | Meaning |
|---|---|---|
| Club Footprint | Around HQ | local operational/development area |
| Pipeline Influence | Independents/regions | relationship pull and feeder access |

This avoids confusing local borders with far-away affiliate relationships.

---

## 16. Early turn target

The first 5–10 turns should let the player do visible things.

A strong opening could look like:

1. Founding Group reveals nearby fog.
2. Player sees frozen pond, grove, scrap pile, and local rumor marker.
3. Founding Group inspects pond.
4. Founding Group clears snow, creating Cleared Pond.
5. Founding Group gathers stickwood or salvages scrap.
6. Club HQ is founded.
7. HQ chooses first focus: Fundraise, Organize Club, or Train Players.
8. Basic Skating research starts.
9. Cleared Pond becomes Makeshift Practice Ice.
10. First Scout or Local Volunteer unlock appears.

The player should feel:

> “I have already changed the map, and this tiny hockey dream is becoming real.”

---

## 17. Acceptance criteria for implementation

A good implementation of this system should satisfy:

- Pond exists as first-class terrain.
- The renderer visually distinguishes pond from ice/snowfield terrain.
- Starting area includes visible early interactables.
- Founding Group has primitive map actions.
- Player can create a visible map change within the first few turns.
- Outdoor Rink is not available immediately without prerequisites.
- Rink Crew is not a starting unit.
- HQ Buildings are separated from Local Tile Improvements in UI and data.
- HQ Buildings unlock capabilities, not only small yields.
- Local Tile Improvements are built through unit/map actions.
- Club Footprint is visually distinct from Independent/Pipeline Influence.

---

## 18. Data model sketch

```ts
type FacilityCategory = "hq-building" | "local-improvement" | "regional-relationship";

type HQBuilding = {
  id: string;
  name: string;
  category: "hq-building";
  eraId: string;
  cost: Partial<ResourceSet>;
  buildMonths: number;
  prerequisites?: Prerequisite[];
  effects: FacilityEffect[];
  unlocks?: Unlock[];
  uniqueToClubId?: string;
  flavor: string;
};

type LocalImprovement = {
  id: string;
  name: string;
  category: "local-improvement";
  validTerrains: WorldTerrain[];
  requiredTileStates?: string[];
  requiredObjects?: string[];
  requiredTechIds?: string[];
  builtByUnitTypes: UnitType[];
  cost?: Partial<ResourceSet>;
  buildTurns?: number;
  effects: ImprovementEffect[];
  nextUpgradeId?: string;
  visualAssetId: string;
  flavor: string;
};

type Tile = {
  id: string;
  x: number;
  y: number;
  terrain: WorldTerrain;
  surfaceState?: "frozen" | "thin-ice" | "open-water";
  featureOverlay?: TileFeature[];
  standingObjects: StandingObject[];
  improvementId?: string;
  clubFootprintByClubId?: Record<string, number>;
};
```

---

## 19. Example definitions

### Pond terrain

```ts
const pondTile = {
  terrain: "pond",
  surfaceState: "frozen",
  standingObjects: [],
};
```

### Cleared Pond improvement

```ts
const clearedPond = {
  id: "cleared-pond",
  name: "Cleared Pond",
  category: "local-improvement",
  validTerrains: ["pond"],
  requiredTileStates: ["frozen"],
  builtByUnitTypes: ["founding-group", "local-volunteers"],
  cost: { operations: 0 },
  buildTurns: 1,
  effects: [
    { type: "addResource", resource: "operations", amount: 1 },
    { type: "unlockTileAction", actionId: "mark-practice-area" }
  ],
  nextUpgradeId: "makeshift-practice-ice",
  visualAssetId: "improvement-cleared-pond",
  flavor: "Someone found a shovel. This counts as infrastructure."
};
```

### Outdoor Rink improvement

```ts
const outdoorRink = {
  id: "outdoor-rink",
  name: "Outdoor Rink",
  category: "local-improvement",
  validTerrains: ["pond"],
  requiredTileStates: ["frozen"],
  requiredTechIds: ["basic-skating"],
  builtByUnitTypes: ["local-volunteers", "rink-crew"],
  cost: { operations: 12 },
  buildTurns: 3,
  effects: [
    { type: "monthlyIncome", resource: "operations", amount: 2 },
    { type: "unlockEventPool", eventPoolId: "local-tryouts" }
  ],
  nextUpgradeId: "floodlit-outdoor-rink",
  visualAssetId: "improvement-outdoor-rink",
  flavor: "It is not much, but it is ice. And ice is enough."
};
```

### Arizona unique HQ building

```ts
const desertIceInitiative = {
  id: "desert-ice-initiative",
  name: "Desert Ice Initiative",
  category: "hq-building",
  uniqueToClubId: "arizona-monsoon",
  eraId: "pond-hockey",
  cost: { budget: 8, operations: 18, reputation: 4 },
  buildMonths: 4,
  prerequisites: [
    { type: "techCompleted", techId: "basic-skating" }
  ],
  effects: [
    { type: "terrainImprovementDiscount", terrain: "desert", amount: 2 },
    { type: "relationshipBonus", tag: "nontraditional", amount: 10 },
    { type: "reputationOnNontraditionalImprovement", amount: 1 }
  ],
  unlocks: [
    { type: "eventPool", id: "desert-hockey-believers" }
  ],
  flavor: "Everyone said the desert would never grow hockey. The club wrote that down as a challenge."
};
```

---

## 20. UI guidance

The UI should clearly separate:

- HQ Buildings
- Local Improvements
- Unit Actions
- Independent Relationships

Recommended panels:

### Club HQ panel

Shows:

- Current HQ focus
- HQ building project
- completed HQ buildings
- available institutional actions
- unique club building/wonder

### Tile inspector

Shows:

- terrain
- surface state
- standing objects
- current improvement
- available unit actions
- possible upgrades

### Unit action bar

Shows selected unit verbs:

- Move
- Inspect Pond
- Clear Snow
- Gather Stickwood
- Salvage Scrap
- Inspire Locals
- Build/Upgrade improvement when unlocked

### Improvement preview

Shows:

- what will appear visually
- build time
- cost
- required tech
- expected effect

---

## 21. Design guardrails

- Do not let the HQ building list become the whole game.
- Do not let local improvements appear only in abstract panels.
- Do not start with advanced construction units.
- Do not allow Outdoor Rink before the club has earned basic hockey knowledge.
- Do not confuse ice terrain with pond terrain.
- Do not add urban/suburb as base terrain unless the generator truly needs it.
- Use standing objects/tags for settlement flavor first.
- Make the first visible map change happen early.
- Make HQ buildings rare and meaningful.
- Let units create local improvements.

---

## 22. Recommended next implementation sequence

1. Promote Pond to first-class terrain.
2. Render Pond differently from Ice.
3. Add surfaceState to pond tiles, defaulting to frozen.
4. Place early interactable standing objects near the starting area.
5. Add Founding Group primitive actions.
6. Implement Cleared Pond as the first visible local improvement.
7. Add Makeshift Practice Ice as a follow-up improvement.
8. Gate Outdoor Rink behind Basic Skating / early requirements.
9. Split facility data into HQ Buildings and Local Improvements.
10. Add Club HQ monthly focus options.
11. Add Local Volunteers later.
12. Add Rink Crew only after the club has real rink operations.

---

## 23. One-line north star

> **Ice Empires should begin with a frozen pond, a stubborn founding group, and visible map actions that slowly turn rough ice into a hockey civilization.**

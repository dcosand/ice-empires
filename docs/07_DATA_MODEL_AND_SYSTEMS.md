# Ice Empires — Data Model & Systems

**Date:** 2026-06-27  
**Purpose:** Suggested data/system architecture for coding agents.

---

## 1. Core principle

Keep game content as data and game rules in engine modules.

Good:

- Facility definitions in `data/facilities.ts`
- Turn resolution in `engine/turnResolution.ts`
- UI renders state and dispatches actions

Bad:

- Build rules hard-coded inside a React button
- Research effects scattered across components
- Event logic buried in JSX

---

## 2. Core types

```ts
type ResourceSet = {
  budget: number;
  operations: number;
  hockeyKnowledge: number;
  reputation: number;
  talent?: number;
};

type GameState = {
  phase: "landing" | "founding" | "playing" | "complete";
  month: number;
  maxMonths: number;
  eraId: string;
  club: ClubState | null;
  resources: ResourceSet;
  facilities: string[];
  completedResearch: string[];
  activeBuild: ActiveBuild | null;
  activeResearch: ActiveResearch | null;
  discovery: DiscoveryState;
  cards: GameCard[];
  eventLog: GameEventLogEntry[];
  unlocks: UnlockState;
  victoryProgress: VictoryProgress;
};
```

---

## 3. Club model

```ts
type ClubState = {
  id: string;
  name: string;
  cityRegion: string;
  leaderArchetype: string;
  philosophy: string;
  startingBonusId: string;
  monthlyBaseIncome: ResourceSet;
  identityText: string;
};
```

Default club:

```ts
const arizonaMonsoon = {
  id: "arizona-monsoon",
  name: "Arizona Monsoon HC",
  cityRegion: "Arizona",
  leaderArchetype: "Desert Visionary",
  philosophy: "Nontraditional hockey growth",
  startingBonusId: "nontraditional-market",
  monthlyBaseIncome: {
    budget: 2,
    operations: 3,
    hockeyKnowledge: 1,
    reputation: 1,
  },
  identityText: "A storm is gathering in the desert. There is no arena, no league, no pipeline — just ice, stubbornness, and belief.",
};
```

---

## 4. Facility model

```ts
type Facility = {
  id: string;
  name: string;
  description: string;
  cost: Partial<ResourceSet>;
  buildMonths: number;
  effects: FacilityEffect[];
  unlocks?: Unlock[];
  flavor: string;
  eraId: string;
};

type ActiveBuild = {
  facilityId: string;
  monthsRemaining: number;
  progressMonths: number;
};
```

Example:

```ts
const outdoorRink = {
  id: "outdoor-rink",
  name: "Outdoor Rink",
  cost: { operations: 20 },
  buildMonths: 3,
  effects: [{ type: "monthlyIncome", resource: "operations", amount: 2 }],
  unlocks: [{ type: "cardPool", id: "local-coach" }],
  flavor: "It is not much, but it is ice. And ice is enough.",
  eraId: "pond-hockey",
};
```

---

## 5. Research model

```ts
type ResearchTech = {
  id: string;
  name: string;
  description: string;
  cost: number;
  requiredTechIds?: string[];
  effects: TechEffect[];
  unlocks?: Unlock[];
  flavor: string;
  eraId: string;
};

type ActiveResearch = {
  techId: string;
  knowledgeRemaining: number;
  progressKnowledge: number;
};
```

Early techs:

- Basic Skating
- Organized Practice
- Scouting Reports
- Youth Development
- Goaltending Theory

Decision to make: should Hockey Knowledge be stored/spent or science-per-turn progress? Civ-like answer is science-per-turn. Simpler prototype answer can be either, but record it.

---

## 6. Region model

```ts
type Region = {
  id: string;
  name: string;
  terrain: TerrainType;
  discoveryState: "hidden" | "rumored" | "discovered" | "surveyed";
  hockeyResource?: HockeyResource;
  scoutingDifficulty: number;
  potentialYields: Partial<ResourceSet>;
  tags: string[];
  scoutReport: string;
  unusual?: boolean;
  eventTableId?: string;
};
```

Example:

```ts
const desertExpansionZone = {
  id: "desert-expansion-zone",
  name: "Desert Expansion Zone",
  terrain: "dryland",
  discoveryState: "hidden",
  hockeyResource: {
    id: "untapped-fanbase",
    name: "Untapped Fanbase",
    effect: { reputation: 1 },
  },
  scoutingDifficulty: 2,
  potentialYields: { reputation: 1 },
  tags: ["nontraditional", "warm-market", "unusual"],
  scoutReport: "The ice is expensive, but the believers are intense.",
  unusual: true,
};
```

---

## 7. Card model

```ts
type GameCard = StaffCard | ProspectCard | PlayerCard | RegionBonusCard;

type StaffCard = {
  type: "staff";
  id: string;
  name: string;
  role: string;
  effects: CardEffect[];
  flavor: string;
};

type ProspectCard = {
  type: "prospect";
  id: string;
  name: string;
  position: "F" | "D" | "G";
  age: number;
  currentAbility: number | "unknown";
  potentialRange: [number, number];
  scoutingConfidence: number;
  developmentRisk: "low" | "medium" | "high" | "unknown";
  traits: string[];
  regionId?: string;
  flavor: string;
};
```

---

## 8. Event model

```ts
type GameEvent = {
  id: string;
  title: string;
  description: string;
  trigger: EventTrigger;
  effects: EventEffect[];
  weight?: number;
  tags?: string[];
};

type GameEventLogEntry = {
  month: number;
  title: string;
  message: string;
  type: "resource" | "build" | "research" | "discovery" | "card" | "era" | "rival" | "flavor";
};
```

Trigger examples:

- monthly
- facility completed
- research completed
- region discovered
- era progress

Effect examples:

- add resource
- add card
- discover region
- unlock action
- log message

---

## 9. Reducer actions

```ts
type GameAction =
  | { type: "START_GAME" }
  | { type: "FOUND_CLUB"; clubId: string }
  | { type: "SELECT_BUILD"; facilityId: string }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "SELECT_DISCOVERY_PRIORITY"; priorityId: string }
  | { type: "END_MONTH" }
  | { type: "DISMISS_MODAL" };
```

---

## 10. End-month resolver

```ts
function endMonth(state: GameState): GameState {
  let next = clone(state);

  next.month += 1;

  const income = calculateMonthlyIncome(next);
  next.resources = addResources(next.resources, income);
  logIncome(next, income);

  progressBuild(next);
  progressResearch(next);
  resolveDiscovery(next);
  triggerMonthlyEvent(next);
  checkEraProgress(next);

  return next;
}
```

Important:

- Make it deterministic enough to debug.
- Random events are okay, but should be controlled.
- Every month should produce at least one meaningful log entry.

---

## 11. Build system

Flow:

1. Player selects facility.
2. Validate resources.
3. Deduct cost or reserve cost.
4. Set active build.
5. Each month decrement remaining months.
6. On completion: add facility, apply effects, add unlocks, log event.

Recommendation: pay cost upfront in first prototype.

---

## 12. Research system

Flow:

1. Player selects tech.
2. Set active research.
3. Each month apply Hockey Knowledge progress.
4. On completion: add completed tech, apply unlocks, log event.

Decide whether Hockey Knowledge is stored or science-per-turn and record in `DECISIONS.md`.

---

## 13. Discovery system

First 12 Months uses region cards.

Discovery states:

- Hidden
- Rumored
- Discovered
- Surveyed

Discovery priorities:

- Survey Nearby Ice
- Follow Prospect Rumor
- Listen to Local Rinks
- Study Strange Hockey Culture
- Build Relationships

Arizona Monsoon bonus:

- If discovering a region tagged unusual/nontraditional, gain +1 Reputation and log it.

---

## 14. Era system

Club Formation Era requirements:

- Club HQ founded
- Outdoor Rink completed
- One research completed
- Two regions discovered
- First staff/prospect/player card acquired

If all met:

- Set era to Club Formation
- Show modal
- Log entry

Do not implement full Club Formation Era yet.

---

## 15. Selectors

Useful derived selectors:

- `getMonthlyIncome(state)`
- `getAvailableFacilities(state)`
- `getAvailableResearch(state)`
- `getDiscoveredRegions(state)`
- `getEraProgress(state)`
- `getActiveBuildProgress(state)`
- `getActiveResearchProgress(state)`
- `getUnlockedActions(state)`

---

## 16. Decisions to record

Create `DECISIONS.md` and record:

- Is Hockey Knowledge stored or science-per-turn?
- Are build costs paid upfront?
- Are discovery results random or deterministic?
- Are cards unique?
- Does Month 12 end automatically or continue?
- What counts as “recruited”?
- How do facility effects stack?

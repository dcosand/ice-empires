# Ice Empires — Data Model & Systems

**Date:** 2026-06-27  
**Version:** 0.2  
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
  profiles: GameProfile[];
  teamAttributes: TeamAttributes;
  regionInfluence: RegionInfluenceState;
  affiliates: AffiliateClub[];
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
  name: "Arizona Monsoon",
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

## 6. Hockey region model

Hockey Regions are neutral city-state-like ecosystems.

They are not rival clubs. They are discoverable, scoutable, influenceable, contestable, and capable of producing players, staff, resources, and pipeline opportunities.

```ts
type HockeyRegion = {
  id: string;
  name: string;
  terrain: TerrainType;
  discoveryState: "hidden" | "terrain-discovered" | "region-identified" | "scouted" | "influenced" | "networked";
  hockeyResource?: HockeyResource;
  scoutingDifficulty: number;
  scoutingCoverageByClub: Record<string, number>; // 0-100
  recruitmentInfluenceByClub: Record<string, number>; // 0-100
  potentialYields: Partial<ResourceSet>;
  playerOutputs: PlayerOutputProfile[];
  staffOutputs?: StaffOutputProfile[];
  outpostSlots?: RegionOutpostSlot[];
  tags: string[];
  scoutReport: string;
  unusual?: boolean;
  eventTableId?: string;
};

type PlayerOutputProfile = {
  role: "forward" | "defense" | "goalie" | "depth" | "specialist";
  ageRange: [number, number];
  rarity: "common" | "uncommon" | "rare" | "legendary";
  traitHints: string[];
};
```

Example:

```ts
const frozenSuburb: HockeyRegion = {
  id: "frozen-suburb",
  name: "Frozen Suburb",
  terrain: "urban-winter",
  discoveryState: "hidden",
  hockeyResource: {
    id: "local-rink-culture",
    name: "Local Rink Culture",
    effect: { reputation: 1 },
  },
  scoutingDifficulty: 2,
  scoutingCoverageByClub: {},
  recruitmentInfluenceByClub: {},
  potentialYields: { reputation: 1 },
  playerOutputs: [
    { role: "forward", ageRange: [18, 23], rarity: "common", traitHints: ["local", "high-motor"] },
    { role: "defense", ageRange: [18, 24], rarity: "uncommon", traitHints: ["responsible", "physical"] },
    { role: "goalie", ageRange: [18, 25], rarity: "rare", traitHints: ["late-bloomer"] },
  ],
  staffOutputs: [{ role: "local-coach", rarity: "common" }],
  tags: ["suburban", "rink-density", "reliable"],
  scoutReport: "Every third garage has a net with no mesh.",
};
```

## 7. People/profile model

Avoid collectible-card language in product/design docs and UI copy.

Use:

- StaffProfile
- ProspectProfile
- PlayerProfile
- RegionReport
- ScoutReport
- Dossier

```ts
type GameProfile = StaffProfile | ProspectProfile | PlayerProfile | RegionReport | YouthCohort;

type StaffProfile = {
  type: "staff";
  id: string;
  name: string;
  role: string;
  effects: ProfileEffect[];
  flavor: string;
};

type ProspectProfile = {
  type: "prospect";
  id: string;
  name: string;
  position: "F" | "D" | "G";
  age: number;
  currentAbility: number | "unknown";
  potentialRange: [number, number];
  scoutingConfidence: number;
  recruitmentStatus: "unknown" | "interested" | "committed" | "rival-leaning" | "signed";
  developmentRisk: "low" | "medium" | "high" | "unknown";
  traits: string[];
  regionId?: string;
  rivalInterest?: string[];
  flavor: string;
};

type PlayerProfile = ProspectProfile & {
  type: "player";
  rosterStatus: "main-roster" | "depth" | "affiliate" | "rights-held" | "injured";
  teamAttributeContributions: Partial<TeamAttributes>;
};

type YouthCohort = {
  type: "youth-cohort";
  id: string;
  regionId?: string;
  ageRange: [number, number];
  size: number;
  developmentFocus?: keyof TeamAttributes;
  maturityTurnsRemaining: number;
  flavor: string;
};
```

### Player aging rule

Because 1 turn = 1 month, individual teenagers can take years to become playable.

Early eras should focus on adult amateurs and 18–23-year-old local players. Younger talent should be represented as Youth Cohorts until Scouting Network / Draft/Rights systems are unlocked.

## 8. Team attributes, recruitment, and affiliates

### TeamAttributes

```ts
type TeamAttributes = {
  skating: number;
  puckSkill: number;
  scoring: number;
  defense: number;
  goaltending: number;
  physicality: number;
  tactics: number;
  chemistry: number;
  morale: number;
  powerPlay?: number;
  penaltyKill?: number;
  transitionGame?: number;
  possession?: number;
  discipline?: number;
  depth?: number;
  injuryResilience?: number;
};
```

Team strength is derived from Team Attributes, not stored as one generic visible currency.

### ScoutingCoverage and RecruitmentInfluence

```ts
type RegionInfluenceState = {
  byRegionId: Record<string, {
    scoutingCoverageByClub: Record<string, number>;
    recruitmentInfluenceByClub: Record<string, number>;
    controllingPipelineClubId?: string;
    contestedByClubIds: string[];
  }>;
};
```

Scouting Coverage reveals what is there. Recruitment Influence converts the region into a pipeline.

### Affiliates

```ts
type AffiliateClub = {
  id: string;
  name: string;
  regionId?: string;
  level: "informal" | "junior" | "minor" | "farm" | "global";
  developmentSlots: number;
  activePlayerIds: string[];
  monthlyEffects: Partial<TeamAttributes & ResourceSet>;
  unlockedByTechId?: string;
};
```

Affiliate progression:

- Club Formation: informal youth clinic / local development nights.
- Regional League: partner club or shared practice relationship.
- Scouting Network: junior/minor affiliate level 1.
- Draft/Rights: formal prospect assignment.
- Professionalization: full farm system.
- Dynasty: global affiliate network.

## 9. Event model

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

## 10. Reducer actions

```ts
type GameAction =
  | { type: "START_GAME" }
  | { type: "FOUND_CLUB"; clubId: string }
  | { type: "SELECT_BUILD"; facilityId: string }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "SELECT_DISCOVERY_PRIORITY"; priorityId: string }
  | { type: "ASSIGN_UNIT_TO_REGION"; unitId: string; regionId: string }
  | { type: "ESTABLISH_RECRUITMENT_INFLUENCE"; regionId: string }
  | { type: "END_MONTH" }
  | { type: "DISMISS_MODAL" };
```

---

## 11. End-month resolver

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
  updateScoutingCoverage(next);
  updateRecruitmentInfluence(next);
  updateTeamAttributes(next);
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

## 12. Build system

Flow:

1. Player selects facility.
2. Validate resources.
3. Deduct cost or reserve cost.
4. Set active build.
5. Each month decrement remaining months.
6. On completion: add facility, apply effects, add unlocks, log event.

Recommendation: pay cost upfront in first prototype.

---

## 13. Research system

Flow:

1. Player selects tech.
2. Set active research.
3. Each month apply Hockey Knowledge progress.
4. On completion: add completed tech, apply unlocks, log event.

Decide whether Hockey Knowledge is stored or science-per-turn and record in `DECISIONS.md`.

---

## 14. Discovery system

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

## 15. Era system

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

## 16. Selectors

Useful derived selectors:

- `getMonthlyIncome(state)`
- `getAvailableFacilities(state)`
- `getAvailableResearch(state)`
- `getDiscoveredRegions(state)`
- `getHockeyRegionReports(state)`
- `getScoutingCoverage(state, regionId)`
- `getRecruitmentInfluence(state, regionId, clubId)`
- `getTeamAttributes(state)`
- `getAffiliateSlots(state)`
- `getEraProgress(state)`
- `getActiveBuildProgress(state)`
- `getActiveResearchProgress(state)`
- `getUnlockedActions(state)`

---

## 17. Decisions to record

Create `DECISIONS.md` and record:

- Is Hockey Knowledge stored or science-per-turn?
- Are build costs paid upfront?
- Are discovery results random or deterministic?
- Are profiles unique?
- Does Month 12 end automatically or continue?
- What counts as “recruited”?
- How do facility effects stack?


## 18. v0.2 implementation guardrails

For the First 12 Months prototype, it is acceptable to simplify:

- Region reports can be displayed as UI panels without true map movement.
- Recruitment Influence can be a placeholder value or future-facing field.
- Team Attributes can start with only Skating, Puck Skill, Goaltending, Chemistry, and Morale.
- Affiliates should exist in the model but should not be playable until later eras.

Do not introduce collectible-card mechanics.

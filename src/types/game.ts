// Ice Empires — shared types.
// Content lives in /data, rules live in /engine, UI renders this state.

export type ResourceKey =
  | "budget"
  | "operations"
  | "hockeyKnowledge"
  | "reputation";

export type ResourceSet = {
  budget: number;
  operations: number;
  hockeyKnowledge: number;
  reputation: number;
};

export type Phase = "landing" | "founding" | "playing" | "complete";

// ---------------------------------------------------------------------------
// Club
// ---------------------------------------------------------------------------

export type ClubDef = {
  id: string;
  name: string;
  cityRegion: string;
  leaderArchetype: string;
  philosophy: string;
  startingBonusId: string;
  startingResources: ResourceSet;
  monthlyBaseIncome: ResourceSet;
  identityText: string;
  foundingFlavor: string;
};

// ---------------------------------------------------------------------------
// Facilities (build projects)
// ---------------------------------------------------------------------------

export type FacilityEffect =
  | { type: "monthlyIncome"; resource: ResourceKey; amount: number }
  | { type: "unlockRecruitment" }
  | { type: "improveRecruitmentEvents" };

export type Unlock =
  | { type: "card"; cardId: string }
  | { type: "cardPool"; poolId: string }
  | { type: "deeperDiscovery" }
  | { type: "prospectGeneration" }
  | { type: "goalieEvents" };

export type FacilityDef = {
  id: string;
  name: string;
  description: string;
  cost: Partial<ResourceSet>;
  buildMonths: number;
  effects: FacilityEffect[];
  unlocks: Unlock[];
  flavor: string;
  eraId: string;
};

export type ActiveBuild = {
  facilityId: string;
  monthsRemaining: number;
  progressMonths: number;
};

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

export type ResearchDef = {
  id: string;
  name: string;
  description: string;
  // Cost in Hockey Knowledge points (science-per-turn model: HK income funds it).
  cost: number;
  requiredTechIds: string[];
  unlocks: Unlock[];
  flavor: string;
  eraId: string;
};

export type ActiveResearch = {
  techId: string;
  knowledgeRemaining: number;
  progressKnowledge: number;
};

// ---------------------------------------------------------------------------
// Regions (discovery)
// ---------------------------------------------------------------------------

export type DiscoveryStateValue =
  | "hidden"
  | "rumored"
  | "discovered"
  | "surveyed";

export type RegionDef = {
  id: string;
  name: string;
  terrain: string;
  hockeyResource: string;
  scoutingDifficulty: number;
  potentialYields: Partial<ResourceSet>;
  tags: string[];
  scoutReport: string;
  unusual: boolean;
};

export type DiscoveryPriorityId =
  | "survey-nearby-ice"
  | "follow-prospect-rumor"
  | "listen-local-rinks"
  | "study-strange-culture"
  | "build-relationships";

export type DiscoveryPriorityDef = {
  id: DiscoveryPriorityId;
  name: string;
  description: string;
  flavor: string;
};

export type DiscoveryState = {
  activePriorityId: DiscoveryPriorityId;
  // region id -> current discovery state (regions absent are "hidden")
  regionStates: Record<string, DiscoveryStateValue>;
};

// ---------------------------------------------------------------------------
// Cards (staff / prospect / player)
// ---------------------------------------------------------------------------

export type CardType = "staff" | "prospect" | "player";

export type CardEffect =
  | { type: "monthlyIncome"; resource: ResourceKey; amount: number }
  | { type: "reduceInjuryEvents" }
  | { type: "flavorOnly" };

export type CardDef = {
  id: string;
  type: CardType;
  name: string;
  // position only meaningful for prospect/player
  position?: "F" | "D" | "G";
  potential?: string;
  risk?: string;
  role?: string;
  effects: CardEffect[];
  flavor: string;
};

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type LogType =
  | "resource"
  | "build"
  | "research"
  | "discovery"
  | "card"
  | "era"
  | "rival"
  | "flavor";

export type EventLogEntry = {
  id: string;
  month: number;
  title: string;
  message: string;
  type: LogType;
};

export type FlavorEventDef = {
  id: string;
  message: string;
};

// ---------------------------------------------------------------------------
// Eras
// ---------------------------------------------------------------------------

export type EraDef = {
  id: string;
  name: string;
  description: string;
};

export type EraRequirementId =
  | "club-founded"
  | "outdoor-rink-complete"
  | "research-complete"
  | "two-regions-discovered"
  | "first-card-acquired";

export type EraRequirement = {
  id: EraRequirementId;
  label: string;
};

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export type GameState = {
  phase: Phase;
  month: number;
  maxMonths: number;
  eraId: string;
  nextEraUnlocked: boolean;
  club: ClubDef | null;
  resources: ResourceSet;
  facilities: string[]; // completed facility ids
  completedResearch: string[];
  activeBuild: ActiveBuild | null;
  activeResearch: ActiveResearch | null;
  discovery: DiscoveryState;
  cards: CardDef[];
  eventLog: EventLogEntry[];
  rngSeed: number;
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type GameAction =
  | { type: "START_GAME" }
  | { type: "FOUND_CLUB"; clubId: string }
  | { type: "SELECT_BUILD"; facilityId: string }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "SELECT_DISCOVERY_PRIORITY"; priorityId: DiscoveryPriorityId }
  | { type: "END_MONTH" }
  | { type: "RESTART" };

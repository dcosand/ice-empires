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

export type Phase =
  | "landing"
  | "clubSelect"
  | "founding"
  | "foundingMap"
  | "playing"
  | "complete";

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
  // Short fantasy line for the club-selection card.
  tagline: string;
  // Club-specific accent color (hex) for light theming.
  accent: string;
  // Folder under /public/assets/clubs/<assetKey>/ (logo/leader/background.png).
  // Kept separate from `id` so folder names need not match club ids exactly.
  assetKey: string;
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

// Builds are funded by Operations production each month (not paid upfront).
// Mirrors ActiveResearch so Operations reads as production-toward-builds.
export type ActiveBuild = {
  facilityId: string;
  operationsRemaining: number;
  progressOperations: number;
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
  // Fixed position on the stylized world map, as percentages (0-100) of the
  // map area. Not a real tile grid — just a hand-placed layout.
  map: { x: number; y: number };
};

// Early-game "Local Hockey Search" options. Deliberately informal — the club
// has no formal scouting department yet (that unlocks later).
export type DiscoveryPriorityId =
  | "find-local-players"
  | "ask-around-the-rinks"
  | "search-for-playable-ice"
  | "recruit-volunteers"
  | "host-an-open-skate"
  | "follow-a-local-rumor";

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
// Founding map (pre-club tile layer)
// ---------------------------------------------------------------------------

export type FoundingTerrain = "desert" | "ice" | "plains" | "water";

export type FoundingTile = {
  x: number;
  y: number;
  terrain: FoundingTerrain;
  valid: boolean; // can be entered / founded on (water is not)
};

export type FoundingMapState = {
  width: number;
  height: number;
  tiles: FoundingTile[]; // flat, length width*height
  unit: { x: number; y: number }; // Founding Group position
  selected: boolean;
  revealed: string[]; // "x,y" keys revealed from the fog
  movesPerTurn: number; // movement points granted each founding turn
  movesRemaining: number; // movement points left this founding turn
  founded: { x: number; y: number } | null; // HQ tile once founded
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
  selectedClubId: string | null;
  foundingMap: FoundingMapState | null;
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
  | { type: "SELECT_CLUB"; clubId: string }
  | { type: "START_FOUNDING" }
  | { type: "SELECT_FOUNDING_UNIT" }
  | { type: "MOVE_FOUNDING_UNIT"; x: number; y: number }
  | { type: "END_FOUNDING_TURN" }
  | { type: "FOUND_CLUB"; clubId: string }
  | { type: "BEGIN_SEASON" }
  | { type: "SELECT_BUILD"; facilityId: string }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "SELECT_DISCOVERY_PRIORITY"; priorityId: DiscoveryPriorityId }
  | { type: "END_MONTH" }
  | { type: "RESTART" };

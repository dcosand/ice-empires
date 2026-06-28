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
  | "playing"
  | "complete";

// ---------------------------------------------------------------------------
// Club
// ---------------------------------------------------------------------------

// Club brand palette (from the club brand sheets). `primary` is the deep base
// color, `secondary` the bright team color, `light` an off-white for text.
export type ClubPalette = {
  primary: string;
  secondary: string;
  light: string;
};

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
  // Fuller brand palette for richer theming (header bars, etc.).
  palette: ClubPalette;
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

// ---------------------------------------------------------------------------
// Organizational units (front-office / exploration roster, NOT map-combat units)
// ---------------------------------------------------------------------------

export type UnitCategory =
  | "founding"
  | "exploration"
  | "scouting"
  | "recruiting"
  | "development"
  | "analytics"
  | "diplomacy";

// Unit effects. Only `monthlyIncome` is wired into the economy this milestone
// (see selectors.getMonthlyIncome). The rest are forward-looking hooks that the
// UI surfaces as the unit's intended ability ("future assignment") and that the
// next iteration will wire into discovery/encounters/team-attributes.
export type UnitEffect =
  | { type: "monthlyIncome"; resource: ResourceKey; amount: number }
  | { type: "improveDiscovery" } // future: better region reports / reveal
  | { type: "improveEncounters" } // future: better pond-hockey encounter odds
  | { type: "teamAttribute"; attribute: string; amount: number }; // future

export type UnitDef = {
  id: string;
  name: string;
  category: UnitCategory;
  eraId: string;
  description: string;
  cost: Partial<ResourceSet>;
  buildMonths: number; // descriptive; real time derives from Operations/mo
  requiredTechIds?: string[]; // ALL must be completed
  requiredFacilityIds?: string[]; // ALL must be built
  // Requirement met if ANY of these tech-or-facility ids is completed/built.
  // Lets a unit be unlocked by "X OR Y" without a hard research gate.
  requiredAnyOf?: string[];
  effects?: UnitEffect[];
  unlocks?: Unlock[];
  flavor: string;
  // One-line, player-facing summary of what this unit does / will do.
  abilitySummary: string;
};

// An organizational unit the club owns. Lives in the roster at Club HQ; no map
// movement yet (kept deliberately separate from the world Scout unit).
export type OwnedUnit = {
  id: string; // instance id
  unitDefId: string;
  name: string;
  status: "available" | "assigned" | "recovering";
  locationId?: string;
  createdMonth: number;
};

// ---------------------------------------------------------------------------
// Production (Club HQ builds one thing at a time: a facility OR a unit)
// ---------------------------------------------------------------------------

export type ProductionKind = "facility" | "unit";

// Production is funded by Operations production each month (not paid upfront);
// any non-Operations cost (Budget/Reputation) is charged upfront on start.
// Mirrors ActiveResearch so Operations reads as production-toward-the-item.
export type ActiveProduction = {
  kind: ProductionKind;
  itemId: string;
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

// Region/tile lifecycle. `contested` is tracked separately (a rival-interest
// flag that can overlay discovered/surveyed/influenced regions).
export type DiscoveryStateValue =
  | "hidden"
  | "rumored"
  | "discovered"
  | "surveyed"
  | "influenced";

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
  // The tile this region sits on in the persistent world grid.
  tile: { x: number; y: number };
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

// An in-progress "Establish Local Connection" toward a surveyed region.
export type RegionConnection = {
  regionId: string;
  monthsRemaining: number;
};

export type DiscoveryState = {
  activePriorityId: DiscoveryPriorityId;
  // region id -> current discovery state (regions absent are "hidden")
  regionStates: Record<string, DiscoveryStateValue>;
  // region ids flagged with rival interest
  contested: string[];
  // the single active local-connection effort, if any
  connection: RegionConnection | null;
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
// Pond Hockey encounters ("goodie huts") — PLACEHOLDER for the next iteration.
// ---------------------------------------------------------------------------
// One-time early discoveries (wanderers, garage-rink legends, frozen-lake
// weirdos) that the Scout / Pond Scout can stumble onto. Distinct from the
// persistent, city-state-like Hockey Regions in /data/regions. Types + sample
// data exist now so the encounter system can be wired in without a schema
// change; nothing reads these yet.

export type EncounterEffect =
  | { type: "addCard"; cardId: string }
  | { type: "addResource"; resource: ResourceKey; amount: number }
  | { type: "teamAttribute"; attribute: string; amount: number }
  | { type: "setback"; message: string }
  | { type: "flavorOnly" };

export type PondEncounter = {
  id: string;
  name: string;
  kind: "wanderer" | "equipment" | "local-believer" | "mishap" | "rumor";
  description: string;
  possibleEffects: EncounterEffect[];
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
// Persistent world map (founding tile map IS the in-game world)
// ---------------------------------------------------------------------------

export type WorldTerrain =
  | "coastal"
  | "desert"
  | "high-desert"
  | "ice"
  | "mountain"
  | "plains"
  | "tropical"
  | "water";

export type WorldFeature = "lake" | "pond" | "river";

export type WorldTile = {
  x: number;
  y: number;
  terrain: WorldTerrain;
  variant: number; // 0-3 art variation within the terrain family
  elevation: number; // 0..~1.1 height field; drives how tall the iso tile rises
  feature?: WorldFeature;
  valid: boolean; // can be entered / founded on (water is not)
};

// A movable unit on the world (the Founding Group before founding, the Scout
// after it unlocks).
export type WorldUnit = {
  x: number;
  y: number;
  movesPerTurn: number;
  movesRemaining: number;
};

export type WorldState = {
  width: number;
  height: number;
  tiles: WorldTile[]; // flat, length width*height
  revealed: string[]; // "x,y" keys revealed from the fog (persists into play)
  hqTile: { x: number; y: number } | null; // Club HQ tile, set at founding
  founder: WorldUnit | null; // Founding Group; null after founding
  founderSelected: boolean; // founding-phase selection
  scout: WorldUnit | null; // null until the Scout is recruited
  scoutSelected: boolean; // play-phase scout selection
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
  world: WorldState | null;
  club: ClubDef | null;
  resources: ResourceSet;
  facilities: string[]; // completed facility ids
  units: OwnedUnit[]; // owned organizational units (HQ roster)
  completedResearch: string[];
  activeProduction: ActiveProduction | null; // one shared facility/unit slot
  activeResearch: ActiveResearch | null;
  discovery: DiscoveryState;
  cards: CardDef[];
  eventLog: EventLogEntry[];
  rngSeed: number;
  devRevealAll: boolean; // dev tool: render every tile regardless of fog of war
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
  | { type: "START_PRODUCTION"; kind: ProductionKind; itemId: string }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "SELECT_DISCOVERY_PRIORITY"; priorityId: DiscoveryPriorityId }
  | { type: "RECRUIT_SCOUT" }
  | { type: "SELECT_SCOUT" }
  | { type: "MOVE_SCOUT"; x: number; y: number }
  | { type: "SURVEY_REGION"; regionId: string }
  | { type: "ESTABLISH_CONNECTION"; regionId: string }
  | { type: "END_MONTH" }
  | { type: "RESTART" }
  // ---- dev tools (not part of normal play) ----
  | { type: "DEV_RESET_TURN1" }
  | { type: "DEV_REGEN_MAP" }
  | { type: "DEV_TOGGLE_FACILITY"; facilityId: string }
  | { type: "DEV_TOGGLE_RESEARCH"; techId: string }
  | { type: "DEV_SET_REVEAL_ALL"; value: boolean };

// Ice Empires — shared types.
// Content lives in /data, rules live in /engine, UI renders this state.

// Economy model (see DECISIONS.md): two true currencies + one standing stat.
//   funds           — purchasing/production currency (Budget + Operations merged);
//                     funds production toward builds each month and pays upfront costs.
//   hockeyKnowledge — research fuel (science-per-turn, decision D1).
//   reputation      — NOT spendable. A standing stat that actions require at
//                     thresholds (e.g. independents want rep >= 3). Nothing charges it.
// Equipment is deliberately NOT a resource — it's shed inventory on GameState.
export type ResourceKey = "funds" | "hockeyKnowledge" | "reputation";

export type ResourceSet = {
  funds: number;
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
  // Adds to the equipment inventory each month (equipment is not a ResourceKey).
  | { type: "equipmentPerMonth"; amount: number }
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
  | "construction"
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
  buildMonths: number; // actual build duration once paid (D30)
  requiredTechIds?: string[]; // ALL must be completed
  requiredFacilityIds?: string[]; // ALL must be built
  // Requirement met if ANY of these tech-or-facility ids is completed/built.
  // Lets a unit be unlocked by "X OR Y" without a hard research gate.
  requiredAnyOf?: string[];
  effects?: UnitEffect[];
  unlocks?: Unlock[];
  // When produced, also spawn a movable unit of this kind on the map at HQ
  // (pond-scout spawns a scout; rink-rats spawns a builder).
  spawnsMapUnit?: "scout" | "builder";
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

// Production is paid in FULL when it starts (Polytopia-style, DECISIONS D30);
// the HQ slot then works the item for its buildMonths. monthsRemaining ticks
// down each End Month; totalMonths drives progress bars.
export type ActiveProduction = {
  kind: ProductionKind;
  itemId: string;
  monthsRemaining: number;
  totalMonths: number;
};

// ---------------------------------------------------------------------------
// Research
// ---------------------------------------------------------------------------

// Tech-tree branches (rows on the tech screen). Kept as a closed union so the
// screen can color-code rows and catch typos in the 40-tech dataset.
export type ResearchBranch =
  | "hockey-fundamentals"
  | "icecraft-infrastructure"
  | "team-formation"
  | "scouting-reach"
  | "club-formation"
  | "pipelines-influence"
  | "competition"
  | "diplomacy"
  | "legacy";

export type ResearchDef = {
  id: string;
  name: string;
  description: string;
  // Cost in Hockey Knowledge points (science-per-turn model: HK income funds it).
  cost: number;
  requiredTechIds: string[];
  branch: ResearchBranch;
  unlocks: Unlock[];
  flavor: string;
  eraId: string;
};

export type ActiveResearch = {
  techId: string;
  knowledgeRemaining: number;
  progressKnowledge: number;
};

// NOTE: The legacy "Local Hockey Search" / rumor-region discovery system was
// retired (2026-07-03) — independents are now the sole "places that matter".
// See DECISIONS.md D26 and docs/13_ERA_ARC.md for the scouting arc that replaces
// it. Types removed here: DiscoveryStateValue, RegionDef, DiscoveryPriorityId,
// DiscoveryPriorityDef, RegionConnection, DiscoveryState.

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
// Players (the roster — actual humans who show up and try to play hockey)
// ---------------------------------------------------------------------------

export type PlayerPosition = "F" | "D" | "G";
export type PlayerGender = "male" | "female";

// Attributes on a 20-point scale. Pond-era locals roll 1–6 — they are terrible,
// and that's the point.
export type PlayerAttrs = {
  skating: number;
  shooting: number;
  passing: number;
  checking: number;
  goaltending: number;
};

export type Player = {
  id: string;
  name: string;
  gender: PlayerGender;
  position: PlayerPosition;
  age: number;
  attrs: PlayerAttrs;
  imageUrl?: string;
  // One stick+gear from the equipment inventory. Ungeared players don't count
  // toward the "full line" era requirement.
  hasEquipment: boolean;
  joinedMonth: number;
  origin: string; // e.g. "local tryout"
  // One-line personality/backstory shown on cards.
  note: string;
};

// A tryout attendee who hasn't been recruited yet.
export type TryoutCandidate = Omit<Player, "hasEquipment" | "joinedMonth">;

// A newly-joined player awaiting their cinematic reveal (letterbox + crowd
// murmur + card flip). Set when the FIRST-EVER player joins (any source) or
// whenever a wanderer joins via a goodie hut — the "big moment" of a signing.
export type PlayerReveal = {
  player: Player;
  source: "tryout" | "encounter";
  // The club's very first player — earns the fullest fanfare copy.
  firstEver: boolean;
};

export type PendingTryout = {
  candidates: TryoutCandidate[];
  // ids of candidates already recruited this tryout (kept for the modal UI).
  recruitedIds: string[];
  // The club's first-ever tryout gets the letterbox cinematic treatment
  // (crowd murmur, staged card-flip reveal). Set once via state.seenFirstTryout.
  firstEver?: boolean;
};

// ---------------------------------------------------------------------------
// Pond Hockey encounters ("goodie huts") — PLACEHOLDER for the next iteration.
// ---------------------------------------------------------------------------
// One-time early discoveries (wanderers, garage-rink legends, frozen-lake
// weirdos) that the Scout / Pond Scout can stumble onto. Distinct from the
// persistent, city-state-like Independent Hockey Associations. Types + sample
// data exist now so the encounter system can be wired in without a schema
// change; nothing reads these yet.

export type EncounterEffect =
  | { type: "addCard"; cardId: string }
  // A wanderer/local actually joins the roster as a playable (bad) player.
  | { type: "addRosterPlayer"; position: PlayerPosition }
  | { type: "addResource"; resource: ResourceKey; amount: number }
  | { type: "teamAttribute"; attribute: string; amount: number }
  // A free, fully-completed technology (and its unlocks). The "discovery of a
  // new tech" goodie-hut outcome.
  | { type: "grantTech"; techId: string }
  // A negative outcome. An optional resource/amount actually deducts from the
  // club (budget/operations hits); message-only setbacks stay pure flavor.
  | { type: "setback"; message: string; resource?: ResourceKey; amount?: number }
  | { type: "flavorOnly" };

export type PondEncounter = {
  id: string;
  name: string;
  kind: "wanderer" | "equipment" | "local-believer" | "mishap" | "rumor";
  description: string;
  possibleEffects: EncounterEffect[];
};

// A goodie-hut outcome that has been rolled (when a unit steps onto the marker)
// but not yet applied — it waits for the player to acknowledge the pop-up, at
// which point the effect is committed. See scoutSystem's trigger/resolve pair.
export type PendingEncounter = {
  markerId: string;
  encounterId: string;
  name: string;
  kind: PondEncounter["kind"];
  description: string; // flavor narrative
  outcome: string; // human-readable result line shown in the pop-up
  tone: "good" | "bad" | "neutral";
  effect: EncounterEffect;
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
  | "rival-contact" // met >=1 rival major club
  | "independent-contact" // met >=1 independent hockey org
  | "rink-built" // >=1 Level-1 rink on the map
  | "rules-of-the-game" // the tech: your players can actually play
  | "full-roster"; // >=6 players incl. >=1 goalie, all geared

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
  | "ice" // snowfield / glacial / frozen *ground*
  | "mountain"
  | "plains"
  | "pond" // a small skateable / buildable water body — a future rink site
  | "tropical"
  | "water";

// The condition of a pond's surface, independent of it being a pond. Today
// generated ponds default to "frozen"; later, thaw/seasonal mechanics can flip
// this without changing the terrain type. Only meaningful for "pond" terrain
// for now (room to extend to lakes/rivers later).
export type PondSurfaceState = "frozen" | "thin-ice" | "open-water";

// Lakes (impassable inland water) and rivers (connective overlay) remain
// features. Ponds were promoted to a first-class WorldTerrain (see above).
export type WorldFeature = "lake" | "river";

export type WorldTile = {
  x: number;
  y: number;
  terrain: WorldTerrain;
  variant: number; // 0-3 art variation within the terrain family
  elevation: number; // 0..~1.1 height field; drives how tall the iso tile rises
  feature?: WorldFeature;
  foliageDensity?: number; // 0..1 smooth field; drives forest clustering (thick cores, thin edges)
  surfaceState?: PondSurfaceState; // pond surface condition; pond tiles default to "frozen"
  valid: boolean; // can be entered / founded on (water is not)
};

// What a builder is currently constructing (multi-month map work). While set,
// the unit cannot move and its moves are not refreshed at month end.
export type BuilderWork = {
  task: "build-rink";
  x: number;
  y: number;
  rinkKind: "ice" | "inline";
  monthsRemaining: number;
};

// A movable unit on the world (the Founding Group before founding; Scouts and
// Builders after). All player field units share this shape and live in
// world.scouts — `kind` distinguishes behavior (absent = "scout" for legacy).
export type WorldUnit = {
  id?: string;
  unitDefId?: string;
  name?: string;
  kind?: "scout" | "builder";
  x: number;
  y: number;
  movesPerTurn: number;
  movesRemaining: number;
  working?: BuilderWork;
};

// A rink (or pre-rink surface) created on the map by a builder unit.
//   level 0 — Cleared Pond (shoveled snow; enables the Level-1 build)
//   level 1 — Level 1 Outdoor Rink (or street/inline rink on pavement)
export type WorldRink = {
  id: string;
  x: number;
  y: number;
  level: number;
  kind: "ice" | "inline";
  builtMonth: number;
  // Which club built it. Undefined = the player's club. Rival rinks render in
  // the rival's colors and give the player no benefits.
  ownerClubId?: string;
};

export type WorldPondMarker = {
  id: string;
  x: number;
  y: number;
  kind: PondEncounter["kind"];
  encounterId: string;
  investigated: boolean;
};

// A prospect in an independent's pipeline. Seeded at worldgen; `revealed`
// stays false until an Act-2 scouting network uncovers the details — the
// ledger shows a fogged "???" slot with only position + teaser.
export type OrgProspect = {
  id: string;
  revealed: boolean;
  position: "F" | "D" | "G";
  teaser: string;
};

// Relationship ladder with an independent (Civ city-state analog):
//   0 Contacted · 1 Friendly · 2 Partner · 3 Affiliate
export type OrgRelationshipLevel = 0 | 1 | 2 | 3;

export type WorldHockeyOrg = {
  id: string;
  name: string;
  x: number;
  y: number;
  archetype: "minor-club" | "junior-league" | "rink-society" | "academy";
  discovered: boolean;
  // First-contact + relationship state (independents ledger).
  playerContacted: boolean;
  contactMonth?: number;
  relationshipLevel: OrgRelationshipLevel;
  influencePoints: number;
  // Rival majors that have made contact with this independent.
  contactedByClubIds: string[];
  // Influence each rival club has built here (the player's is influencePoints).
  // The Anchor Club race of Act II grows out of this.
  rivalInfluence: Record<string, number>;
  prospects: OrgProspect[];
};

// ---------------------------------------------------------------------------
// Rival clubs (AI opponents — foundation for multiplayer)
// ---------------------------------------------------------------------------
// Every club the human did NOT select founds its own HQ on turn 1 and runs a
// lightweight monthly turn (accumulate production -> spawn scouts that wander).
// This is deliberately NOT a full strategic AI — it's the foundation the real
// opponent / diplomacy systems will grow from.

export type RivalUnitKind = "scout" | "builder";

// A movable rival unit on the world. Mirrors WorldUnit, but kept separate so the
// player's own movement / selection code never has to reason about enemy units.
export type RivalUnit = {
  id: string;
  x: number;
  y: number;
  movesPerTurn: number;
  movesRemaining: number;
  kind: RivalUnitKind;
  // Rival builders lock in place while raising a rink (months remaining).
  workingMonths?: number;
};

export type RivalClub = {
  clubId: string; // -> CLUBS[clubId] for name / accent / assets
  hqTile: { x: number; y: number };
  productionPoints: number; // lightweight economy accumulator toward next unit
  units: RivalUnit[];
  contacted: boolean; // has the human made first contact with this rival?
  // How the player greeted them at first contact — seeds Act-3 diplomacy.
  attitude?: "friendly" | "wary";
  // Rivals progress through eras on their own seeded schedule; transitions of
  // contacted rivals are broadcast in the log for competitive pressure.
  eraId: string;
};

// A first-contact "leader scene" awaiting the player's response. Mirrors
// PendingEncounter — set when the human bumps into a rival club or an
// independent org. `id` is a clubId (rival) or hockey-org id (independent).
export type PendingMeeting = {
  kind: "rival" | "independent";
  id: string;
};

export type WorldState = {
  width: number;
  height: number;
  tiles: WorldTile[]; // flat, length width*height
  revealed: string[]; // "x,y" keys revealed from the fog (persists into play)
  hqTile: { x: number; y: number } | null; // Club HQ tile, set at founding
  founder: WorldUnit | null; // Founding Group; null after founding
  founderSelected: boolean; // founding-phase selection
  scouts: WorldUnit[]; // movable exploration units produced by HQ / founding
  selectedScoutId: string | null;
  pondMarkers: WorldPondMarker[]; // one-time "goodie hut" exploration markers
  hockeyOrgs: WorldHockeyOrg[]; // persistent neutral hockey powers / city-state analogs
  rivals: RivalClub[]; // AI opponent clubs with their own HQs + units
  rinks: WorldRink[]; // player-built rinks / cleared ponds on the map
  harvestedTiles: string[]; // "x,y" keys of forest tiles already harvested for sticks
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
  // Shed inventory of sticks & gear (not a currency): harvested from forests,
  // produced by the Equipment Shed, consumed 1-per-player to gear recruits.
  equipment: number;
  roster: Player[]; // recruited players (the actual team)
  pendingTryout: PendingTryout | null; // open tryout modal, if any
  // A newly-signed player awaiting their reveal cinematic (see PlayerReveal).
  pendingPlayerReveal: PlayerReveal | null;
  // One-time flags gating the "first" cinematic beats.
  seenFirstTryout: boolean; // has the club held a tryout before?
  seenFirstPlayer: boolean; // has anyone ever joined the roster?
  facilities: string[]; // completed facility ids
  units: OwnedUnit[]; // owned organizational units (HQ roster)
  completedResearch: string[];
  activeProduction: ActiveProduction | null; // one shared facility/unit slot
  activeResearch: ActiveResearch | null;
  cards: CardDef[];
  eventLog: EventLogEntry[];
  rngSeed: number;
  // A goodie-hut outcome awaiting the player's acknowledgement (pop-up open).
  pendingEncounter: PendingEncounter | null;
  // A rival first-contact meeting awaiting acknowledgement (leader scene open).
  pendingMeeting: PendingMeeting | null;
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
  // Change of heart — allowed until the first End Turn applies progress.
  | { type: "CANCEL_PRODUCTION" }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "CANCEL_RESEARCH" }
  | { type: "RECRUIT_SCOUT" }
  | { type: "SELECT_SCOUT"; scoutId?: string }
  | { type: "MOVE_SCOUT"; x: number; y: number; scoutId?: string }
  | { type: "RESOLVE_ENCOUNTER" }
  | { type: "ACKNOWLEDGE_MEETING" }
  | { type: "RESPOND_MEETING"; attitude: "friendly" | "wary" }
  // ---- builder (map work crew) actions ----
  | { type: "CLEAR_SNOW"; unitId: string }
  | { type: "BUILD_RINK"; unitId: string }
  | { type: "HARVEST_BRANCHES"; unitId: string }
  // ---- tryouts / roster ----
  | { type: "HOLD_TRYOUTS" }
  | { type: "RECRUIT_PLAYER"; candidateId: string }
  | { type: "CLOSE_TRYOUTS" }
  // Dismiss the first-player / goodie-hut reveal cinematic.
  | { type: "ACKNOWLEDGE_PLAYER_REVEAL" }
  // ---- independents ----
  | { type: "SEND_INTRODUCTION"; orgId: string }
  | { type: "END_MONTH" }
  | { type: "RESTART" }
  // ---- dev tools (not part of normal play) ----
  | { type: "DEV_RESET_TURN1" }
  | { type: "DEV_REGEN_MAP" }
  | { type: "DEV_TOGGLE_FACILITY"; facilityId: string }
  | { type: "DEV_TOGGLE_RESEARCH"; techId: string }
  | { type: "DEV_SET_REVEAL_ALL"; value: boolean }
  | { type: "DEV_MEET_RIVAL" }
  | { type: "DEV_MEET_INDEPENDENT" }
  | { type: "DEV_SPAWN_BUILDER" }
  | { type: "DEV_GRANT_POND_TECH" }
  | { type: "DEV_FORCE_TRYOUTS" }
  | { type: "DEV_ADD_EQUIPMENT" };

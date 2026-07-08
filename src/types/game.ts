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

export type NationId =
  | "usa"
  | "canada"
  | "canada_french"
  | "finland"
  | "sweden"
  | "czechia"
  | "slovakia"
  | "russia"
  | "germany"
  | "switzerland"
  | "latvia"
  | "other";

export type NamePoolId = NationId;

export type NationalityWeights = Partial<Record<NationId, number>>;

export type PersonNationality = {
  primary: NationId;
  secondary?: NationId;
};

export type NationDefinition = {
  id: NationId;
  displayName: string;
  namePoolId: NamePoolId;
};

export type WeightedName = {
  value: string;
  weight?: number;
};

export type NamePool = {
  id: NamePoolId;
  maleFirstNames: WeightedName[];
  femaleFirstNames: WeightedName[];
  lastNames: WeightedName[];
};

export type ClubDef = {
  id: string;
  name: string;
  homeNationId: NationId;
  nationalityWeights?: NationalityWeights;
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

// ---------------------------------------------------------------------------
// Scout characters (D29/D31: scouts are PEOPLE, not interchangeable units)
// ---------------------------------------------------------------------------

// Quality tier chosen (and paid for) at production — the EHM job-market feel:
// splurge on an ace or field cheap volunteer eyes. Tier sets starting ranges
// for the two judging attributes; fieldwork XP promotes from there.
export type ScoutQualityTier = "volunteer" | "traveled" | "ace";

// A named scout on the club's scouting staff. `id` matches the WorldUnit id of
// their map unit (scouts are unit-tied; builders never get characters).
// Attributes are on the 20-point scale shared with players.
export type ScoutCharacter = {
  id: string;
  name: string;
  nationality: PersonNationality;
  tier: ScoutQualityTier;
  judgingPotential: number; // projecting a young player's ceiling
  judgingAbility: number; // reading current skill accurately
  xp: number; // fieldwork experience (encounters, contacts, networks)
  promotions: number; // promotions already applied from XP
  hiredMonth: number;
  note: string; // one-line personality
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
  // Quality tier picked for a scout-spawning unit (affects cost + the produced
  // ScoutCharacter's judging attributes). Absent for everything else.
  scoutTier?: ScoutQualityTier;
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

// Research is an upfront Hockey Knowledge purchase (D56): the full HK cost is
// paid when you pick the tech, which then unlocks NEXT turn — same shape as a
// production slot (monthsRemaining timer), so units, buildings, and research
// all read as "pay now, get it next turn".
export type ActiveResearch = {
  techId: string;
  monthsRemaining: number;
  totalMonths: number;
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
  position?: PlayerPosition;
  potential?: string;
  risk?: string;
  role?: string;
  effects: CardEffect[];
  flavor: string;
};

// ---------------------------------------------------------------------------
// Players (the roster — actual humans who show up and try to play hockey)
// ---------------------------------------------------------------------------

// Positions: Center / Wing / Defense / Goalie (docs/15 §3). The C/W split
// makes Faceoffs and line construction meaningful without handedness fuss.
export type PlayerPosition = "C" | "W" | "D" | "G";
export type PlayerGender = "male" | "female";

// One honest 1–100 scale everywhere (docs/15 — EA-NHL skin over an EHM soul).
// Elite ≈ 90–99, league-average ≈ 75, pond-era locals ≈ 20–45.

// Ten skater attributes in five display groups (Offense/Defense/Skating/
// Sense/Mental — see data/attributes.ts for grouping + labels).
export type SkaterAttrs = {
  shooting: number;
  passing: number;
  puckControl: number;
  checking: number;
  physicality: number;
  speed: number;
  agility: number;
  hockeyIq: number;
  faceoffs: number;
  compete: number;
};

// Six goalie attributes — goaltending is its own mini-game, not one number.
export type GoalieAttrs = {
  reflexes: number;
  positioning: number;
  gloveHands: number;
  reboundControl: number;
  athleticism: number;
  composure: number;
};

// A player's ratings block: skaters and goalies carry different attribute
// sets (EA-style — a goalie card shows only goalie stats).
export type PlayerAttrs =
  | { kind: "skater"; skater: SkaterAttrs }
  | { kind: "goalie"; goalie: GoalieAttrs };

// Any attribute name from either set (fog estimates key on these).
export type AttrKey = keyof SkaterAttrs | keyof GoalieAttrs;

// Player Style: assigned at generation, biases the attribute distribution
// (role-weighting) and later feeds match matchups (docs/15 §3, §7).
export type PlayerStyle =
  | "Sniper"
  | "Playmaker"
  | "Two-Way"
  | "Power Forward"
  | "Grinder"
  | "Offensive D"
  | "Two-Way D"
  | "Defensive D"
  | "Enforcer"
  | "Butterfly"
  | "Hybrid"
  | "Standup";

export type Player = {
  id: string;
  name: string;
  nationality: PersonNationality;
  gender: PlayerGender;
  position: PlayerPosition;
  age: number;
  attrs: PlayerAttrs;
  // True ceiling OVR (1–100), engine-side. UI reads arrive via fog — the
  // ceiling resolves slowly even for your own players (docs/15 §6). OVR is
  // NOT stored: derive it via engine/ratings.computeOverall (like income).
  potential: number;
  style: PlayerStyle;
  // Hidden traits — never on the card; feed report prose + the future match
  // sim (docs/15 §3): injury/stamina tendency and penalty tendency.
  traits: { durability: number; discipline: number };
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
  source: "tryout" | "encounter" | "signing";
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
  // The field unit that stepped on the hut — earns scout XP on resolve (D29).
  unitId?: string;
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

// One inbox item (D41: the Log is an Inbox). `from` is the sender line —
// a scout's name, an org, a rival GM; absent means the UI derives a desk
// name from `type`. `read` flips on triage; absent = unread.
export type EventLogEntry = {
  id: string;
  month: number;
  title: string;
  message: string;
  type: LogType;
  from?: string;
  read?: boolean;
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
  | "full-roster" // >=6 players incl. >=1 goalie, all geared
  // --- Club Formation era (Act II) exit set (docs/14 §1) ---
  | "scouting-network" // established a scouting network with >=1 independent
  | "territory-projected" // HQ + >=3 player rinks (level >=1) projecting borders
  | "club-identity" // the tech: the club has a stated identity
  | "training-camp"; // held >=1 tryout in a training-camp window

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

// Multi-turn map work a field unit is committed to. While set, the unit
// cannot move and its moves are not refreshed at turn end. Builders build
// rinks; scouts hold observation assignments at an org (docs/15 §5 — open-
// ended until recalled).
export type UnitWork =
  | {
      task: "build-rink";
      x: number;
      y: number;
      rinkKind: "ice" | "inline";
      monthsRemaining: number;
    }
  | {
      task: "scout-org";
      orgId: string;
    };

// An active scouting assignment (docs/15 §5, the Civ-VI-spy analog): a scout
// parked at a networked org, filing reports on a cadence. Repeat viewings
// sharpen the reads; the mission ends when the scout is recalled.
export type ScoutMission = {
  unitId: string;
  orgId: string;
  startMonth: number;
  monthsActive: number;
  // How many report batches this mission has filed (drives read sharpness).
  filings: number;
  // Attention is finite (docs/15 §5): after the first full-roster sweep, only
  // WATCHED players get repeat viewings. Capped by the scout's tier slots.
  watchedPlayerIds: string[];
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
  working?: UnitWork;
  // Ice-hockey scrap fallout (wanderers): the scout sits in the penalty box,
  // pinned at 0 moves, for this many more turns. Decremented each turn refresh.
  penaltyBoxTurns?: number;
};

// A roaming neutral map unit (Civ-barbarian analog). Some are prospects you can
// try to recruit; some are hostiles who drop the gloves and box your scout. The
// TRUE disposition is engine-side — the UI shows only a scout-judged "tell".
export type WandererDisposition = "friendly" | "hostile";
export type Wanderer = {
  id: string;
  x: number;
  y: number;
  // Roam anchor: they drift within a small radius of here, 1 tile/turn.
  homeX: number;
  homeY: number;
  disposition: WandererDisposition; // engine-side truth
  spawnedMonth: number; // for despawning stale wanderers
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

// Fog-of-talent (D29, docs/13 §6.3): how the club learned about a player sets
// how tightly their attributes are known. Tryouts are near-exact (you watched
// them); a scout's network visit yields RANGES scaled by that scout's judging;
// the indie's own word is a vague teaser; rival rumors come later (Act II
// roster snapshots).
export type KnownVia = "tryout" | "scout-network" | "org-word" | "rumor";

// An estimated attribute: the truth is guaranteed to be inside [low, high],
// but the center is seeded off-true — a dud can look like a gem.
export type AttrEstimate = { low: number; high: number };

// Fog estimates keyed by attribute name — a skater's map holds skater keys,
// a goalie's the goalie keys.
export type AttrEstimates = Partial<Record<AttrKey, AttrEstimate>>;

// A prospect in an independent's pipeline. Seeded at worldgen; `revealed`
// stays false until a scouting network uncovers the details — the ledger
// shows a fogged "???" slot with only position + teaser. Establishing a
// network fills in the identity, TRUE values (hidden from the UI), and the
// scouted ESTIMATES the UI actually shows.
export type OrgProspect = {
  id: string;
  revealed: boolean;
  nationality: PersonNationality;
  position: PlayerPosition;
  teaser: string;
  name?: string;
  age?: number;
  gender?: PlayerGender;
  knownVia?: KnownVia;
  // Set when a rival club wins the race for them — the prospect stays visible
  // in the pipeline (it should sting) but can no longer be watched or signed.
  signedByClubId?: string;
  // True values — engine-only; never render these directly.
  attrs?: PlayerAttrs;
  potential?: number; // true ceiling OVR, 1–100
  style?: PlayerStyle;
  // What your scout believes (render these): width scales with the
  // establishing scout's Judging Ability / Judging Potential.
  attrEstimates?: AttrEstimates;
  potentialEstimate?: AttrEstimate;
};

// A filed scouting report (docs/15 §5): one scout's read on one subject at a
// point in time. The Scouting screen's player detail shows a subject's full
// report history — who looked, when, what they believed, in their own words.
export type ScoutReport = {
  id: string;
  month: number;
  subjectId: string; // OrgProspect id (or, later, a Player id)
  subjectName: string;
  position: PlayerPosition;
  style?: PlayerStyle;
  scoutId: string;
  scoutName: string;
  orgId?: string;
  orgName?: string;
  // The scout's belief at filing time (ranges — never the truth).
  attrEstimates: AttrEstimates;
  potentialEstimate: AttrEstimate;
  // Deterministic scout's-voice prose built from the estimates.
  prose: string;
};

// Relationship ladder with an independent (Civ city-state analog):
//   0 Contacted · 1 Friendly · 2 Partner · 3 Affiliate
export type OrgRelationshipLevel = 0 | 1 | 2 | 3;

export type WorldHockeyOrg = {
  id: string;
  name: string;
  homeNationId: NationId;
  nationalityWeights?: NationalityWeights;
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
  // The player has established a scouting network here (prospects revealed).
  networkedByPlayer?: boolean;
  networkMonth?: number;
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
  // A scout boxed after losing a scrap with a hostile wanderer sits out this
  // many turns (mirrors WorldUnit.penaltyBoxTurns for the human).
  penaltyBoxTurns?: number;
};

export type RivalClub = {
  clubId: string; // -> CLUBS[clubId] for name / accent / assets
  homeNationId: NationId;
  nationalityWeights?: NationalityWeights;
  hqTile: { x: number; y: number };
  productionPoints: number; // lightweight economy accumulator toward next unit
  units: RivalUnit[];
  // The rival's players (D51): empty until first contact, then generated
  // era-appropriate through the shared playerGen. Engine-side truth — never
  // render their attributes directly (future roster reads go through the fog).
  roster: Player[];
  contacted: boolean; // has the human made first contact with this rival?
  // How the player greeted them at first contact — seeds Act-3 diplomacy.
  attitude?: "friendly" | "wary";
  // Rivals progress through eras on their own seeded schedule; transitions of
  // contacted rivals are broadcast in the log for competitive pressure.
  eraId: string;
};

// ---------------------------------------------------------------------------
// Matches (D51, docs/17): exhibition results from the seeded shot-chance sim.
// ---------------------------------------------------------------------------

export type MatchGoal = {
  period: number; // 1..3
  minute: number; // 0..19 within the period
  clubId: string; // the scoring club
  scorerId: string;
  scorer: string;
  assist?: string;
};

// One team's line in the box score. `periodGoals` has one entry per period.
export type MatchTeamLine = {
  clubId: string;
  name: string;
  score: number;
  shots: number;
  periodGoals: number[];
};

export type MatchResult = {
  id: string;
  month: number;
  kind: "exhibition";
  home: MatchTeamLine; // the player's club
  away: MatchTeamLine; // the rival
  goals: MatchGoal[];
  // Star of the game: a stolen game reads as goaltending, otherwise top points.
  star: { playerId: string; name: string; clubId: string; line: string } | null;
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
  wanderers: Wanderer[]; // roaming neutral units — recruit-or-scrap encounters
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
  scoutStaff: ScoutCharacter[]; // named scouts tied to map scout units (D29)
  scoutReports: ScoutReport[]; // filed reports, newest first (docs/15 §5)
  scoutMissions: ScoutMission[]; // active observation assignments (docs/15 §5)
  pendingTryout: PendingTryout | null; // open tryout modal, if any
  // A newly-signed player awaiting their reveal cinematic (see PlayerReveal).
  pendingPlayerReveal: PlayerReveal | null;
  // One-time flags gating the "first" cinematic beats.
  seenFirstTryout: boolean; // has the club held a tryout before?
  seenFirstPlayer: boolean; // has anyone ever joined the roster?
  // Training camps completed (tryouts held in an Aug–Sep camp window, D37) —
  // feeds the club-formation era's `training-camp` exit requirement.
  trainingCampsHeld: number;
  facilities: string[]; // completed facility ids
  units: OwnedUnit[]; // owned organizational units (HQ roster)
  completedResearch: string[];
  activeProduction: ActiveProduction | null; // one shared facility/unit slot
  activeResearch: ActiveResearch | null;
  cards: CardDef[];
  eventLog: EventLogEntry[];
  // Every game the club has played, newest first (D51). Also the derived
  // once-a-month exhibition gate; Act III standings/records will read it.
  matchHistory: MatchResult[];
  // A just-finished match awaiting its result overlay.
  pendingMatchResult: MatchResult | null;
  rngSeed: number;
  // A goodie-hut outcome awaiting the player's acknowledgement (pop-up open).
  pendingEncounter: PendingEncounter | null;
  // A rival first-contact meeting awaiting acknowledgement (leader scene open).
  pendingMeeting: PendingMeeting | null;
  // A wanderer encounter awaiting the player's choice (approach vs. move on).
  // `read` is the scout's subtle TELL (estimated disposition, may be wrong);
  // `scoutId` is the unit that made contact (it takes the scrap / earns XP).
  pendingWanderer: {
    wandererId: string;
    read: WandererDisposition | "unsure";
    scoutId?: string;
  } | null;
  // A just-established scouting network awaiting its celebration scene — the
  // trek across the map deserves a payoff beat (docs/15 §4).
  pendingNetwork: { orgId: string; unitId: string } | null;
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
  | {
      type: "START_PRODUCTION";
      kind: ProductionKind;
      itemId: string;
      // Quality tier for scout-spawning units (defaults to "volunteer").
      scoutTier?: ScoutQualityTier;
    }
  // Change of heart — allowed until the first End Turn applies progress.
  | { type: "CANCEL_PRODUCTION" }
  | { type: "SELECT_RESEARCH"; techId: string }
  | { type: "CANCEL_RESEARCH" }
  | { type: "RECRUIT_SCOUT" }
  | { type: "SELECT_SCOUT"; scoutId?: string }
  | { type: "MOVE_SCOUT"; x: number; y: number; scoutId?: string }
  | { type: "RESOLVE_ENCOUNTER" }
  | { type: "RESOLVE_WANDERER"; choice: "approach" | "ignore" }
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
  // ---- independents / scouting ----
  | { type: "SEND_INTRODUCTION"; orgId: string }
  // Park a scout beside a contacted independent for 2 months to reveal their
  // prospect pipeline (Act II scouting network, docs/13 §4.5).
  | { type: "ESTABLISH_NETWORK"; unitId: string; orgId: string }
  // Dismiss the network-established celebration scene.
  | { type: "ACKNOWLEDGE_NETWORK" }
  // ---- scouting assignments (docs/15 §5) ----
  | { type: "BEGIN_SCOUT_MISSION"; unitId: string; orgId: string }
  | { type: "RECALL_SCOUT"; unitId: string }
  // Toggle a prospect on/off the assigned scout's watch list (finite slots).
  | { type: "WATCH_PLAYER"; unitId: string; prospectId: string }
  // Enter the contested signing race for a scouted prospect (docs/15 §6).
  | { type: "SIGN_PROSPECT"; prospectId: string }
  // ---- matches (D51) ----
  // Challenge a contacted rival to an exhibition game (seeded sim).
  | { type: "PLAY_EXHIBITION"; rivalClubId: string }
  // Dismiss the match result overlay.
  | { type: "ACKNOWLEDGE_MATCH_RESULT" }
  // Inbox triage (D41): mark specific items read, or everything when omitted.
  | { type: "MARK_INBOX_READ"; ids?: string[] }
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
  | { type: "DEV_SPAWN_WANDERER" }
  | { type: "DEV_GRANT_POND_TECH" }
  | { type: "DEV_FORCE_TRYOUTS" }
  | { type: "DEV_ADD_EQUIPMENT" }
  | { type: "DEV_FORCE_EXHIBITION" };

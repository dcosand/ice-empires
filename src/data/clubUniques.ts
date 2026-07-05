import type { FacilityDef, UnitDef } from "../types/game";
import { FACILITIES, FACILITIES_BY_ID } from "./facilities";
import { UNITS, UNITS_BY_ID } from "./units";

// Per-club unique units and facilities (the Civ unique-unit/building analog).
// A unique unit with `replacesUnitId` swaps out the base unit in that club's
// production list; unique facilities are additions unless they name a
// replacement. V1: Arizona's Asphalt Crew is fully functional (desert street
// rinks); Calgary/Detroit/Helsinki/Minnesota carry small wired effects; the
// rest are honest, flavorful stubs whose mechanics land in later eras.
//
// Mechanics wired outside this file (grep the unit id):
//   asphalt-crew   -> builderSystem.canPaveStreetRink (desert paving)
//   barn-raisers   -> builderSystem.startRinkBuild (1-month rink builds)
//   foundry-crew   -> builderSystem.harvestBranches (+1 equipment per harvest)
//   goalie-whisperer -> tryoutSystem (better goalie odds at tryouts)
//   warming-house-crew -> tryoutSystem (+1 tryout candidate)

export type ClubUnique = {
  uniqueUnit?: { def: UnitDef; replacesUnitId?: string };
  uniqueFacility?: { def: FacilityDef; replacesFacilityId?: string };
  notes: string;
};

const U = (def: UnitDef, replacesUnitId?: string) => ({ def, replacesUnitId });
const F = (def: FacilityDef, replacesFacilityId?: string) => ({
  def,
  replacesFacilityId,
});

export const CLUB_UNIQUES: Record<string, ClubUnique> = {
  "arizona-monsoon": {
    uniqueUnit: U(
      {
        id: "asphalt-crew",
        name: "Asphalt Crew",
        category: "construction",
        eraId: "pond-hockey",
        description:
          "Arizona's answer to frozen ponds it doesn't have: a paving crew that turns desert flats into street hockey rinks.",
        cost: { funds: 8 },
        buildMonths: 2,
        requiredTechIds: ["ice-surveying"],
        spawnsMapUnit: "builder",
        abilitySummary:
          "Unique builder: paves desert tiles into street/inline rinks (plus all Rink Rats abilities).",
        flavor: "The desert never freezes. The desert never needed to.",
      },
      "rink-rats",
    ),
    uniqueFacility: F({
      id: "shade-pavilion",
      name: "Shade Pavilion",
      description: "Shade, misters, and cold water — hockey survives the sun.",
      cost: { funds: 7 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "reputation", amount: 1 }],
      unlocks: [],
      flavor: "The only rink in hockey with an official SPF rating.",
      eraId: "pond-hockey",
    }),
    notes: "Desert street rinks are fully functional in Act I.",
  },
  "halifax-privateers": {
    uniqueUnit: U({
      id: "harbor-ferry",
      name: "Harbor Ferry",
      category: "exploration",
      eraId: "pond-hockey",
      description:
        "A salt-crusted ferry crew that will one day carry your units across open water.",
      cost: { funds: 10 },
      buildMonths: 2,
      abilitySummary:
        "Future unit: water traversal for coastal clubs (lands with embarkation).",
      flavor: "The schedule says twice daily. The sea disagrees.",
    }),
    uniqueFacility: F({
      id: "wharf-rink",
      name: "Wharf Rink",
      description: "Boards bolted to the pier; the wind does the resurfacing.",
      cost: { funds: 7 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "funds", amount: 1 }],
      unlocks: [],
      flavor: "High tide cancels practice. Nobody minds.",
      eraId: "pond-hockey",
    }),
    notes: "Ferry becomes real when water traversal ships (Act 2 design).",
  },
  "helsinki-ice-crown": {
    uniqueUnit: U({
      id: "goalie-whisperer",
      name: "Goalie Whisperer",
      category: "development",
      eraId: "pond-hockey",
      description:
        "Finds the quiet ones who stand in front of things, and gently aims them at the crease.",
      cost: { funds: 10 },
      buildMonths: 2,
      abilitySummary: "Unique: goalies appear far more often at your tryouts.",
      flavor: "Says nothing. Sees everything. Mostly five-hole.",
    }),
    uniqueFacility: F({
      id: "netminder-school",
      name: "Netminder School",
      description: "A crease, a chalkboard, and unsettling calm.",
      cost: { funds: 8 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
      unlocks: [],
      flavor: "Lesson one: the puck is not your enemy. Lesson two: it is.",
      eraId: "pond-hockey",
    }),
    notes: "Goalie tryout odds are wired in tryoutSystem.",
  },
  "calgary-iron-herd": {
    uniqueUnit: U(
      {
        id: "barn-raisers",
        name: "Barn Raisers",
        category: "construction",
        eraId: "pond-hockey",
        description:
          "Prairie crews that raise a rink the way they raise a barn: everyone shows up, and it's done by Sunday.",
        cost: { funds: 8 },
        buildMonths: 2,
        requiredTechIds: ["ice-surveying"],
        spawnsMapUnit: "builder",
        abilitySummary:
          "Unique builder: raises Level 1 rinks in a single turn (plus all Rink Rats abilities).",
        flavor: "Bring a hammer, leave a rink.",
      },
      "rink-rats",
    ),
    uniqueFacility: F({
      id: "community-barn",
      name: "Community Barn",
      description: "Half rink storage, half town hall, all hockey.",
      cost: { funds: 7 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "reputation", amount: 1 }],
      unlocks: [],
      flavor: "The potluck schedule is taken more seriously than the standings.",
      eraId: "pond-hockey",
    }),
    notes: "1-month rink builds are wired in builderSystem.",
  },
  "prague-lions": {
    uniqueUnit: U({
      id: "skating-instructor",
      name: "Skating Instructor",
      category: "development",
      eraId: "pond-hockey",
      description:
        "Edges, crossovers, and the belief that skating is a language.",
      cost: { funds: 10 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
      abilitySummary: "+1 Hockey Knowledge / turn; future skating development boost.",
      flavor: "In Prague, falling is merely an unfinished pivot.",
    }),
    uniqueFacility: F({
      id: "skills-hall",
      name: "Skills Hall",
      description: "Mirrors, cones, and a thousand repetitions.",
      cost: { funds: 8 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
      unlocks: [],
      flavor: "The puck moves like a conversation here.",
      eraId: "pond-hockey",
    }),
    notes: "Knowledge-flavored stubs; skill development lands with player XP.",
  },
  "minnesota-nova": {
    uniqueUnit: U({
      id: "warming-house-crew",
      name: "Warming-House Crew",
      category: "recruiting",
      eraId: "pond-hockey",
      description:
        "Keeps the stove lit and the cocoa hot — and somehow everyone in town ends up at your tryouts.",
      cost: { funds: 10 },
      buildMonths: 2,
      abilitySummary: "Unique: +1 candidate at every local tryout.",
      flavor: "The State of Hockey runs on wood stoves and gossip.",
    }),
    uniqueFacility: F({
      id: "warming-house",
      name: "Warming House",
      description: "The heart of every northern rink: heat, skates, and stories.",
      cost: { funds: 7 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "reputation", amount: 1 }],
      unlocks: [],
      flavor: "Rule one: close the door. Rule two: CLOSE THE DOOR.",
      eraId: "pond-hockey",
    }),
    notes: "+1 tryout candidate is wired in tryoutSystem.",
  },
  "detroit-forge": {
    uniqueUnit: U(
      {
        id: "foundry-crew",
        name: "Foundry Crew",
        category: "construction",
        eraId: "pond-hockey",
        description:
          "Industrial hands that build rinks like machinery and waste nothing on the way.",
        cost: { funds: 8 },
        buildMonths: 2,
        requiredTechIds: ["ice-surveying"],
        spawnsMapUnit: "builder",
        abilitySummary:
          "Unique builder: harvests +1 extra Equipment per grove (plus all Rink Rats abilities).",
        flavor: "Dynasties are not discovered. They are forged.",
      },
      "rink-rats",
    ),
    uniqueFacility: F({
      id: "forge-works",
      name: "Forge Works",
      description: "Sticks, blades, and boards — made here, not bought.",
      cost: { funds: 8 },
      buildMonths: 2,
      effects: [
        { type: "monthlyIncome", resource: "funds", amount: 1 },
        { type: "equipmentPerMonth", amount: 1 },
      ],
      unlocks: [],
      flavor: "The smoke smells faintly of fresh ice. Nobody can explain it.",
      eraId: "pond-hockey",
    }),
    notes: "Harvest bonus wired in builderSystem; Forge Works stocks the shed.",
  },
  "stockholm-frost": {
    uniqueUnit: U({
      id: "systems-architect",
      name: "Systems Architect",
      category: "analytics",
      eraId: "pond-hockey",
      description:
        "Draws hockey the way architects draw buildings: precisely, and in ink.",
      cost: { funds: 10 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
      abilitySummary: "+1 Hockey Knowledge / turn; future systems boost.",
      flavor: "Grace is a system. The system has diagrams.",
    }),
    uniqueFacility: F({
      id: "design-studio",
      name: "Design Studio",
      description: "Whiteboards, blueprints, and elegant breakouts.",
      cost: { funds: 8 },
      buildMonths: 2,
      effects: [{ type: "monthlyIncome", resource: "hockeyKnowledge", amount: 1 }],
      unlocks: [],
      flavor: "Every pass has been drawn at least twice.",
      eraId: "pond-hockey",
    }),
    notes: "Analytics-flavored stubs until team systems exist.",
  },
};

// ---------------------------------------------------------------------------
// Combined registries (base + every unique) — use these for LOOKUPS so owned
// unique units/facilities always resolve. Use unitsForClub/facilitiesForClub
// for AVAILABILITY (what a given club can actually produce).
// ---------------------------------------------------------------------------

const uniqueUnitDefs = Object.values(CLUB_UNIQUES)
  .map((u) => u.uniqueUnit?.def)
  .filter((d): d is UnitDef => !!d);
const uniqueFacilityDefs = Object.values(CLUB_UNIQUES)
  .map((u) => u.uniqueFacility?.def)
  .filter((d): d is FacilityDef => !!d);

export const ALL_UNIT_DEFS_BY_ID: Record<string, UnitDef> = {
  ...UNITS_BY_ID,
  ...Object.fromEntries(uniqueUnitDefs.map((d) => [d.id, d])),
};

export const ALL_FACILITY_DEFS_BY_ID: Record<string, FacilityDef> = {
  ...FACILITIES_BY_ID,
  ...Object.fromEntries(uniqueFacilityDefs.map((d) => [d.id, d])),
};

// The production list for a club: base defs with replaced ids swapped for the
// club's uniques, plus any non-replacing uniques appended.
export function unitsForClub(clubId: string | null | undefined): UnitDef[] {
  const unique = clubId ? CLUB_UNIQUES[clubId]?.uniqueUnit : undefined;
  if (!unique) return UNITS;
  const list = UNITS.filter((u) => u.id !== unique.replacesUnitId);
  const replaceIdx = UNITS.findIndex((u) => u.id === unique.replacesUnitId);
  if (replaceIdx >= 0) list.splice(replaceIdx, 0, unique.def);
  else list.push(unique.def);
  return list;
}

export function facilitiesForClub(
  clubId: string | null | undefined,
): FacilityDef[] {
  const unique = clubId ? CLUB_UNIQUES[clubId]?.uniqueFacility : undefined;
  if (!unique) return FACILITIES;
  const list = FACILITIES.filter((f) => f.id !== unique.replacesFacilityId);
  return [...list, unique.def];
}

export function isUniqueItemId(id: string): boolean {
  return (
    uniqueUnitDefs.some((d) => d.id === id) ||
    uniqueFacilityDefs.some((d) => d.id === id)
  );
}

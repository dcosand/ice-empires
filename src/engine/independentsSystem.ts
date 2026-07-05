import type {
  GameState,
  OrgRelationshipLevel,
  WorldHockeyOrg,
} from "../types/game";
import { isAdjacent } from "./world";
import { allScouts } from "./scoutSystem";
import { awardScoutXp, awardScoutXpDraft } from "./scoutStaff";
import { SCOUT_XP_FIRST_CONTACT } from "../data/scouts";
import { prependLog } from "./log";
import type { PushLog } from "./turnContext";

// Independents (neutral hockey orgs) are the city-state analog. This module
// owns first contact, the relationship/influence ladder, and the ledger's
// actions. See docs/11_INDEPENDENTS_AND_FEEDER_SYSTEM.md for the target design;
// Act 2 adds scouting networks (prospect reveal) and Anchor Club competition.

export const RELATIONSHIP_TIERS: { level: OrgRelationshipLevel; name: string }[] = [
  { level: 0, name: "Contacted" },
  { level: 1, name: "Friendly" },
  { level: 2, name: "Partner" },
  { level: 3, name: "Affiliate" },
];

// Influence thresholds to reach levels 1..3.
export const INFLUENCE_THRESHOLDS = [10, 25, 50];

export const INTRO_COST_FUNDS = 1;
export const INTRO_REPUTATION_REQUIRED = 3;
export const INTRO_INFLUENCE_GAIN = 5;
const FIRST_CONTACT_REPUTATION = 1;
const FIRST_CONTACT_INFLUENCE = 5;
// Being the FIRST major club to reach an independent pays extra — the race
// across the map matters.
const FIRST_MOVER_REPUTATION = 1;
const FIRST_MOVER_INFLUENCE = 5;

export function tierName(level: OrgRelationshipLevel): string {
  return RELATIONSHIP_TIERS[level]?.name ?? "Contacted";
}

export function levelForInfluence(points: number): OrgRelationshipLevel {
  let level: OrgRelationshipLevel = 0;
  for (let i = 0; i < INFLUENCE_THRESHOLDS.length; i++) {
    if (points >= INFLUENCE_THRESHOLDS[i]) level = (i + 1) as OrgRelationshipLevel;
  }
  return level;
}

export const ARCHETYPE_LABELS: Record<WorldHockeyOrg["archetype"], string> = {
  "minor-club": "Minor Club",
  "junior-league": "Junior League",
  "rink-society": "Rink Society",
  academy: "Academy",
};

export const ARCHETYPE_BLURBS: Record<WorldHockeyOrg["archetype"], string> = {
  "minor-club":
    "A proud local club with a barn, a bar tab, and opinions about everything. They produce sturdy players and long memories.",
  "junior-league":
    "A loose league of town teams. Half organization, half argument — and a steady stream of raw teenage talent.",
  "rink-society":
    "Keepers of the local ice. They know every pond, every frozen morning, and every kid who can really skate.",
  academy:
    "Structured, ambitious, and a little intense. Their graduates can already skate backwards, which around here counts as sorcery.",
};

// Fires after a player unit moves to (x,y): the first time a unit stands next
// to a discovered org, formal first contact opens a meeting scene (one-popup
// rule: encounters and rival meetings take priority; if something is already
// open we simply don't contact this move — walking near them again retries).
export function triggerIndependentContact(
  state: GameState,
  x: number,
  y: number,
): GameState {
  const world = state.world;
  if (!world || state.pendingMeeting || state.pendingEncounter) return state;
  if (!allScouts(world).some((s) => s.x === x && s.y === y)) return state;

  const org = world.hockeyOrgs.find(
    (o) => !o.playerContacted && isAdjacentOrSame({ x, y }, o),
  );
  if (!org) return state;
  // First contact is fieldwork — the scout who walked there earns XP (D29).
  const finder = allScouts(world).find((s) => s.x === x && s.y === y);
  return awardScoutXp(makeContact(state, org.id), finder?.id, SCOUT_XP_FIRST_CONTACT);
}

// Monthly sweep: a unit parked beside an org (or an org discovered by other
// means) still gets its meeting. Mirrors checkRivalContactAtScouts.
export function checkIndependentContact(draft: GameState, push: PushLog): void {
  if (draft.pendingMeeting || draft.pendingEncounter) return;
  const world = draft.world;
  if (!world) return;
  const units = allScouts(world);
  if (units.length === 0) return;
  const org = world.hockeyOrgs.find(
    (o) => !o.playerContacted && units.some((u) => isAdjacentOrSame(u, o)),
  );
  if (!org) return;
  const finder = units.find((u) => isAdjacentOrSame(u, org));
  awardScoutXpDraft(draft, finder?.id, SCOUT_XP_FIRST_CONTACT);
  const firstMover = org.contactedByClubIds.length === 0;
  const rep = FIRST_CONTACT_REPUTATION + (firstMover ? FIRST_MOVER_REPUTATION : 0);
  const inf = FIRST_CONTACT_INFLUENCE + (firstMover ? FIRST_MOVER_INFLUENCE : 0);
  org.playerContacted = true;
  org.contactMonth = draft.month;
  org.discovered = true;
  org.influencePoints += inf;
  org.relationshipLevel = levelForInfluence(org.influencePoints);
  draft.resources.reputation += rep;
  draft.pendingMeeting = { kind: "independent", id: org.id };
  push(
    "discovery",
    `First contact: ${org.name}`,
    `Your club formally meets ${org.name}, ${ARCHETYPE_LABELS[org.archetype]}. (+${rep} Reputation, +${inf} Influence${
      firstMover ? " — you are the first major club to reach them" : ""
    })`,
  );
}

function isAdjacentOrSame(
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean {
  return (a.x === b.x && a.y === b.y) || isAdjacent(a, b);
}

function makeContact(state: GameState, orgId: string): GameState {
  const world = state.world!;
  const org = world.hockeyOrgs.find((o) => o.id === orgId)!;
  const firstMover = org.contactedByClubIds.length === 0;
  const rep = FIRST_CONTACT_REPUTATION + (firstMover ? FIRST_MOVER_REPUTATION : 0);
  const inf = FIRST_CONTACT_INFLUENCE + (firstMover ? FIRST_MOVER_INFLUENCE : 0);
  const influence = org.influencePoints + inf;
  const next: GameState = {
    ...state,
    resources: {
      ...state.resources,
      reputation: state.resources.reputation + rep,
    },
    world: {
      ...world,
      hockeyOrgs: world.hockeyOrgs.map((o) =>
        o.id === orgId
          ? {
              ...o,
              discovered: true,
              playerContacted: true,
              contactMonth: state.month,
              influencePoints: influence,
              relationshipLevel: levelForInfluence(influence),
            }
          : o,
      ),
    },
    pendingMeeting: { kind: "independent", id: orgId },
  };
  return prependLog(
    next,
    "discovery",
    `First contact: ${org.name}`,
    `Your club formally meets ${org.name}, ${ARCHETYPE_LABELS[org.archetype]}. (+${rep} Reputation, +${inf} Influence${
      firstMover ? " — you are the first major club to reach them" : ""
    })`,
  );
}

// ---------------------------------------------------------------------------
// Ledger actions
// ---------------------------------------------------------------------------

export type IntroGate = "ok" | "no-tech" | "no-standing" | "no-funds" | "not-contacted";

export function introGate(state: GameState, orgId: string): IntroGate {
  const org = state.world?.hockeyOrgs.find((o) => o.id === orgId);
  if (!org?.playerContacted) return "not-contacted";
  if (!state.completedResearch.includes("first-contact")) return "no-tech";
  if (state.resources.reputation < INTRO_REPUTATION_REQUIRED) return "no-standing";
  if (state.resources.funds < INTRO_COST_FUNDS) return "no-funds";
  return "ok";
}

export function introGateHint(gate: IntroGate): string {
  switch (gate) {
    case "no-tech":
      return "Research First Contact to open formal introductions.";
    case "no-standing":
      return `Needs Reputation ${INTRO_REPUTATION_REQUIRED}+ — they haven't heard enough about you yet.`;
    case "no-funds":
      return `Needs ${INTRO_COST_FUNDS} Fund for the trip and the coffee.`;
    case "not-contacted":
      return "Meet them on the map first.";
    default:
      return "";
  }
}

export function canSendIntroduction(state: GameState, orgId: string): boolean {
  return introGate(state, orgId) === "ok";
}

export function sendIntroduction(state: GameState, orgId: string): GameState {
  if (!canSendIntroduction(state, orgId)) return state;
  const world = state.world!;
  const org = world.hockeyOrgs.find((o) => o.id === orgId)!;
  const influence = org.influencePoints + INTRO_INFLUENCE_GAIN;
  const newLevel = levelForInfluence(influence);
  const leveled = newLevel > org.relationshipLevel;

  const next: GameState = {
    ...state,
    resources: { ...state.resources, funds: state.resources.funds - INTRO_COST_FUNDS },
    world: {
      ...world,
      hockeyOrgs: world.hockeyOrgs.map((o) =>
        o.id === orgId
          ? { ...o, influencePoints: influence, relationshipLevel: newLevel }
          : o,
      ),
    },
  };
  return prependLog(
    next,
    "discovery",
    leveled
      ? `${org.name} now ${tierName(newLevel)}`
      : `Introduction sent to ${org.name}`,
    leveled
      ? `Your envoys are welcomed like old friends — the relationship deepens to ${tierName(newLevel)}. (+${INTRO_INFLUENCE_GAIN} Influence)`
      : `A visit, a handshake, and talk of hockey futures. (+${INTRO_INFLUENCE_GAIN} Influence)`,
  );
}

// Rival majors quietly court independents: any rival unit or HQ adjacent to
// an org adds that club to its contact list AND grows that rival's influence
// there each month it stays close. This is the seed of Act II's Anchor Club
// race — the player can already watch rivals out-hustle them in the ledger.
const RIVAL_COURT_INFLUENCE = 2;
const RIVAL_FIRST_CONTACT_INFLUENCE = 5;

export function trackRivalOrgContacts(draft: GameState): void {
  const world = draft.world;
  if (!world) return;
  for (const org of world.hockeyOrgs) {
    for (const rival of world.rivals) {
      const points = [rival.hqTile, ...rival.units];
      const near = points.some((p) => isAdjacentOrSame(p, org));
      if (!near) continue;
      if (!org.contactedByClubIds.includes(rival.clubId)) {
        org.contactedByClubIds.push(rival.clubId);
        org.rivalInfluence[rival.clubId] =
          (org.rivalInfluence[rival.clubId] ?? 0) + RIVAL_FIRST_CONTACT_INFLUENCE;
      } else {
        org.rivalInfluence[rival.clubId] =
          (org.rivalInfluence[rival.clubId] ?? 0) + RIVAL_COURT_INFLUENCE;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Territory → contention (D35): a standing rink inside an independent's zone
// is a permanent courtship — the club that builds near an indie out-influences
// the club that merely visits. Player rinks pay only after formal contact
// (influence you can't see isn't a mechanic); a rival's rink counts as their
// contact — you don't raise boards next door anonymously.
// ---------------------------------------------------------------------------

export const ORG_ZONE_RADIUS = 3; // Chebyshev — an independent's local ice
const RINK_PRESENCE_INFLUENCE = 1; // per club per month, not per rink

function rinkInZone(
  rinks: { x: number; y: number; level: number; ownerClubId?: string }[],
  org: WorldHockeyOrg,
  ownerClubId: string | undefined,
): boolean {
  return rinks.some(
    (r) =>
      r.ownerClubId === ownerClubId &&
      r.level >= 1 &&
      Math.max(Math.abs(r.x - org.x), Math.abs(r.y - org.y)) <= ORG_ZONE_RADIUS,
  );
}

export function accrueRinkPresence(draft: GameState, push: PushLog): void {
  const world = draft.world;
  if (!world) return;
  for (const org of world.hockeyOrgs) {
    if (org.playerContacted && rinkInZone(world.rinks, org, undefined)) {
      org.influencePoints += RINK_PRESENCE_INFLUENCE;
      const newLevel = levelForInfluence(org.influencePoints);
      if (newLevel > org.relationshipLevel) {
        org.relationshipLevel = newLevel;
        push(
          "discovery",
          `${org.name} now ${tierName(newLevel)}`,
          `Your rink on their doorstep does the quiet diplomatic work — the relationship deepens to ${tierName(newLevel)}.`,
        );
      }
    }
    for (const rival of world.rivals) {
      if (!rinkInZone(world.rinks, org, rival.clubId)) continue;
      if (!org.contactedByClubIds.includes(rival.clubId)) {
        org.contactedByClubIds.push(rival.clubId);
        org.rivalInfluence[rival.clubId] =
          (org.rivalInfluence[rival.clubId] ?? 0) + RIVAL_FIRST_CONTACT_INFLUENCE;
      } else {
        org.rivalInfluence[rival.clubId] =
          (org.rivalInfluence[rival.clubId] ?? 0) + RINK_PRESENCE_INFLUENCE;
      }
    }
  }
}

// Who's winning this independent's favor (the player included)?
export function leadingSuitor(
  org: WorldHockeyOrg,
): { clubId: string | null; influence: number } {
  let clubId: string | null = null; // null = the player
  let influence = org.influencePoints;
  for (const [id, pts] of Object.entries(org.rivalInfluence)) {
    if (pts > influence) {
      clubId = id;
      influence = pts;
    }
  }
  return { clubId, influence };
}

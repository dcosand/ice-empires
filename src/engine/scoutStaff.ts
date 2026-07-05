import type {
  GameState,
  ScoutCharacter,
  ScoutQualityTier,
} from "../types/game";
import {
  SCOUT_NOTES,
  SCOUT_TIERS_BY_ID,
  SCOUT_XP_PER_PROMOTION,
} from "../data/scouts";
import { nextRandom } from "./rng";
import type { PushLog } from "./turnContext";
import {
  type NationalitySource,
  rollPersonIdentity,
} from "./playerGen";

// Scout characters (D29/D31): every map scout unit is a named PERSON with two
// judging attributes that improve through fieldwork. Builders never get
// characters. The character's id === the WorldUnit id it rides on.

const ATTR_CAP = 20;

export function scoutCharacterFor(
  state: GameState,
  unitId: string | undefined,
): ScoutCharacter | null {
  if (!unitId) return null;
  return state.scoutStaff.find((s) => s.id === unitId) ?? null;
}

// Funds price for a scout unit at a quality tier (base cost × tier multiplier).
export function scoutTierCost(baseFunds: number, tier: ScoutQualityTier): number {
  return Math.round(baseFunds * SCOUT_TIERS_BY_ID[tier].costMultiplier);
}

// Roll a new scout character. Threads the seed Civ-style (D3) — callers write
// the returned seed back to state.
export function rollScoutCharacter(
  seed: number,
  unitId: string,
  tier: ScoutQualityTier,
  month: number,
  nationalitySource?: NationalitySource | null,
  usedNames?: Set<string>,
): { character: ScoutCharacter; seed: number } {
  const def = SCOUT_TIERS_BY_ID[tier];
  const identity = rollPersonIdentity(
    seed,
    nationalitySource,
    "staffFemale",
    usedNames,
  );
  const r4 = nextRandom(identity.seed);
  const r5 = nextRandom(r4.seed);
  const r6 = nextRandom(r5.seed);

  const roll = (v: number) => def.attrMin + 1 + Math.floor(v * def.attrDie);

  return {
    seed: r6.seed,
    character: {
      id: unitId,
      name: identity.name,
      nationality: identity.nationality,
      tier,
      judgingPotential: Math.min(ATTR_CAP, roll(r4.value)),
      judgingAbility: Math.min(ATTR_CAP, roll(r5.value)),
      xp: 0,
      promotions: 0,
      hiredMonth: month,
      note: SCOUT_NOTES[Math.floor(r6.value * SCOUT_NOTES.length)],
    },
  };
}

// Give every characterless map scout a volunteer character (the founding
// buddy, the legacy recruit). Safe to call after any scout-creating action.
export function ensureScoutCharacters(state: GameState): GameState {
  const world = state.world;
  if (!world) return state;
  const uncovered = (world.scouts ?? []).filter(
    (u) => u.id && u.kind !== "builder" && !state.scoutStaff.some((s) => s.id === u.id),
  );
  if (uncovered.length === 0) return state;

  let seed = state.rngSeed;
  const added: ScoutCharacter[] = [];
  const usedNames = new Set(state.scoutStaff.map((s) => s.name));
  for (const unit of uncovered) {
    const rolled = rollScoutCharacter(
      seed,
      unit.id!,
      "volunteer",
      state.month,
      state.club,
      usedNames,
    );
    seed = rolled.seed;
    added.push(rolled.character);
  }
  // The map unit carries the person's name (the overlay shows who's out there).
  const scouts = (world.scouts ?? []).map((u) => {
    const char = added.find((c) => c.id === u.id);
    return char ? { ...u, name: char.name } : u;
  });
  return {
    ...state,
    rngSeed: seed,
    scoutStaff: [...state.scoutStaff, ...added],
    world: { ...world, scouts, scout: scouts.find((u) => u.id === world.scout?.id) ?? world.scout },
  };
}

// XP awards. Promotions are applied by the monthly sweep, not here — awards
// can happen mid-action from both reducer-style and draft-mutation code, so
// both variants exist.
export function awardScoutXp(
  state: GameState,
  unitId: string | undefined,
  amount: number,
): GameState {
  if (!unitId || !state.scoutStaff.some((s) => s.id === unitId)) return state;
  return {
    ...state,
    scoutStaff: state.scoutStaff.map((s) =>
      s.id === unitId ? { ...s, xp: s.xp + amount } : s,
    ),
  };
}

export function awardScoutXpDraft(
  draft: GameState,
  unitId: string | undefined,
  amount: number,
): void {
  const char = draft.scoutStaff.find((s) => s.id === unitId);
  if (char) char.xp += amount;
}

// Monthly sweep: turn banked XP into promotions (+1 to the weaker judging
// attribute; ties favor Judging Potential — ceilings are the harder read).
export function applyScoutPromotions(draft: GameState, push: PushLog): void {
  for (const s of draft.scoutStaff) {
    while (
      s.promotions < Math.floor(s.xp / SCOUT_XP_PER_PROMOTION) &&
      (s.judgingPotential < ATTR_CAP || s.judgingAbility < ATTR_CAP)
    ) {
      s.promotions += 1;
      if (
        s.judgingPotential <= s.judgingAbility &&
        s.judgingPotential < ATTR_CAP
      ) {
        s.judgingPotential += 1;
        push(
          "discovery",
          `${s.name} promoted`,
          `All that fieldwork sharpens the eye — Judging Potential rises to ${s.judgingPotential}.`,
        );
      } else if (s.judgingAbility < ATTR_CAP) {
        s.judgingAbility += 1;
        push(
          "discovery",
          `${s.name} promoted`,
          `All that fieldwork sharpens the eye — Judging Ability rises to ${s.judgingAbility}.`,
        );
      }
    }
  }
}

// XP progress toward the next promotion, for the UI (e.g. "3/5 XP").
export function xpToNextPromotion(s: ScoutCharacter): {
  have: number;
  need: number;
} {
  return {
    have: s.xp - s.promotions * SCOUT_XP_PER_PROMOTION,
    need: SCOUT_XP_PER_PROMOTION,
  };
}

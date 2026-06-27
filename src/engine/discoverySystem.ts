import type {
  DiscoveryPriorityId,
  GameState,
  RegionDef,
} from "../types/game";
import { REGIONS, REGIONS_BY_ID } from "../data/regions";
import { addResources } from "./resources";
import type { PushLog } from "./turnContext";
import { nextRandom } from "./rng";
import { grantRandomCard } from "./cardSystem";
import { hasUnlock } from "./researchSystem";

export function selectDiscoveryPriority(
  state: GameState,
  priorityId: DiscoveryPriorityId,
): GameState {
  return {
    ...state,
    discovery: { ...state.discovery, activePriorityId: priorityId },
  };
}

function hiddenRegions(draft: GameState, unusualOnly = false): RegionDef[] {
  return REGIONS.filter((r) => {
    const s = draft.discovery.regionStates[r.id];
    const isHidden = !s || s === "hidden";
    return isHidden && (!unusualOnly || r.unusual);
  });
}

// Reveal a region as "discovered", apply yields + Arizona nontraditional bonus.
function revealRegion(draft: GameState, region: RegionDef, push: PushLog): void {
  draft.discovery.regionStates[region.id] = "discovered";
  draft.resources = addResources(draft.resources, region.potentialYields);

  push(
    "discovery",
    `Discovered ${region.name}`,
    `${region.scoutReport} (${region.hockeyResource})`,
  );

  const nontraditional =
    region.unusual || region.tags.includes("nontraditional");
  if (nontraditional && draft.club?.startingBonusId === "nontraditional-market") {
    draft.resources = addResources(draft.resources, { reputation: 1 });
    push(
      "discovery",
      "Nontraditional Market bonus",
      `${draft.club.name} gained +1 Reputation for discovering an unusual hockey region.`,
    );
  }
}

// Resolve the selected scouting priority for the month. Uses the seeded RNG in
// draft.rngSeed so outcomes are reproducible and debuggable.
export function resolveDiscovery(draft: GameState, push: PushLog): void {
  const priority = draft.discovery.activePriorityId;
  const roll = nextRandom(draft.rngSeed);
  draft.rngSeed = roll.seed;
  const r = roll.value;
  const deeper = hasUnlock(draft, "deeperDiscovery");

  switch (priority) {
    case "survey-nearby-ice": {
      const pool = hiddenRegions(draft);
      if (pool.length > 0) {
        revealRegion(draft, pool[Math.floor(r * pool.length)], push);
      } else {
        push("discovery", "Nothing new on the ice", "The nearby sheets are all charted. Time to look farther.");
      }
      break;
    }
    case "study-strange-culture": {
      const unusual = hiddenRegions(draft, true);
      const pool = unusual.length > 0 ? unusual : hiddenRegions(draft);
      if (pool.length > 0) {
        revealRegion(draft, pool[Math.floor(r * pool.length)], push);
      } else {
        push("discovery", "The weird places are quiet", "No strange new cultures surfaced this month.");
      }
      break;
    }
    case "follow-prospect-rumor": {
      // Better odds of a card with deeper-discovery research; otherwise a clue.
      const cardChance = deeper ? 0.7 : 0.5;
      if (r < cardChance) {
        const granted = grantRandomCard(
          draft,
          ["raw-desert-winger", "prairie-defenseman", "quiet-lake-goalie"],
          Math.floor(r * 100),
          push,
        );
        if (!granted) revealClue(draft, push);
      } else {
        revealClue(draft, push);
      }
      break;
    }
    case "listen-local-rinks": {
      if (r < 0.45) {
        const granted = grantRandomCard(
          draft,
          ["local-coach", "volunteer-trainer"],
          Math.floor(r * 100),
          push,
        );
        if (granted) break;
      }
      draft.resources = addResources(draft.resources, { reputation: 1 });
      push("discovery", "Word gets around", "Time spent at the local rinks earned +1 Reputation.");
      break;
    }
    case "build-relationships": {
      if (r < 0.5) {
        const pool = hiddenRegions(draft);
        if (pool.length > 0) {
          revealRegion(draft, pool[Math.floor(r * pool.length)], push);
          break;
        }
      }
      const granted = grantRandomCard(
        draft,
        ["volunteer-trainer", "local-coach"],
        Math.floor(r * 100),
        push,
      );
      if (!granted) {
        draft.resources = addResources(draft.resources, { reputation: 1 });
        push("discovery", "A handshake worth keeping", "New connections earned +1 Reputation.");
      }
      break;
    }
  }
}

function revealClue(draft: GameState, push: PushLog): void {
  // Promote a hidden region to "rumored" without fully discovering it.
  const stillHidden = REGIONS.filter(
    (r) => !draft.discovery.regionStates[r.id] || draft.discovery.regionStates[r.id] === "hidden",
  );
  if (stillHidden.length === 0) {
    push("discovery", "Only rumors", "The rumor led nowhere new — this time.");
    return;
  }
  const region = stillHidden[0];
  draft.discovery.regionStates[region.id] = "rumored";
  push(
    "discovery",
    "A rumor takes shape",
    `Whispers point toward ${region.name}. Survey it to confirm.`,
  );
}

export { REGIONS_BY_ID };

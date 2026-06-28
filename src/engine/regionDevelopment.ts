import type { GameState } from "../types/game";
import { REGIONS_BY_ID } from "../data/regions";
import { prependLog } from "./log";
import type { PushLog } from "./turnContext";

// Establishing a Local Connection takes this many months to complete.
export const CONNECTION_MONTHS = 2;
// Reputation/month granted by each influenced region.
export const INFLUENCE_REP_BONUS = 1;

// A surveyed region with no connection already in progress can be developed.
// (One connection effort at a time keeps the early game readable.)
export function canEstablishConnection(
  state: GameState,
  regionId: string,
): boolean {
  return (
    state.discovery.regionStates[regionId] === "surveyed" &&
    !state.discovery.connection
  );
}

export function establishConnection(
  state: GameState,
  regionId: string,
): GameState {
  if (!canEstablishConnection(state, regionId)) return state;
  const region = REGIONS_BY_ID[regionId];
  if (!region) return state;
  const next: GameState = {
    ...state,
    discovery: {
      ...state.discovery,
      connection: { regionId, monthsRemaining: CONNECTION_MONTHS },
    },
  };
  return prependLog(
    next,
    "discovery",
    `Establishing connection: ${region.name}`,
    `Your club begins building ties in ${region.name}. It becomes part of your hockey empire in ${CONNECTION_MONTHS} months.`,
  );
}

// Advance the active connection each month; on completion the region becomes
// "influenced" and starts paying its bonus.
export function progressConnection(draft: GameState, push: PushLog): void {
  const conn = draft.discovery.connection;
  if (!conn) return;
  conn.monthsRemaining -= 1;
  const region = REGIONS_BY_ID[conn.regionId];

  if (conn.monthsRemaining > 0) {
    push(
      "discovery",
      `Building ties: ${region?.name ?? conn.regionId}`,
      `Local connection in ${region?.name ?? "the region"} is taking hold (${conn.monthsRemaining} month${conn.monthsRemaining === 1 ? "" : "s"} to go).`,
    );
    return;
  }

  draft.discovery.regionStates[conn.regionId] = "influenced";
  draft.discovery.connection = null;
  push(
    "discovery",
    `${region?.name ?? "Region"} is now influenced`,
    `${region?.name ?? "The region"} has joined your hockey empire: +${INFLUENCE_REP_BONUS} Reputation/month.`,
  );
}

// How many regions are influenced (used for the monthly Reputation bonus).
export function influencedCount(state: GameState): number {
  return Object.values(state.discovery.regionStates).filter(
    (s) => s === "influenced",
  ).length;
}

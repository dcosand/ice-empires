import type { GameState } from "../types/game";
import { CARDS_BY_ID } from "../data/cards";
import type { PushLog } from "./turnContext";

// Grant a card by id (cards are unique — see DECISIONS.md). No-op if already held
// or unknown. Logs a readable acquisition line.
export function grantCard(
  draft: GameState,
  cardId: string,
  push: PushLog,
): boolean {
  if (draft.cards.some((c) => c.id === cardId)) return false;
  const def = CARDS_BY_ID[cardId];
  if (!def) return false;

  draft.cards.push(def);

  const kind =
    def.type === "staff" ? "joined the club" : "is on your radar";
  push("card", `${def.name} ${kind}`, def.flavor);
  return true;
}

// Pick and grant the first available card matching a predicate, using a seeded
// index. Returns the granted card id, or null if none available.
export function grantRandomCard(
  draft: GameState,
  pool: string[],
  index: number,
  push: PushLog,
): string | null {
  const available = pool.filter(
    (id) => CARDS_BY_ID[id] && !draft.cards.some((c) => c.id === id),
  );
  if (available.length === 0) return null;
  const chosen = available[index % available.length];
  grantCard(draft, chosen, push);
  return chosen;
}

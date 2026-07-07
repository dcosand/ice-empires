import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";

// The chance-encounter popup for a roaming neutral unit (docs/18 "Wandering
// neutral units"). Your scout has a subtle TELL on whether this is a prospect
// worth recruiting or a hostile who'll drop the gloves — but a read is only a
// read. Approach to find out (recruit roll or a scrap → penalty box), or keep
// your distance and let them roam on.
export function WandererScene({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const pending = state.pendingWanderer;
  const wanderer = state.world?.wanderers.find(
    (w) => w.id === pending?.wandererId,
  );
  if (!pending || !wanderer) return null;

  const read = pending.read;
  const copy =
    read === "friendly"
      ? {
          icon: "🧍",
          tone: "good" as const,
          eyebrow: "A wanderer on the ice",
          title: "Someone worth a look",
          tell: "Your scout likes what they see — this one might be worth inviting to lace up. But a read is just a read.",
          approach: "Invite them to play",
        }
      : read === "hostile"
        ? {
            icon: "🥊",
            tone: "bad" as const,
            eyebrow: "A wanderer on the ice",
            title: "Trouble on the ice",
            tell: "Your scout smells a scrap coming. Approach and they may drop the gloves — your scout could end up in the box.",
            approach: "Square up anyway",
          }
        : {
            icon: "❓",
            tone: "neutral" as const,
            eyebrow: "A wanderer on the ice",
            title: "Hard to read",
            tell: "Your scout can't get a clean read on this one. Could be a player. Could be a problem. Only one way to know.",
            approach: "Approach",
          };

  return (
    <div
      className="task-overlay completion-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
    >
      <button
        className="overlay-scrim"
        aria-label="Keep your distance"
        onClick={() => dispatch({ type: "RESOLVE_WANDERER", choice: "ignore" })}
      />
      <div className="completion-sheet">
        <div className={`completion-art encounter-${copy.tone}`}>
          <span className="completion-icon">{copy.icon}</span>
          <span className="completion-glow" />
        </div>
        <div className="completion-copy">
          <div className="eyebrow">{copy.eyebrow}</div>
          <h2>{copy.title}</h2>
          <p>{copy.tell}</p>
          <div className="wanderer-actions">
            <button
              className="btn btn-gold"
              onClick={() =>
                dispatch({ type: "RESOLVE_WANDERER", choice: "approach" })
              }
            >
              {copy.approach}
            </button>
            <button
              className="btn"
              onClick={() =>
                dispatch({ type: "RESOLVE_WANDERER", choice: "ignore" })
              }
            >
              Keep your distance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

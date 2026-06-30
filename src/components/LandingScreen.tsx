import type { Dispatch } from "react";
import type { GameAction } from "../types/game";

const TITLE_BG = "/assets/title%20screen%20background.png";
const TITLE_LOGO = "/assets/ice%20empires%20logo.png";

export function LandingScreen({
  dispatch,
}: {
  dispatch: Dispatch<GameAction>;
}) {
  return (
    <div
      className="title-screen"
      style={{ backgroundImage: `url("${TITLE_BG}")` }}
    >
      <div className="title-scrim" />
      <div className="title-content">
        <img
          className="title-logo"
          src={TITLE_LOGO}
          alt="Ice Empires"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
        <p className="title-tagline">
          Build a hockey civilization from pond ice to dynasty.
        </p>

        <button
          className="btn btn-primary btn-lg title-cta"
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          <span className="title-cta-main">Start New Dynasty</span>
        </button>
      </div>
    </div>
  );
}

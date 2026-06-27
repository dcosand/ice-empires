import type { Dispatch } from "react";
import type { GameAction } from "../types/game";

export function LandingScreen({
  dispatch,
}: {
  dispatch: Dispatch<GameAction>;
}) {
  return (
    <div className="center-screen">
      <div className="center-card">
        <div className="eyebrow">A Hockey Civilization Strategy Game</div>
        <h1 className="title-xl">Ice Empires</h1>
        <p className="subtitle">
          Build a hockey civilization from pond ice to dynasty.
        </p>
        <p className="flavor">
          It starts with almost nothing — a sheet of ice, a stubborn idea, and a
          hockey world you have not yet discovered. Found a club. Survive twelve
          months. See what you become.
        </p>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          Start First 12 Months
        </button>
      </div>
    </div>
  );
}

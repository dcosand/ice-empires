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
          hockey world you have not yet discovered. Found a club. Build it across
          eras. Turn a rumor of hockey into a dynasty.
        </p>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          Start New Dynasty
        </button>
        <div className="cta-subtext">Opening Scenario: First 12 Months</div>
        <div className="faint" style={{ marginTop: 6, fontSize: 12 }}>
          The full campaign spans many years and eras. This scenario covers your
          founding year.
        </div>
      </div>
    </div>
  );
}

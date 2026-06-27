import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUBS, arizonaMonsoon } from "../data/clubs";

export function FoundingScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const club =
    (state.selectedClubId && CLUBS[state.selectedClubId]) || arizonaMonsoon;
  return (
    <div className="center-screen">
      <div className="center-card">
        <div className="eyebrow">Found Your Club</div>
        <h1 className="title-xl" style={{ fontSize: 38 }}>
          {club.name}
        </h1>
        <div className="meta" style={{ justifyContent: "center", display: "flex", gap: 18, marginBottom: 8 }}>
          <span className="pill">
            Leader: <strong>{club.leaderArchetype}</strong>
          </span>
          <span className="pill pill-era">Pond Hockey Era</span>
        </div>
        <p className="flavor">
          A storm is gathering in the desert. There is no arena, no league, no
          pipeline — just ice, stubbornness, and the belief that hockey can grow
          anywhere.
        </p>
        <p className="muted" style={{ textAlign: "left" }}>
          {club.foundingFlavor}
        </p>

        <div className="resource-bar" style={{ marginTop: 18, marginBottom: 22 }}>
          <Stat label="Budget" value={club.startingResources.budget} />
          <Stat label="Operations" value={club.startingResources.operations} />
          <Stat label="Hockey Knowledge" value={club.startingResources.hockeyKnowledge} />
          <Stat label="Reputation" value={club.startingResources.reputation} />
        </div>

        <button
          className="btn btn-gold btn-lg btn-block"
          onClick={() => dispatch({ type: "START_FOUNDING" })}
        >
          Begin the Founding Expedition →
        </button>
        <div className="faint" style={{ marginTop: 8, fontSize: 12 }}>
          You'll lead a Founding Group across the ice and choose where to plant
          the club.
        </div>
        <button
          className="btn btn-block"
          style={{ marginTop: 10 }}
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          ← Choose a different club
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="resource">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

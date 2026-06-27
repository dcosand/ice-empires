import type { Dispatch } from "react";
import type { GameAction } from "../types/game";
import { CLUB_ROSTER } from "../data/clubRoster";

export function ClubSelectScreen({
  dispatch,
}: {
  dispatch: Dispatch<GameAction>;
}) {
  return (
    <div className="center-screen" style={{ justifyContent: "flex-start", paddingTop: 56 }}>
      <div style={{ maxWidth: 980, width: "100%" }}>
        <div className="eyebrow" style={{ textAlign: "center" }}>
          Choose Your Club · Opening Scenario
        </div>
        <h1 className="title-xl" style={{ fontSize: 40, textAlign: "center" }}>
          Found a Hockey Civilization
        </h1>
        <p className="subtitle" style={{ textAlign: "center" }}>
          Every club is a different way to conquer the hockey world. One is
          playable in this scenario — the rest are coming.
        </p>

        <div className="club-grid">
          {CLUB_ROSTER.map((club) => (
            <div
              key={club.id}
              className={`club-card${club.playable ? " playable" : " locked"}`}
              onClick={() =>
                club.playable &&
                dispatch({ type: "SELECT_CLUB", clubId: club.id })
              }
            >
              <div className="club-card-top">
                <span className="club-badge">{club.badge}</span>
                {club.playable ? (
                  <span className="club-tag recommended">Recommended</span>
                ) : (
                  <span className="club-tag soon">Coming Soon</span>
                )}
              </div>
              <div className="club-card-name">{club.name}</div>
              <div className="club-card-region">{club.region}</div>
              <div className="club-card-leader">{club.leader}</div>
              <div className="club-card-fantasy">{club.fantasy}</div>
              {club.playable ? (
                <button
                  className="btn btn-primary btn-block"
                  style={{ marginTop: 12 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "SELECT_CLUB", clubId: club.id });
                  }}
                >
                  Choose {club.name.split(" ")[0]}
                </button>
              ) : (
                <div className="club-locked-note">🔒 Unlocks in a later build</div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            className="btn"
            onClick={() => dispatch({ type: "RESTART" })}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

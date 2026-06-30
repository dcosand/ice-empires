import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction } from "../types/game";
import { CLUB_LIST, clubAsset } from "../data/clubs";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

export function ClubSelectScreen({
  dispatch,
}: {
  dispatch: Dispatch<GameAction>;
}) {
  return (
    <div
      className="center-screen"
      style={{ justifyContent: "flex-start", paddingTop: 44 }}
    >
      <div style={{ maxWidth: 1120, width: "100%" }}>
        <div className="eyebrow" style={{ textAlign: "center" }}>
          Choose Your Club · Opening Scenario
        </div>
        <h1 className="title-xl" style={{ fontSize: 44, textAlign: "center" }}>
          Found a Hockey Civilization
        </h1>
        <p className="subtitle" style={{ textAlign: "center" }}>
          {CLUB_LIST.length} clubs, {CLUB_LIST.length} ways into the hockey
          world. Pick the leader and identity you want to build.
        </p>

        <div className="club-grid">
          {CLUB_LIST.map((club) => (
            <button
              key={club.id}
              className="club-card playable"
              style={{ "--club-accent": club.accent } as CSSProperties}
              onClick={() => dispatch({ type: "SELECT_CLUB", clubId: club.id })}
            >
              {/* Leader portrait is the hero of the card */}
              <div
                className="cc-portrait"
                style={{
                  backgroundImage: `url("${clubAsset(club, "leader")}")`,
                }}
              >
                <div className="cc-portrait-scrim" />
                <img
                  className="cc-logo"
                  src={clubAsset(club, "logo")}
                  alt={`${club.name} logo`}
                  onError={hideOnError}
                />
                <div className="cc-portrait-text">
                  <div className="cc-region">{club.cityRegion}</div>
                  <div className="cc-name">{club.name}</div>
                </div>
              </div>

              <div className="cc-body">
                <div className="cc-leader">{club.leaderArchetype}</div>
                <div className="cc-tagline">{club.tagline}</div>
                <div className="btn btn-primary btn-block btn-lg cc-choose">
                  Choose {club.name.split(" ")[0]} →
                </div>
              </div>
            </button>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button className="btn" onClick={() => dispatch({ type: "RESTART" })}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

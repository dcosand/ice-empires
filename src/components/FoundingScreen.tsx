import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUBS, arizonaMonsoon, clubAsset } from "../data/clubs";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

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
    <div className="center-screen" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div
        className="founding-reveal"
        style={{ "--club-accent": club.accent } as CSSProperties}
      >
        {/* Hero: club background with the logo overlaid */}
        <div
          className="fr-banner"
          style={{ backgroundImage: `url("${clubAsset(club, "background")}")` }}
        >
          <div className="fr-banner-scrim" />
          <div className="eyebrow fr-eyebrow">Found Your Club</div>
          <img
            className="fr-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} logo`}
            onError={hideOnError}
          />
        </div>

        <div className="fr-body">
          {/* Leader portrait, shown large */}
          <figure className="fr-leader">
            <img
              className="fr-leader-img"
              src={clubAsset(club, "leader")}
              alt={`${club.name} leader — ${club.leaderArchetype}`}
              onError={hideOnError}
            />
            <figcaption className="fr-leader-cap">
              <span className="fr-leader-title">{club.leaderArchetype}</span>
              <span className="faint">{club.cityRegion}</span>
            </figcaption>
          </figure>

          <div className="fr-info">
            <h1 className="title-xl" style={{ fontSize: 34, margin: "0 0 8px" }}>
              {club.name}
            </h1>
            <div className="meta" style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="pill">
                Leader: <strong>{club.leaderArchetype}</strong>
              </span>
              <span className="pill pill-era">Pond Hockey Era</span>
            </div>
            <p className="flavor" style={{ margin: "0 0 10px" }}>
              {club.identityText}
            </p>
            <p className="muted">{club.foundingFlavor}</p>

            <div className="resource-bar" style={{ marginTop: 14, marginBottom: 20 }}>
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
              You'll lead your Leader across the ice and choose where to
              plant the club.
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

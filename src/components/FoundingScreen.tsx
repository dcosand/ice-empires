import { useEffect } from "react";
import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUBS, arizonaMonsoon, clubAsset } from "../data/clubs";
import { preloadClubTextures } from "../data/clubTextures";

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

  // Warm Pixi's texture cache while the player reads the founding screen, so the
  // Leader portrait is decoded and ready the instant the iso map mounts.
  useEffect(() => {
    preloadClubTextures(club);
  }, [club]);

  return (
    <main
      className="founding-stage"
      style={
        {
          "--club-accent": club.accent,
          "--club-primary": club.palette.primary,
          "--club-secondary": club.palette.secondary,
          "--founding-bg": `url("${clubAsset(club, "background")}")`,
        } as CSSProperties
      }
    >
      <div
        className="founding-shell"
        aria-label={`${club.name} confirmation`}
      >
        <section className="fr-brand">
          <div className="eyebrow fr-eyebrow">Found Your Club</div>
          <img
            className="fr-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} logo`}
            onError={hideOnError}
          />
          <h1 className="fr-club-name">{club.name}</h1>
          <p className="fr-club-region">{club.cityRegion}</p>
          <p className="fr-club-line">{club.foundingFlavor}</p>
        </section>

        <figure className="fr-leader">
          <img
            className="fr-leader-img"
            src={clubAsset(club, "leader")}
            alt={`${club.name} leader — ${club.leaderArchetype}`}
            onError={hideOnError}
          />
          <figcaption className="fr-leader-cap">
            <span className="fr-leader-kicker">Leader</span>
            <span className="fr-leader-title">{club.leaderArchetype}</span>
          </figcaption>
        </figure>

        <section className="fr-info">
          <div className="fr-info-main">
            <h2 className="fr-decision-title">Confirm the Dynasty</h2>
            <p className="fr-identity">{club.identityText}</p>

            <div className="resource-bar fr-resources">
              <Stat label="Budget" value={club.startingResources.budget} />
              <Stat
                label="Operations"
                value={club.startingResources.operations}
              />
              <Stat
                label="Hockey Knowledge"
                value={club.startingResources.hockeyKnowledge}
              />
              <Stat
                label="Reputation"
                value={club.startingResources.reputation}
              />
            </div>
          </div>

          <div className="fr-actions">
            <button
              className="btn btn-gold btn-lg btn-block fr-primary-action"
              onClick={() => dispatch({ type: "START_FOUNDING" })}
            >
              Found the Club →
            </button>
            <p className="fr-action-note">
              Your home ice is claimed and your first Scout takes to the world —
              production opens right away.
            </p>
            <button
              className="btn btn-block fr-secondary-action"
              onClick={() => dispatch({ type: "START_GAME" })}
            >
              ← Choose a different club
            </button>
          </div>
        </section>
      </div>
    </main>
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

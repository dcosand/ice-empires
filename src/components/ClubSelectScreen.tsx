import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction } from "../types/game";
import { CLUB_LIST, clubAsset } from "../data/clubs";

const CLUB_CARD_META: Record<
  string,
  { flag: string; country: string; portraitPosition: string }
> = {
  arizona: {
    flag: "🇺🇸",
    country: "United States",
    portraitPosition: "50% 16%",
  },
  halifax: { flag: "🇨🇦", country: "Canada", portraitPosition: "50% 13%" },
  helsinki: { flag: "🇫🇮", country: "Finland", portraitPosition: "58% 14%" },
  calgary: { flag: "🇨🇦", country: "Canada", portraitPosition: "45% 13%" },
  prague: { flag: "🇨🇿", country: "Czechia", portraitPosition: "52% 12%" },
  minnesota: {
    flag: "🇺🇸",
    country: "United States",
    portraitPosition: "61% 13%",
  },
  detroit: {
    flag: "🇺🇸",
    country: "United States",
    portraitPosition: "43% 13%",
  },
  stockholm: { flag: "🇸🇪", country: "Sweden", portraitPosition: "50% 13%" },
};

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
          Choose Your Club
        </div>
        <h1 className="title-xl" style={{ fontSize: 44, textAlign: "center" }}>
          Found a Hockey Civilization
        </h1>
        <p className="subtitle" style={{ textAlign: "center" }}>
          {CLUB_LIST.length} clubs, {CLUB_LIST.length} ways into the hockey
          world. Pick the leader and identity you want to build.
        </p>

        <div className="club-grid">
          {CLUB_LIST.map((club) => {
            const cardMeta = CLUB_CARD_META[club.assetKey];

            return (
              <button
                key={club.id}
                className="club-card playable"
                style={
                  {
                    "--club-accent": club.accent,
                    "--portrait-position":
                      cardMeta?.portraitPosition ?? "50% 14%",
                  } as CSSProperties
                }
                onClick={() =>
                  dispatch({ type: "SELECT_CLUB", clubId: club.id })
                }
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
                  {cardMeta && (
                    <span
                      className="cc-flag"
                      role="img"
                      aria-label={`${cardMeta.country} flag`}
                      title={cardMeta.country}
                    >
                      {cardMeta.flag}
                    </span>
                  )}
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
            );
          })}
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

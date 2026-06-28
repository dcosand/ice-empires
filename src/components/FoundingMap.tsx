import { useEffect, useState } from "react";
import type { Dispatch, SyntheticEvent } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUBS, arizonaMonsoon, clubAsset } from "../data/clubs";
import { IsoWorldMap } from "./IsoWorldMap";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

export function FoundingMap({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const world = state.world;
  const [showFoundingMoment, setShowFoundingMoment] = useState(false);
  const club =
    (state.selectedClubId && CLUBS[state.selectedClubId]) || arizonaMonsoon;
  const founded = world?.hqTile ?? null;

  useEffect(() => {
    if (founded) setShowFoundingMoment(true);
  }, [founded]);

  if (!world) return null;

  const founder = world.founder;
  const selected = world.founderSelected;

  return (
    <div className="founding-map-screen">
      <div className="fm-main">
        <div className="fm-header">
          <div className="eyebrow">Founding Phase · Month 0</div>
          <h1 className="title-xl" style={{ fontSize: 30, margin: "4px 0" }}>
            {founded ? `${club.name} is founded` : "Guide Your Leader"}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {founded
              ? "Your home is on the map. This world carries into the season — same HQ, same fog."
              : `Select your Leader, move across this ${world.width}x${world.height} generated world, then found your club on a tile you like.`}
          </p>
        </div>

        <IsoWorldMap state={state} dispatch={dispatch} />

        <div className="fm-legend muted">
          👤 Leader &nbsp;·&nbsp; highlighted tiles are legal moves &nbsp;·&nbsp;
          dark tiles are fog &nbsp;·&nbsp; water is impassable
        </div>
      </div>

      <aside className="fm-side panel">
        <div className="fm-club-head">
          <img
            className="fm-club-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} logo`}
            onError={hideOnError}
          />
          <div>
            <h3 style={{ margin: 0 }}>{club.name}</h3>
            <div className="panel-sub" style={{ margin: 0 }}>
              {club.leaderArchetype}
            </div>
          </div>
        </div>
        <p className="flavor" style={{ margin: "0 0 14px" }}>
          {club.identityText}
        </p>

        {!founded && founder && (
          <>
            <div className="fm-step">
              <strong>1.</strong> Click the 👤 Leader to select it.
            </div>
            <div className="fm-step">
              <strong>2.</strong> Click a highlighted tile to move (1 point each).
            </div>
            <div className="fm-step">
              <strong>3.</strong> Found your club where you want your home.
            </div>

            <div className="fm-moves">
              Moves remaining:{" "}
              <strong>
                {founder.movesRemaining} / {founder.movesPerTurn}
              </strong>
              {!selected && (
                <span className="faint"> · select the Leader first</span>
              )}
              {selected && founder.movesRemaining === 0 && (
                <span className="faint"> · end the founding turn for more</span>
              )}
            </div>

            <button
              className="btn btn-block"
              style={{ marginBottom: 10 }}
              disabled={founder.movesRemaining === founder.movesPerTurn}
              onClick={() => dispatch({ type: "END_FOUNDING_TURN" })}
            >
              End Founding Turn (refill moves)
            </button>

            <button
              className="btn btn-gold btn-lg btn-block"
              disabled={!selected}
              onClick={() => dispatch({ type: "FOUND_CLUB", clubId: club.id })}
            >
              Found {club.name}
            </button>
            {!selected && (
              <div className="faint" style={{ marginTop: 8, fontSize: 12 }}>
                Select the Leader first.
              </div>
            )}
          </>
        )}

        {founded && (
          <>
            <div className="era-banner" style={{ marginBottom: 14 }}>
              <h3>Club HQ established</h3>
              <div className="muted">
                Your Leader becomes your <strong>Club Leadership</strong>{" "}
                and stays at Club HQ. {club.name} enters the Pond Hockey Era.
              </div>
            </div>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => dispatch({ type: "BEGIN_SEASON" })}
            >
              Enter the Pond Hockey Era · Month 1 →
            </button>
          </>
        )}

        <button
          className="btn btn-block"
          style={{ marginTop: 10 }}
          onClick={() => dispatch({ type: "START_GAME" })}
        >
          ← Start over
        </button>
      </aside>

      {founded && showFoundingMoment && (
        <div className="founding-moment" role="dialog" aria-modal="true" aria-label={`${club.name} founded`}>
          <div className="founding-moment-scrim" />
          <div className="founding-moment-card">
            <div className="fmoment-rink-wrap">
              <img
                className="fmoment-rink"
                src={clubAsset(club, "rink")}
                alt={`${club.name} rink`}
                onError={hideOnError}
              />
              <div className="fmoment-sweep" />
            </div>
            <div className="fmoment-body">
              <div className="eyebrow">Club Founded</div>
              <h2>{club.name}</h2>
              <p>
                The first home ice is claimed. The benches are bare, the lights
                hum, and a hockey civilization has a place to begin.
              </p>
              <div className="fmoment-actions">
                <button className="btn" onClick={() => setShowFoundingMoment(false)}>
                  View HQ
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => dispatch({ type: "BEGIN_SEASON" })}
                >
                  Enter Month 1
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

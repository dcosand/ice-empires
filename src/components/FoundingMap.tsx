import type { Dispatch, SyntheticEvent } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUBS, arizonaMonsoon, clubAsset } from "../data/clubs";
import { moveableTiles, tileAt, tileKey } from "../engine/foundingMap";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

const TERRAIN_GLYPH: Record<string, string> = {
  desert: "🏜",
  ice: "🧊",
  plains: "🌾",
  water: "🌊",
};

export function FoundingMap({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const fm = state.foundingMap;
  const club =
    (state.selectedClubId && CLUBS[state.selectedClubId]) || arizonaMonsoon;

  if (!fm) return null;

  const founded = fm.founded;
  const moveable = moveableTiles(fm);
  const onHomeTile = (x: number, y: number) =>
    fm.unit.x === x && fm.unit.y === y;

  return (
    <div className="founding-map-screen">
      <div className="fm-main">
        <div className="fm-header">
          <div className="eyebrow">Founding Phase · Month 0</div>
          <h1 className="title-xl" style={{ fontSize: 30, margin: "4px 0" }}>
            {founded ? `${club.name} is founded` : "Lead the Founding Group"}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {founded
              ? "Your home is on the map. Begin the season when you're ready."
              : "Select the Founding Group, move across the ice to scout, then found your club on a tile you like."}
          </p>
        </div>

        <div
          className="fm-grid"
          style={{
            gridTemplateColumns: `repeat(${fm.width}, var(--tile))`,
          }}
        >
          {Array.from({ length: fm.height }).map((_, y) =>
            Array.from({ length: fm.width }).map((__, x) => {
              const revealed = fm.revealed.includes(tileKey(x, y));
              const tile = tileAt(fm, x, y);
              const isUnit = !founded && onHomeTile(x, y);
              const isHQ = founded && founded.x === x && founded.y === y;
              const canMoveHere = moveable.has(tileKey(x, y));
              const classes = ["fm-tile"];
              if (!revealed) classes.push("fog");
              else classes.push(`terrain-${tile?.terrain}`);
              if (canMoveHere) classes.push("moveable");
              if (isUnit && fm.selected) classes.push("selected");

              return (
                <button
                  key={`${x},${y}`}
                  className={classes.join(" ")}
                  onClick={() => {
                    if (founded) return;
                    if (isUnit) {
                      dispatch({ type: "SELECT_FOUNDING_UNIT" });
                    } else if (canMoveHere && fm.selected) {
                      dispatch({ type: "MOVE_FOUNDING_UNIT", x, y });
                    }
                  }}
                  title={
                    !revealed
                      ? "Unexplored"
                      : `${tile?.terrain}${tile?.valid ? "" : " (impassable)"}`
                  }
                >
                  {isHQ ? (
                    <span className="fm-marker hq">🏒</span>
                  ) : isUnit ? (
                    <span className="fm-marker unit">🧭</span>
                  ) : revealed ? (
                    <span className="fm-terrain-glyph">
                      {TERRAIN_GLYPH[tile?.terrain ?? "plains"]}
                    </span>
                  ) : (
                    <span className="fm-fog-glyph">·</span>
                  )}
                  {isHQ && <span className="fm-tile-label">Club HQ</span>}
                  {isUnit && <span className="fm-tile-label">Founding Group</span>}
                </button>
              );
            }),
          )}
        </div>

        <div className="fm-legend muted">
          🧭 Founding Group &nbsp;·&nbsp; highlighted tiles are moves &nbsp;·&nbsp;
          dark tiles are fog &nbsp;·&nbsp; 🌊 water is impassable
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

        {!founded && (
          <>
            <div className="fm-step">
              <strong>1.</strong> Click the 🧭 Founding Group to select it.
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
                {fm.movesRemaining} / {fm.movesPerTurn}
              </strong>
              {!fm.selected && (
                <span className="faint"> · select the Founding Group first</span>
              )}
              {fm.selected && fm.movesRemaining === 0 && (
                <span className="faint"> · end the founding turn for more</span>
              )}
            </div>

            <button
              className="btn btn-block"
              style={{ marginBottom: 10 }}
              disabled={fm.movesRemaining === fm.movesPerTurn}
              onClick={() => dispatch({ type: "END_FOUNDING_TURN" })}
            >
              End Founding Turn (refill moves)
            </button>

            <button
              className="btn btn-gold btn-lg btn-block"
              disabled={!fm.selected}
              onClick={() => dispatch({ type: "FOUND_CLUB", clubId: club.id })}
            >
              Found {club.name}
            </button>
            {!fm.selected && (
              <div className="faint" style={{ marginTop: 8, fontSize: 12 }}>
                Select the Founding Group first.
              </div>
            )}
          </>
        )}

        {founded && (
          <>
            <div className="era-banner" style={{ marginBottom: 14 }}>
              <h3>Club HQ established</h3>
              <div className="muted">
                The Founding Group becomes your <strong>Club Leadership</strong>.
                {" "}
                {club.name} enters the Pond Hockey Era.
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
    </div>
  );
}

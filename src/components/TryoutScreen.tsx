import { useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type {
  GameAction,
  GameState,
  Player,
  PlayerAttrs,
  TryoutCandidate,
} from "../types/game";
import { clubAsset } from "../data/clubs";
import { ROSTER_CAP } from "../engine/tryoutSystem";
import { turnDateLabel } from "../engine/calendar";
import { playSfx } from "../engine/sfx";
import {
  ATTR_ABBR,
  GOALIE_ATTR_ORDER,
  SKATER_ATTR_ORDER,
} from "../data/attributes";
import { attrValue, computeOverall } from "../engine/ratings";
import { HockeyCard, POSITION_LABEL } from "./HockeyCard";

// AttrBar lives with the shared card now; re-exported so ClubHQScreen's import
// (`from "./TryoutScreen"`) keeps working.
export { AttrBar } from "./HockeyCard";

// One card width + gap, in px — the carousel translates the track by whole
// cells to centre the focused hopeful.
const CELL = 320;
const GAP = 24;

// The tryout: curious locals wobble onto your rink and you glide through them
// like a carousel of hockey cards, comparing each against the players you
// already have. Rendered whenever state.pendingTryout is set; closing dispatches
// CLOSE_TRYOUTS. The club's very first tryout gets letterbox + crowd framing.
export function TryoutScreen({
  state,
  dispatch,
  onOpenPlayerFile,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenPlayerFile?: (candidate: TryoutCandidate) => void;
}) {
  const tryout = state.pendingTryout;
  const club = state.club;

  const [index, setIndex] = useState(0);

  const cinematic = !!tryout?.firstEver;

  if (!tryout) return null;

  const candidates = tryout.candidates;
  const rosterFull = state.roster.length >= ROSTER_CAP;
  const remaining = candidates.filter(
    (c) => !tryout.recruitedIds.includes(c.id),
  );
  const current = candidates[Math.min(index, candidates.length - 1)];
  const isRecruited = current
    ? tryout.recruitedIds.includes(current.id)
    : false;

  const go = (delta: number) => {
    setIndex((i) => {
      const next = Math.max(0, Math.min(candidates.length - 1, i + delta));
      if (next !== i) playSfx("cardFlip");
      return next;
    });
  };

  const finishTryouts = () => dispatch({ type: "CLOSE_TRYOUTS" });
  const goNextOrFinish = () => {
    if (index >= candidates.length - 1) {
      finishTryouts();
      return;
    }
    go(1);
  };

  const sheetStyle = {
    "--club-accent": club?.accent ?? "#38bdf8",
  } as CSSProperties;

  // Centre the focused cell: the track carries 50%-of-viewport side padding
  // (percentage padding resolves against the viewport width), so a px-only
  // shift of one cell per index keeps the focal card dead-centre.
  const trackShift = `translateX(-${index * (CELL + GAP)}px)`;

  return (
    <div
      className={`tryout-screen${cinematic ? " cinematic" : ""}`}
      style={sheetStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Local tryouts"
    >
      {club && (
        <img
          className="tryout-scrimmage-bg"
          src={clubAsset(club, "scrimmage")}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      )}
      <div className="tryout-bg-vignette" />
      <div className="tryout-sheet">
        <div className="tryout-head">
          <div>
            <div className="eyebrow">
              {cinematic ? "Your First Tryout · " : "Local Tryouts · "}
              {turnDateLabel(state.month)}
            </div>
            <h2>Whoever Shows Up</h2>
            <p className="muted" style={{ margin: 0 }}>
              The flyer said "Bring skates. Or courage." They mostly brought
              courage. Slide through the hopefuls, weigh each against the players
              you have, and pick your team — recruiting is free in the pond era.
              Each recruit takes 1 Equipment from the shed.
            </p>
            <p className="muted" style={{ margin: "6px 0 0", fontWeight: 700 }}>
              Roster {state.roster.length}/{ROSTER_CAP} · Equipment in shed:{" "}
              {state.equipment}
            </p>
          </div>
        </div>

        <div className="tryout-carousel">
          <button
            className="pack-nav prev"
            onClick={() => go(-1)}
            disabled={index <= 0}
            aria-label="Previous hopeful"
          >
            ‹
          </button>

          <div className="carousel-viewport">
            <div className="carousel-track" style={{ transform: trackShift }}>
              {candidates.map((c, i) => {
                const recruited = tryout.recruitedIds.includes(c.id);
                const focal = i === index;
                return (
                  <div
                    key={c.id}
                    className={`carousel-cell${focal ? " focal" : " side"}`}
                    style={{ width: CELL }}
                    aria-hidden={!focal}
                    onClick={() => !focal && setIndex(i)}
                  >
                    <HockeyCard
                      subject={c}
                      club={club}
                      flipped
                      recruited={recruited}
                      footer={
                        recruited ? (
                          <div className="tryout-joined">✓ Joined the club</div>
                        ) : focal ? (
                          <div className="tryout-card-actions">
                            <button
                              className="btn"
                              onClick={goNextOrFinish}
                            >
                              Pass
                            </button>
                            <button
                              className="btn btn-gold"
                              data-sfx="manual"
                              disabled={rosterFull}
                              onClick={() => {
                                playSfx("recruit");
                                dispatch({
                                  type: "RECRUIT_PLAYER",
                                  candidateId: c.id,
                                });
                              }}
                            >
                              Recruit
                            </button>
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            className="pack-nav next"
            onClick={() => go(1)}
            disabled={index >= candidates.length - 1}
            aria-label="Next hopeful"
          >
            ›
          </button>
        </div>

        <div className="pack-dots" role="tablist" aria-label="Hopefuls">
          {candidates.map((c, i) => (
            <button
              key={c.id}
              className={`pack-dot${i === index ? " active" : ""}${
                tryout.recruitedIds.includes(c.id) ? " recruited" : ""
              }`}
              onClick={() => setIndex(i)}
              aria-label={`Hopeful ${i + 1}${
                tryout.recruitedIds.includes(c.id) ? " (recruited)" : ""
              }`}
            />
          ))}
        </div>

        <div className="tryout-actions" aria-label="Tryout actions">
          <div className="tryout-actions-status">
            Hopeful {index + 1}/{candidates.length} · {remaining.length} unsigned
          </div>
          <div className="tryout-actions-buttons">
            <button className="btn" onClick={() => go(-1)} disabled={index <= 0}>
              Previous
            </button>
            {current && onOpenPlayerFile && (
              <button className="btn" onClick={() => onOpenPlayerFile(current)}>
                View full file
              </button>
            )}
            {index < candidates.length - 1 && (
              <button className="btn" onClick={goNextOrFinish}>
                Next Hopeful
              </button>
            )}
            <button className="btn btn-primary" onClick={finishTryouts}>
              Finish Tryouts
            </button>
          </div>
        </div>

        {current && !isRecruited && (
          <RosterCompare candidate={current} roster={state.roster} />
        )}

        {rosterFull && remaining.length > 0 && (
          <div className="tryout-foot muted">
            The roster is full — the rest go home as future fans.
          </div>
        )}
      </div>
    </div>
  );
}

// "Is this left winger better than my current forwards?" — a compact table
// stacking the focused hopeful against the players you already have at their
// position, with an arrow where the hopeful beats your best current number.
function RosterCompare({
  candidate,
  roster,
}: {
  candidate: {
    name: string;
    position: Player["position"];
    attrs: PlayerAttrs;
  };
  roster: Player[];
}) {
  const keys: string[] =
    candidate.attrs.kind === "goalie"
      ? [...GOALIE_ATTR_ORDER]
      : [...SKATER_ATTR_ORDER];
  const samePos = roster.filter((p) => p.position === candidate.position);
  const posWord = `${POSITION_LABEL[candidate.position]}s`;
  const ovrOf = (p: { position: Player["position"]; attrs: PlayerAttrs }) =>
    computeOverall(p);

  const bestOf = (key: string) =>
    samePos.length
      ? Math.max(...samePos.map((p) => attrValue(p.attrs, key)))
      : -Infinity;
  const bestOvr = samePos.length ? Math.max(...samePos.map(ovrOf)) : -Infinity;

  return (
    <div className="tryout-compare">
      <div className="compare-head">
        How they'd stack up against your {posWord}
        {samePos.length === 0 && (
          <span className="compare-sub"> — you have none yet, so anyone's a start.</span>
        )}
      </div>
      <div className="compare-scroll">
        <table className="compare-table">
          <thead>
            <tr>
              <th className="c-name">Player</th>
              <th>OVR</th>
              {keys.map((key) => (
                <th key={key}>{ATTR_ABBR[key as keyof typeof ATTR_ABBR]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="c-candidate">
              <td className="c-name">
                {candidate.name} <span className="c-badge">new</span>
              </td>
              <td className={ovrOf(candidate) > bestOvr && samePos.length > 0 ? "c-better" : undefined}>
                {ovrOf(candidate)}
                {ovrOf(candidate) > bestOvr && samePos.length > 0 && (
                  <span className="c-arrow"> ▲</span>
                )}
              </td>
              {keys.map((key) => {
                const v = attrValue(candidate.attrs, key);
                const beatsBest = v > bestOf(key) && samePos.length > 0;
                return (
                  <td key={key} className={beatsBest ? "c-better" : undefined}>
                    {v}
                    {beatsBest && <span className="c-arrow"> ▲</span>}
                  </td>
                );
              })}
            </tr>
            {samePos.map((p) => (
              <tr key={p.id}>
                <td className="c-name">{p.name}</td>
                <td>{ovrOf(p)}</td>
                {keys.map((key) => (
                  <td key={key}>{attrValue(p.attrs, key)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

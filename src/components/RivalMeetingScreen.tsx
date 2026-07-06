import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction, RivalClub } from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { nationalityFlag, nationalityLabel } from "../data/nationalities";
import { turnDateLabel } from "../engine/calendar";
import { setContactMusicActive } from "./BackgroundMusic";

// Rival first-contact backdrop: the club's own wide scene, behind the stage —
// matching the independent meeting beat (which uses the org's background art).

// The first-contact "leader scene" — a Civ-style cinematic beat. Full-viewport
// letterbox, the rival's palette floods the stage, their leader strides in, and
// the player chooses how to greet them. The chosen attitude is stored on the
// rival (RESPOND_MEETING) and will seed diplomacy in later eras.
export function RivalMeetingScreen({
  clubId,
  month,
  dispatch,
  mode = "first-contact",
  rival,
  onClose,
  exhibition,
}: {
  clubId: string;
  month: number;
  dispatch: Dispatch<GameAction>;
  mode?: "first-contact" | "dossier";
  rival?: Pick<RivalClub, "attitude" | "eraId" | "roster"> | null;
  onClose?: () => void;
  // Dossier-mode exhibition challenge (D51): live when the gate passes,
  // otherwise disabled with the gate hint as the sub-line.
  exhibition?: { canPlay: boolean; hint: string; onPlay: () => void };
}) {
  const club = CLUBS[clubId];
  // Reveal the response choices only after the entrance beat has played.
  const [choicesReady, setChoicesReady] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  // Dossier sub-views: the deal menu and the roster read live behind choices.
  const [view, setView] = useState<"actions" | "deal" | "roster">("actions");
  useEffect(() => {
    const t = setTimeout(() => setChoicesReady(true), 1400);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!club) return undefined;
    if (mode !== "first-contact") return undefined;
    setContactMusicActive(true);
    return () => setContactMusicActive(false);
  }, [club?.id, mode]);

  if (!club) return null;

  const stageStyle = {
    "--meet-primary": club.palette.primary,
    "--meet-secondary": club.palette.secondary,
    "--meet-accent": club.accent,
  } as CSSProperties;

  const respond = (attitude: "friendly" | "wary") =>
    dispatch({ type: "RESPOND_MEETING", attitude });

  return (
    <div
      className="meeting-scene"
      style={stageStyle}
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === "first-contact"
          ? `First contact with ${club.name}`
          : `${club.name} leader screen`
      }
    >
      {!bgFailed && (
        <img
          className="meeting-backdrop"
          src={clubAsset(club, "background")}
          alt=""
          aria-hidden
          onError={() => setBgFailed(true)}
        />
      )}
      <div className="meeting-letterbox top" />
      <div className="meeting-letterbox bottom" />
      <div className="meeting-stage">
        <div className="meeting-glow" />
        <img
          className="meeting-portrait"
          src={clubAsset(club, "leader")}
          alt={`${club.leaderArchetype} of ${club.name}`}
          onError={hideOnError}
        />
        <div className="meeting-panel">
          <div className="meeting-eyebrow">
            {mode === "first-contact" ? "First Contact" : "Rival Leader"} ·{" "}
            {turnDateLabel(month)}
          </div>
          <div className="meeting-crest-row">
            <img
              className="meeting-crest"
              src={clubAsset(club, "logo")}
              alt={`${club.name} crest`}
              onError={hideOnError}
            />
            <div>
              <h2 className="meeting-name">{club.name}</h2>
              <div className="meeting-archetype">{club.leaderArchetype}</div>
            </div>
          </div>
          {mode === "first-contact" ? (
            <>
              <p className="meeting-line">
                Out on the open ice, your party meets skaters flying the colors of{" "}
                {club.name}. {club.identityText}
              </p>
              <div className={`meeting-choices${choicesReady ? " ready" : ""}`}>
                <button
                  className="btn btn-primary meeting-choice"
                  onClick={() => respond("friendly")}
                >
                  Extend an open hand
                  <span className="meeting-choice-sub">
                    Trade rumors, part as future friends
                  </span>
                </button>
                <button
                  className="btn meeting-choice"
                  onClick={() => respond("wary")}
                >
                  Take their measure coldly
                  <span className="meeting-choice-sub">
                    Give nothing away — rivals remember
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="meeting-line">
                {club.identityText}
              </p>
              <div className="rival-dossier-meta">
                <span>
                  Stance:{" "}
                  <strong>
                    {rival?.attitude === "friendly"
                      ? "Friendly opening"
                      : rival?.attitude === "wary"
                        ? "Wary opening"
                        : "Unsettled"}
                  </strong>
                </span>
                <span>
                  Era: <strong>{rival?.eraId ?? "unknown"}</strong>
                </span>
              </div>
              {view === "actions" && (
                <div className="meeting-choices ready">
                  <button className="btn meeting-choice" onClick={() => setView("deal")}>
                    Let's make a deal
                    <span className="meeting-choice-sub">Trades, intel, and tech — the negotiating table.</span>
                  </button>
                  <button
                    className={`btn meeting-choice${exhibition?.canPlay ? " btn-gold" : ""}`}
                    disabled={!exhibition?.canPlay}
                    onClick={exhibition?.onPlay}
                  >
                    Arrange exhibition
                    <span className="meeting-choice-sub">
                      {exhibition?.canPlay
                        ? "A friendly, this month — settle it on the ice."
                        : exhibition?.hint ||
                          "Friendly games unlock once both clubs are ready."}
                    </span>
                  </button>
                  <button
                    className="btn meeting-choice"
                    disabled={!rival?.roster?.length}
                    onClick={() => setView("roster")}
                  >
                    See their roster
                    <span className="meeting-choice-sub">
                      {rival?.roster?.length
                        ? "Who your scout saw skating in their colors."
                        : "Nobody has seen them skate yet."}
                    </span>
                  </button>
                  <button className="btn btn-primary meeting-choice" onClick={onClose}>
                    Back to map
                    <span className="meeting-choice-sub">Return to the hockey world.</span>
                  </button>
                </div>
              )}
              {view === "deal" && (
                <div className="meeting-choices ready">
                  <button className="btn meeting-choice" disabled>
                    Make a trade
                    <span className="meeting-choice-sub">Placeholder — player and asset trading arrives later.</span>
                  </button>
                  <button className="btn meeting-choice" disabled>
                    Share intel
                    <span className="meeting-choice-sub">Placeholder — scouting report exchange is not active yet.</span>
                  </button>
                  <button className="btn meeting-choice" disabled>
                    Trade tech
                    <span className="meeting-choice-sub">Placeholder — research diplomacy is planned for a later era.</span>
                  </button>
                  <button className="btn btn-primary meeting-choice" onClick={() => setView("actions")}>
                    Step back from the table
                    <span className="meeting-choice-sub">Nothing to deal today.</span>
                  </button>
                </div>
              )}
              {view === "roster" && rival?.roster && (
                <div className="meeting-roster">
                  <div className="meeting-roster-head">
                    Their bench · {rival.roster.length} players your scout has seen
                  </div>
                  {rival.roster.map((p) => (
                    <div key={p.id} className="meeting-roster-row">
                      <span className="meeting-roster-pos">{p.position}</span>
                      <span className="meeting-roster-name">{p.name}</span>
                      <span
                        className="meeting-roster-nation nation-flag"
                        title={nationalityLabel(p.nationality)}
                      >
                        {nationalityFlag(p.nationality)}
                      </span>
                      <span className="meeting-roster-age">{p.age} yrs</span>
                    </div>
                  ))}
                  <div className="meeting-roster-note">
                    Names and faces only — how good they are takes a scout on
                    assignment, not a handshake.
                  </div>
                  <button className="btn btn-primary meeting-choice" onClick={() => setView("actions")}>
                    Close the book
                    <span className="meeting-choice-sub">Back to the leader.</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

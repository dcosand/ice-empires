import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { GameAction, RivalClub } from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
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
}: {
  clubId: string;
  month: number;
  dispatch: Dispatch<GameAction>;
  mode?: "first-contact" | "dossier";
  rival?: Pick<RivalClub, "attitude" | "eraId"> | null;
  onClose?: () => void;
}) {
  const club = CLUBS[clubId];
  // Reveal the response choices only after the entrance beat has played.
  const [choicesReady, setChoicesReady] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
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
                <button className="btn meeting-choice" disabled>
                  Arrange exhibition
                  <span className="meeting-choice-sub">Placeholder — friendly games will unlock with competition.</span>
                </button>
                <button className="btn btn-primary meeting-choice" onClick={onClose}>
                  Back to map
                  <span className="meeting-choice-sub">Return to the hockey world.</span>
                </button>
              </div>
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

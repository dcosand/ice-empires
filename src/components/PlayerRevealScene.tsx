import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch, SyntheticEvent } from "react";
import type { ClubDef, GameAction, PlayerReveal } from "../types/game";
import { clubAsset } from "../data/clubs";
import { HockeyCard } from "./HockeyCard";
import { playSfx } from "../engine/sfx";

// The signing moment. A player has joined the club — whether the first-ever
// recruit off the tryout ice or a wanderer met on the map — and it deserves a
// beat. Full-viewport letterbox, the club palette floods the stage, a crowd
// murmur swells, and the player's card flips face-up to reveal who they are.
// Shared by both entry points so "our first player" feels identical either way.
export function PlayerRevealScene({
  reveal,
  club,
  dispatch,
}: {
  reveal: PlayerReveal;
  club: ClubDef | null;
  dispatch: Dispatch<GameAction>;
}) {
  const [flipped, setFlipped] = useState(false);
  const [ready, setReady] = useState(false);

  // Play the crowd swell on mount, then flip the card face-up after the beat.
  useEffect(() => {
    playSfx("crowd");
    const flip = setTimeout(() => {
      setFlipped(true);
      playSfx("cardFlip");
    }, 900);
    const panel = setTimeout(() => setReady(true), 1700);
    return () => {
      clearTimeout(flip);
      clearTimeout(panel);
    };
  }, []);

  const stageStyle = {
    "--meet-primary": club?.palette.primary ?? "#0b1f3a",
    "--meet-secondary": club?.palette.secondary ?? "#38bdf8",
    "--meet-accent": club?.accent ?? "#38bdf8",
  } as CSSProperties;

  const { player, source, firstEver } = reveal;
  const roleWord =
    player.position === "G" ? "goalie" : player.position === "D" ? "defender" : "forward";
  const eyebrow = firstEver
    ? "The First Signing"
    : source === "encounter"
      ? "A Wanderer Signs On"
      : source === "signing"
        ? "The Race Is Won"
        : "A New Signing";
  const headline = firstEver
    ? `${club?.name ?? "The club"} has a player`
    : "Welcome to the club";
  const line = firstEver
    ? `For the first time, someone is wearing your colors. ${player.name} — a ${roleWord} out of ${player.origin} — laces up and calls this club home.`
    : source === "encounter"
      ? `${player.name}, a ${roleWord} you met out on the ice, throws in with your club.`
      : source === "signing"
        ? `The reports were right and the handshake held — ${player.name}, the ${roleWord} your scouts circled, is ${player.origin} and wearing your colors.`
        : `${player.name} makes the team as a ${roleWord}.`;

  return (
    <div
      className="reveal-scene"
      style={stageStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`${player.name} joins the club`}
    >
      {club && (
        <img
          className="reveal-bg"
          src={clubAsset(club, "scrimmage")}
          alt=""
          onError={hideOnError}
        />
      )}
      <div className="meeting-letterbox top" />
      <div className="meeting-letterbox bottom" />
      <div className="reveal-stage">
        <div className="meeting-glow" />
        <HockeyCard subject={player} club={club} flipped={flipped} />
        <div className={`reveal-panel${ready ? " ready" : ""}`}>
          <div className="reveal-eyebrow">{eyebrow}</div>
          <h2 className="reveal-headline">{headline}</h2>
          <p className="reveal-line">{line}</p>
          <button
            className="btn btn-gold reveal-continue"
            aria-label="Continue"
            onClick={() => dispatch({ type: "ACKNOWLEDGE_PLAYER_REVEAL" })}
          >
            {player.hasEquipment ? "Hand them a stick" : "Welcome them aboard"}
          </button>
        </div>
      </div>
    </div>
  );
}

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

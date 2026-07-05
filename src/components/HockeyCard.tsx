import type { CSSProperties, ReactNode } from "react";
import type { ClubDef, PlayerAttrs, PlayerPosition, PlayerStyle } from "../types/game";
import { clubAsset } from "../data/clubs";
import {
  ATTR_LABELS,
  GOALIE_ATTR_ORDER,
  POSITION_LABELS,
  SKATER_GROUPS,
} from "../data/attributes";
import { computeOverall, starString, starTier } from "../engine/ratings";

// A flippable hockey card — the shared visual language for candidates (tryout
// pack browsing) and freshly-signed players (the reveal cinematic). The BACK is
// the club's palette + crest, like a real card's reverse; the FRONT is the
// player's profile: OVR + stars + style, grouped 1–100 attribute bars (a
// goalie card shows the six goalie attributes), and a one-line scouting note.
// Both TryoutCandidate and Player satisfy CardSubject.

export type CardSubject = {
  name: string;
  position: PlayerPosition;
  age: number;
  attrs: PlayerAttrs;
  style?: PlayerStyle;
  note: string;
  imageUrl?: string;
};

export const POSITION_LABEL = POSITION_LABELS;

// The card's compact bar list: skaters show the five EA-style group roll-ups;
// goalies show their six real attributes (goaltending is its own mini-game).
export function cardBars(attrs: PlayerAttrs): { label: string; value: number }[] {
  if (attrs.kind === "goalie") {
    return GOALIE_ATTR_ORDER.map((key) => ({
      label: ATTR_LABELS[key],
      value: attrs.goalie[key],
    }));
  }
  return SKATER_GROUPS.map((g) => ({
    label: g.group,
    value: Math.round(
      g.keys.reduce((sum, key) => sum + attrs.skater[key], 0) / g.keys.length,
    ),
  }));
}

export function HockeyCard({
  subject,
  club,
  flipped,
  onToggle,
  footer,
  recruited = false,
}: {
  subject: CardSubject;
  club: ClubDef | null;
  // Controlled flip state: true shows the profile front, false the crest back.
  flipped: boolean;
  onToggle?: () => void;
  // Optional action row (Recruit button / "joined" chip / continue prompt).
  footer?: ReactNode;
  recruited?: boolean;
}) {
  const bars = cardBars(subject.attrs);
  const overall = computeOverall(subject);
  const stars = starTier(overall);

  const style = {
    "--club-accent": club?.accent ?? "#38bdf8",
    "--club-primary": club?.palette.primary ?? "#0b1f3a",
    "--club-secondary": club?.palette.secondary ?? "#38bdf8",
  } as CSSProperties;

  return (
    <div className={`hockey-card${recruited ? " recruited" : ""}`} style={style}>
      <div className={`hc-inner${flipped ? " flipped" : ""}`}>
        {/* BACK — club crest over palette, shown before the reveal */}
        <button
          type="button"
          className="hc-face hc-back"
          onClick={onToggle}
          aria-label={flipped ? undefined : "Flip card to reveal the player"}
          tabIndex={flipped ? -1 : 0}
        >
          {club && (
            <img
              className="hc-back-crest"
              src={clubAsset(club, "logo")}
              alt=""
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
          <span className="hc-back-mark">?</span>
          <span className="hc-back-label">{club?.name ?? "New recruit"}</span>
        </button>

        {/* FRONT — the profile */}
        <div className="hc-face hc-front">
          <div className="hc-portrait">
            <PlayerHeadshot subject={subject} />
            <span className={`pos-badge pos-${subject.position}`}>
              {subject.position}
            </span>
            <span className="hc-ovr" title={`Overall ${overall}`}>
              <strong>{overall}</strong>
              <span className="hc-stars">{starString(stars)}</span>
            </span>
          </div>
          <div className="hc-ident">
            <div className="hc-name">{subject.name}</div>
            <div className="hc-meta">
              {POSITION_LABEL[subject.position]} · Age {subject.age}
              {subject.style ? ` · ${subject.style}` : ""}
            </div>
          </div>
          <div className="hc-attrs">
            {bars.map((a) => (
              <AttrBar key={a.label} label={a.label} value={a.value} />
            ))}
          </div>
          <div className="hc-note">“{subject.note}”</div>
          {footer && <div className="hc-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function PlayerHeadshot({ subject }: { subject: CardSubject }) {
  const hue = hashString(subject.name) % 360;
  const initials = subject.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const fallback = (
    <>
      <svg viewBox="0 0 64 72" className="hc-headshot-silhouette" aria-hidden>
        <circle cx="32" cy="26" r="14" />
        <path d="M8 72c0-15 11-24 24-24s24 9 24 24z" />
      </svg>
      <span className="hc-initials">{initials}</span>
    </>
  );
  return (
    <div className="hc-headshot" style={{ "--hue": hue } as CSSProperties}>
      {subject.imageUrl ? (
        <img
          className="hc-headshot-img"
          src={subject.imageUrl}
          alt=""
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        fallback
      )}
      {subject.imageUrl && <span className="hc-headshot-fallback">{fallback}</span>}
    </div>
  );
}

// A 1–100 attribute bar. Pond-era values (20–45) read as honestly modest.
export function AttrBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="attr-row">
      <span className="attr-label">{label}</span>
      <span className="attr-bar">
        <span
          className="attr-fill"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </span>
      <span className="attr-value">{value}</span>
    </div>
  );
}

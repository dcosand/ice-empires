import type { CSSProperties, ReactNode } from "react";
import type { ClubDef, PlayerAttrs, PlayerPosition } from "../types/game";
import { clubAsset } from "../data/clubs";

// A flippable hockey card — the shared visual language for candidates (tryout
// pack browsing) and freshly-signed players (the reveal cinematic). The BACK is
// the club's palette + crest, like a real card's reverse; the FRONT is the
// player's profile: position, name, what we know (attributes + a one-line
// scouting note). Both TryoutCandidate and Player satisfy CardSubject.

export type CardSubject = {
  name: string;
  position: PlayerPosition;
  age: number;
  attrs: PlayerAttrs;
  note: string;
};

export const ATTR_LABELS: { key: keyof PlayerAttrs; label: string }[] = [
  { key: "skating", label: "Skating" },
  { key: "shooting", label: "Shooting" },
  { key: "passing", label: "Passing" },
  { key: "checking", label: "Checking" },
  { key: "goaltending", label: "Goaltending" },
];

// Goalies show goaltending; skaters hide the (always-1) crease number.
export function attrsForPosition(position: PlayerPosition) {
  return ATTR_LABELS.filter(
    (a) => position === "G" || a.key !== "goaltending",
  );
}

export const POSITION_LABEL: Record<PlayerPosition, string> = {
  F: "Forward",
  D: "Defense",
  G: "Goalie",
};

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
  const attrs = attrsForPosition(subject.position);

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
          </div>
          <div className="hc-ident">
            <div className="hc-name">{subject.name}</div>
            <div className="hc-meta">
              {POSITION_LABEL[subject.position]} · Age {subject.age}
            </div>
          </div>
          <div className="hc-attrs">
            {attrs.map((a) => (
              <AttrBar key={a.key} label={a.label} value={subject.attrs[a.key]} />
            ))}
          </div>
          <div className="hc-note">“{subject.note}”</div>
          {footer && <div className="hc-footer">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

// A player's headshot. Real headshot art will live in a randomizable pool at
// /assets/players/<n>.png (assign a stable one per player via headshotIndex);
// none exists yet, so we render a deterministic tinted monogram keyed to the
// player so every face is visually distinct and stable across renders. When art
// lands: set HEADSHOT_POOL_SIZE > 0 and render the <img> with this as onError.
const HEADSHOT_POOL_SIZE = 0; // number of headshot images available in the pool

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// The pool slot this player would draw (stable per name); unused until art lands.
export function headshotIndex(name: string): number {
  return HEADSHOT_POOL_SIZE > 0 ? hashString(name) % HEADSHOT_POOL_SIZE : -1;
}

export function PlayerHeadshot({ subject }: { subject: CardSubject }) {
  const hue = hashString(subject.name) % 360;
  const initials = subject.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="hc-headshot" style={{ "--hue": hue } as CSSProperties}>
      <svg viewBox="0 0 64 72" className="hc-headshot-silhouette" aria-hidden>
        <circle cx="32" cy="26" r="14" />
        <path d="M8 72c0-15 11-24 24-24s24 9 24 24z" />
      </svg>
      <span className="hc-initials">{initials}</span>
    </div>
  );
}

// A 20-point attribute bar. Pond-era values (1–6) read as honestly tiny.
export function AttrBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="attr-row">
      <span className="attr-label">{label}</span>
      <span className="attr-bar">
        <span
          className="attr-fill"
          style={{ width: `${Math.min(100, (value / 20) * 100)}%` }}
        />
      </span>
      <span className="attr-value">{value}</span>
    </div>
  );
}

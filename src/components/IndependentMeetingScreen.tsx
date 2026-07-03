import { useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState, WorldHockeyOrg } from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";
import { indieAsset } from "../data/independents";
import { turnDateLabel } from "../engine/calendar";
import {
  ARCHETYPE_BLURBS,
  ARCHETYPE_LABELS,
} from "../engine/independentsSystem";

// First contact with an independent hockey org — the city-state meeting beat.
// Reuses the meeting-scene cinematic staging; instead of a leader portrait it
// shows an archetype vignette (SVG scene) since independents have no art yet.
export function IndependentMeetingScreen({
  state,
  orgId,
  dispatch,
  onOpenLedger,
}: {
  state: GameState;
  orgId: string;
  dispatch: Dispatch<GameAction>;
  onOpenLedger: (orgId: string) => void;
}) {
  const org = state.world?.hockeyOrgs.find((o) => o.id === orgId);
  // Bespoke art when this indie has assets; archetype SVG otherwise.
  const [cardFailed, setCardFailed] = useState(false);
  const [bgFailed, setBgFailed] = useState(false);
  if (!org) return null;

  const palette = ARCHETYPE_PALETTES[org.archetype];
  const stageStyle = {
    "--meet-primary": palette.primary,
    "--meet-secondary": palette.secondary,
    "--meet-accent": palette.accent,
  } as CSSProperties;

  const close = () => dispatch({ type: "ACKNOWLEDGE_MEETING" });

  return (
    <div
      className="meeting-scene"
      style={stageStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`First contact with ${hockeyOrgDisplayName(org)}`}
    >
      {!bgFailed && (
        <img
          className="meeting-backdrop"
          src={indieAsset(org, "background")}
          alt=""
          aria-hidden
          onError={() => setBgFailed(true)}
        />
      )}
      <div className="meeting-letterbox top" />
      <div className="meeting-letterbox bottom" />
      <div className="meeting-stage">
        <div className="meeting-glow" />
        <div className="meeting-vignette">
          {!cardFailed ? (
            <img
              className="meeting-indie-card"
              src={indieAsset(org, "card")}
              alt={hockeyOrgDisplayName(org)}
              onError={() => setCardFailed(true)}
            />
          ) : (
            <ArchetypeScene archetype={org.archetype} accent={palette.accent} />
          )}
        </div>
        <div className="meeting-panel">
          <div className="meeting-eyebrow">
            First Contact · Independent · {turnDateLabel(state.month)}
          </div>
          <div className="meeting-crest-row">
            <div>
              <h2 className="meeting-name">{hockeyOrgDisplayName(org)}</h2>
              <div className="meeting-archetype">
                {ARCHETYPE_LABELS[org.archetype]}
              </div>
            </div>
          </div>
          <p className="meeting-line">{ARCHETYPE_BLURBS[org.archetype]}</p>
          <p className="meeting-line" style={{ opacity: 0.7, fontSize: 13 }}>
            They are independent — nobody's farm team, yet. Influence grows
            through visits, reputation, and (in time) a real scouting network.
            Rival clubs will court them too.
          </p>
          <div className="meeting-choices ready">
            <button
              className="btn btn-primary meeting-choice"
              onClick={() => {
                close();
                onOpenLedger(org.id);
              }}
            >
              Open the Independents Ledger
              <span className="meeting-choice-sub">
                Relationships, influence, and their prospect pipeline
              </span>
            </button>
            <button className="btn meeting-choice" onClick={close}>
              Continue
              <span className="meeting-choice-sub">Back to the map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ARCHETYPE_PALETTES: Record<
  WorldHockeyOrg["archetype"],
  { primary: string; secondary: string; accent: string }
> = {
  "minor-club": { primary: "#2b1f16", secondary: "#b98655", accent: "#f0c65c" },
  "junior-league": { primary: "#26161a", secondary: "#c94b4b", accent: "#e88a6a" },
  "rink-society": { primary: "#14231c", secondary: "#74b66d", accent: "#a8d8a0" },
  academy: { primary: "#14202e", secondary: "#7cc4e8", accent: "#b8e0f4" },
};

// Simple SVG vignettes per archetype — placeholder art with intent: a barn
// rink, a bus-and-bracket league, a lantern-lit pond, a drilled academy.
function ArchetypeScene({
  archetype,
  accent,
}: {
  archetype: WorldHockeyOrg["archetype"];
  accent: string;
}) {
  const common = { viewBox: "0 0 200 240", className: "meeting-vignette-svg" };
  switch (archetype) {
    case "minor-club":
      return (
        <svg {...common}>
          <rect width="200" height="240" fill="#1a1210" />
          <circle cx="160" cy="40" r="16" fill="#f4ead8" opacity="0.85" />
          <polygon points="30,120 100,70 170,120" fill="#6e4a2c" />
          <rect x="42" y="120" width="116" height="70" fill="#8a5c34" />
          <rect x="88" y="150" width="26" height="40" fill="#3a2415" />
          <rect x="55" y="132" width="18" height="16" fill="#f2c14e" opacity="0.9" />
          <rect x="128" y="132" width="18" height="16" fill="#f2c14e" opacity="0.9" />
          <ellipse cx="100" cy="212" rx="82" ry="16" fill="#cfe6f2" />
          <line x1="40" y1="212" x2="160" y2="212" stroke={accent} strokeWidth="2" />
        </svg>
      );
    case "junior-league":
      return (
        <svg {...common}>
          <rect width="200" height="240" fill="#170f11" />
          <rect x="26" y="120" width="148" height="52" rx="8" fill="#a83c3c" />
          <rect x="34" y="128" width="30" height="18" fill="#e8d9c2" />
          <rect x="70" y="128" width="30" height="18" fill="#e8d9c2" />
          <rect x="106" y="128" width="30" height="18" fill="#e8d9c2" />
          <circle cx="52" cy="180" r="10" fill="#26161a" stroke="#111" strokeWidth="3" />
          <circle cx="148" cy="180" r="10" fill="#26161a" stroke="#111" strokeWidth="3" />
          <path d="M40 60 h120 M60 60 v22 M140 60 v22 M60 82 h40 M100 82 v20" stroke={accent} strokeWidth="3" fill="none" />
          <ellipse cx="100" cy="216" rx="84" ry="14" fill="#cfe6f2" />
        </svg>
      );
    case "rink-society":
      return (
        <svg {...common}>
          <rect width="200" height="240" fill="#0e1712" />
          <circle cx="44" cy="52" r="14" fill="#f4ead8" opacity="0.7" />
          <polygon points="20,150 60,90 100,150" fill="#1d3327" />
          <polygon points="90,150 140,80 190,150" fill="#25412f" />
          <ellipse cx="100" cy="190" rx="86" ry="22" fill="#bfe3f4" />
          <ellipse cx="100" cy="190" rx="86" ry="22" fill="none" stroke="#eef6fb" strokeWidth="2" />
          <line x1="60" y1="150" x2="60" y2="168" stroke="#6e4a2c" strokeWidth="3" />
          <circle cx="60" cy="146" r="6" fill={accent} opacity="0.95" />
          <line x1="146" y1="146" x2="146" y2="166" stroke="#6e4a2c" strokeWidth="3" />
          <circle cx="146" cy="142" r="6" fill={accent} opacity="0.95" />
        </svg>
      );
    case "academy":
    default:
      return (
        <svg {...common}>
          <rect width="200" height="240" fill="#0d1520" />
          <rect x="40" y="70" width="120" height="70" rx="4" fill="#22384f" />
          <rect x="52" y="82" width="22" height="20" fill="#7cc4e8" opacity="0.8" />
          <rect x="88" y="82" width="22" height="20" fill="#7cc4e8" opacity="0.8" />
          <rect x="124" y="82" width="22" height="20" fill="#7cc4e8" opacity="0.8" />
          <rect x="88" y="112" width="22" height="28" fill="#0d1520" />
          <ellipse cx="100" cy="196" rx="84" ry="18" fill="#dce8ec" />
          <path d="M40 196 q30 -14 60 0 q30 14 60 0" stroke={accent} strokeWidth="2.5" fill="none" />
          <circle cx="64" cy="192" r="3" fill={accent} />
          <circle cx="100" cy="198" r="3" fill={accent} />
          <circle cx="136" cy="192" r="3" fill={accent} />
        </svg>
      );
  }
}

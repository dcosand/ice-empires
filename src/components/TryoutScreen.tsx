import type { CSSProperties, Dispatch } from "react";
import type {
  GameAction,
  GameState,
  PlayerAttrs,
  TryoutCandidate,
} from "../types/game";
import { ROSTER_CAP } from "../engine/tryoutSystem";
import { turnDateLabel } from "../engine/calendar";
import { playSfx } from "../engine/sfx";

// The tryout: curious locals wobble onto your rink and you pick a team.
// Rendered whenever state.pendingTryout is set; closing dispatches
// CLOSE_TRYOUTS. Recruiting is per-candidate, capped by ROSTER_CAP.
export function TryoutScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const tryout = state.pendingTryout;
  const club = state.club;
  if (!tryout) return null;

  const rosterFull = state.roster.length >= ROSTER_CAP;
  const remaining = tryout.candidates.filter(
    (c) => !tryout.recruitedIds.includes(c.id),
  );

  const sheetStyle = {
    "--club-accent": club?.accent ?? "#38bdf8",
  } as CSSProperties;

  return (
    <div
      className="tryout-screen"
      style={sheetStyle}
      role="dialog"
      aria-modal="true"
      aria-label="Local tryouts"
    >
      <div className="founding-moment-scrim" />
      <div className="tryout-sheet">
        <div className="tryout-head">
          <div>
            <div className="eyebrow">Local Tryouts · {turnDateLabel(state.month)}</div>
            <h2>Whoever Shows Up</h2>
            <p className="muted" style={{ margin: 0 }}>
              The flyer said "Bring skates. Or courage." They mostly brought
              courage. Recruiting is free — in the pond era everyone plays for
              the love of it (wages arrive with real contracts, eras from now).
              Each recruit takes 1 Equipment from the shed to gear up.
            </p>
            <p className="muted" style={{ margin: "6px 0 0", fontWeight: 700 }}>
              Roster {state.roster.length}/{ROSTER_CAP} · Equipment in shed:{" "}
              {state.equipment}
            </p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => dispatch({ type: "CLOSE_TRYOUTS" })}
          >
            End Tryout
          </button>
        </div>

        <div className="tryout-gallery">
          {tryout.candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              recruited={tryout.recruitedIds.includes(c.id)}
              disabled={rosterFull}
              onRecruit={() => {
                playSfx("recruit");
                dispatch({ type: "RECRUIT_PLAYER", candidateId: c.id });
              }}
            />
          ))}
        </div>

        {rosterFull && remaining.length > 0 && (
          <div className="tryout-foot muted">
            The roster is full — the rest go home as future fans.
          </div>
        )}
      </div>
    </div>
  );
}

const ATTR_LABELS: { key: keyof PlayerAttrs; label: string }[] = [
  { key: "skating", label: "Skating" },
  { key: "shooting", label: "Shooting" },
  { key: "passing", label: "Passing" },
  { key: "checking", label: "Checking" },
  { key: "goaltending", label: "Goaltending" },
];

const POSITION_LABEL: Record<string, string> = {
  F: "Forward",
  D: "Defense",
  G: "Goalie",
};

function CandidateCard({
  candidate,
  recruited,
  disabled,
  onRecruit,
}: {
  candidate: TryoutCandidate;
  recruited: boolean;
  disabled: boolean;
  onRecruit: () => void;
}) {
  // Goalies show goaltending; skaters hide the (always-1) crease number.
  const attrs = ATTR_LABELS.filter(
    (a) => candidate.position === "G" || a.key !== "goaltending",
  );
  return (
    <div className={`tryout-card${recruited ? " recruited" : ""}`}>
      <div className="tryout-card-top">
        <span className={`pos-badge pos-${candidate.position}`}>
          {candidate.position}
        </span>
        <div>
          <div className="tryout-card-name">{candidate.name}</div>
          <div className="tryout-card-meta">
            {POSITION_LABEL[candidate.position]} · Age {candidate.age}
          </div>
        </div>
      </div>
      <div className="tryout-attrs">
        {attrs.map((a) => (
          <AttrBar
            key={a.key}
            label={a.label}
            value={candidate.attrs[a.key]}
          />
        ))}
      </div>
      <div className="tryout-note">“{candidate.note}”</div>
      {recruited ? (
        <div className="tryout-joined">✓ Joined the club</div>
      ) : (
        <button
          className="btn btn-gold btn-block"
          disabled={disabled}
          onClick={onRecruit}
        >
          Recruit
        </button>
      )}
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

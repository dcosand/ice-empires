import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState, ResourceKey } from "../types/game";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";
import { RESOURCE_LABELS } from "../engine/resources";
import { getMonthlyIncome } from "../engine/selectors";

// The four club resources, folded into the header as icon + number indicators
// (replacing the old standalone resource cards).
const RESOURCE_ORDER: ResourceKey[] = [
  "budget",
  "operations",
  "hockeyKnowledge",
  "reputation",
];

// Civ-VI-style per-resource accent colors (gold money, amber production, sky
// science, violet culture/standing).
const RESOURCE_COLOR: Record<ResourceKey, string> = {
  budget: "#f4c64e",
  operations: "#ef8b4b",
  hockeyKnowledge: "#5ab0e6",
  reputation: "#b58cf0",
};

// Crisp vector icons (inherit `color` via currentColor, so they theme cleanly
// and stay sharp at any zoom — no OS emoji rendering).
function ResourceIcon({ resource }: { resource: ResourceKey }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (resource) {
    case "budget": // coin with a dollar mark
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.6 9.1c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.6.8-2.6 2 0 1.2 1 1.7 2.6 2 1.6.3 2.7.9 2.7 2.1 0 1.3-1.2 2.1-2.8 2.1-1.2 0-2.3-.5-2.7-1.4" />
          <path d="M12 6.2v1.5M12 16.3v1.5" />
        </svg>
      );
    case "operations": // wrench (builds / production)
      return (
        <svg {...common}>
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.5-3.5a6 6 0 0 1-7.9 7.6l-6.7 6.7a2.1 2.1 0 0 1-3-3l6.7-6.7a6 6 0 0 1 7.6-7.9l-3.5 3.5z" />
        </svg>
      );
    case "hockeyKnowledge": // hockey stick + puck
      return (
        <svg {...common}>
          <path d="M16.8 3.8 9 14.6c-.6.8-.3 1.7.7 1.9l4.8.9" />
          <ellipse cx="17.2" cy="18.4" rx="2.1" ry="1.1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "reputation": // star (standing)
    default:
      return (
        <svg {...common} fill="currentColor" stroke="none">
          <path d="M12 2.6l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.66l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" />
        </svg>
      );
  }
}

const RESOURCE_TIP: Record<ResourceKey, string> = {
  budget: "Budget — the club's money. Earned monthly; spent on future costs.",
  operations: "Operations — production. Each month it flows into your active build.",
  hockeyKnowledge:
    "Hockey Knowledge — research. Each month it flows into your active tech.",
  reputation:
    "Reputation — your standing in hockey. Grows by discovery and good deeds.",
};

export function TopBar({
  state,
  dispatch,
  onOpenHQ,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenHQ?: () => void;
}) {
  const era = ERAS[state.eraId];
  const club = state.club;
  const monthLabel =
    state.month > state.maxMonths
      ? `Month ${state.month}`
      : `Month ${state.month} of ${state.maxMonths}`;

  const income = getMonthlyIncome(state);

  const themeStyle = {
    "--club-primary": club?.palette.primary ?? "#0f1d2c",
    "--club-secondary": club?.palette.secondary ?? "#38bdf8",
    "--club-light": club?.palette.light ?? "#eef6fb",
  } as CSSProperties;

  return (
    <div className="topbar" style={themeStyle}>
      <button
        className="topbar-club"
        onClick={onOpenHQ}
        disabled={!onOpenHQ}
        title="Open Club HQ"
      >
        {club && (
          <img
            className="topbar-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} logo`}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        <div className="topbar-club-text">
          <div className="club-name">{club?.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>
            {club?.leaderArchetype}
          </div>
        </div>
      </button>
      <div className="topbar-resources">
        {RESOURCE_ORDER.map((key) => (
          <div
            className="res-chip"
            key={key}
            title={RESOURCE_TIP[key]}
            style={{ "--res-color": RESOURCE_COLOR[key] } as CSSProperties}
          >
            <span className="res-icon">
              <ResourceIcon resource={key} />
            </span>
            <span className="res-value">{state.resources[key]}</span>
            {income[key] !== 0 && (
              <span className={`res-rate${income[key] < 0 ? " down" : ""}`}>
                {income[key] > 0 ? `+${income[key]}` : income[key]}
              </span>
            )}
            <span className="res-name">{RESOURCE_LABELS[key]}</span>
          </div>
        ))}
      </div>
      <div className="meta">
        <span className="pill">
          <strong>{monthLabel}</strong>
        </span>
        <span className="pill pill-era">{era?.name}</span>
        <button className="btn" onClick={() => dispatch({ type: "RESTART" })}>
          Restart
        </button>
      </div>
    </div>
  );
}

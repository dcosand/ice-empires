import { useEffect, useRef, useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState, ResourceKey } from "../types/game";
import { clubAsset } from "../data/clubs";
import { RESEARCH_BY_ID } from "../data/research";
import { getMonthlyIncome } from "../engine/selectors";

// Two currencies + the reputation standing stat, folded into the header as
// icon + number indicators. Equipment is inventory, shown in Team contexts.
const RESOURCE_ORDER: ResourceKey[] = ["funds", "hockeyKnowledge", "reputation"];

// Civ-VI-style per-resource accent colors (gold money/production, sky science,
// violet standing).
const RESOURCE_COLOR: Record<ResourceKey, string> = {
  funds: "#f4c64e",
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
    case "funds": // coin with a dollar mark
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M14.6 9.1c-.5-.9-1.5-1.4-2.6-1.4-1.4 0-2.6.8-2.6 2 0 1.2 1 1.7 2.6 2 1.6.3 2.7.9 2.7 2.1 0 1.3-1.2 2.1-2.8 2.1-1.2 0-2.3-.5-2.7-1.4" />
          <path d="M12 6.2v1.5M12 16.3v1.5" />
        </svg>
      );
    case "hockeyKnowledge": // hockey stick + puck
      return (
        <img src="/assets/images/research.png" alt="" aria-hidden />
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
  funds:
    "Funds — the club's money and muscle. Builds, tryouts, and introductions are paid in full upfront; income refills the treasury each turn.",
  hockeyKnowledge:
    "Hockey Knowledge — research. Each turn it flows into your active tech.",
  reputation:
    "Reputation — your standing in hockey. Never spent: doors open at higher standing.",
};

function turnLabel(turns: number): string {
  return `${turns} turn${turns === 1 ? "" : "s"}`;
}

export function TopBar({
  state,
  onOpenHQ,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onOpenHQ?: () => void;
}) {
  const club = state.club;

  const income = getMonthlyIncome(state);
  const researchDef = state.activeResearch
    ? RESEARCH_BY_ID[state.activeResearch.techId]
    : null;
  const researchTurns =
    state.activeResearch && income.hockeyKnowledge > 0
      ? Math.max(
          1,
          Math.ceil(state.activeResearch.knowledgeRemaining / income.hockeyKnowledge),
        )
      : null;
  const prevFundsRef = useRef(state.resources.funds);
  const [fundsGained, setFundsGained] = useState(false);

  useEffect(() => {
    const previous = prevFundsRef.current;
    prevFundsRef.current = state.resources.funds;
    if (state.resources.funds <= previous) return;
    setFundsGained(false);
    const frame = requestAnimationFrame(() => setFundsGained(true));
    const timer = window.setTimeout(() => setFundsGained(false), 2200);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [state.resources.funds, state.month]);

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
          <span className="topbar-identity">
            <img
              className="topbar-leader"
              src={clubAsset(club, "leader")}
              alt={`${club.leaderArchetype}`}
              title={`You — ${club.leaderArchetype}`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <img
              className="topbar-logo"
              src={clubAsset(club, "logo")}
              alt={`${club.name} logo`}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </span>
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
            className={`res-chip${key === "funds" && fundsGained ? " resource-gain" : ""}`}
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
          </div>
        ))}
        <div
          className="res-chip"
          title="Equipment — sticks & gear in the shed. Harvest branches or build the Equipment Shed; each recruit needs 1 to play."
          style={{ "--res-color": "#8fd18f" } as CSSProperties}
        >
          <span className="res-icon">
            <img
              src="/assets/vendor/game-icons/svg/hockey.svg"
              alt=""
              aria-hidden
              style={{ width: 18, height: 18, filter: "invert(0.85)" }}
            />
          </span>
          <span className="res-value">{state.equipment}</span>
        </div>
      </div>
      <div className="meta">
        {state.activeResearch && researchDef && (
          <div
            className="topbar-research"
            title={`${researchDef.name} is the active research project`}
          >
            <img
              className="topbar-research-icon"
              src="/assets/images/research.png"
              alt=""
              aria-hidden
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <span className="topbar-research-label">Research</span>
            <strong>{researchDef.name}</strong>
            <span>
              {researchTurns
                ? `${turnLabel(researchTurns)} left`
                : "needs knowledge"}
            </span>
          </div>
        )}
        <img
          className="topbar-game-logo"
          src="/assets/images/ice%20empires%20logo.png"
          alt="Ice Empires"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    </div>
  );
}

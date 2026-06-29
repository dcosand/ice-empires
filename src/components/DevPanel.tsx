import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { FACILITIES } from "../data/facilities";
import { RESEARCH } from "../data/research";

// In-app developer panel. Hidden by default; toggled with Cmd/Ctrl+Shift+Period.
// Lets a developer jump the game into any state for testing: reset to turn 1,
// force buildings / research complete or not, and reveal the whole map.
export function DevPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const [open, setOpen] = useState(false);

  // Cmd/Ctrl + Shift + . toggles the panel. e.code stays "Period" even though
  // Shift turns the character into ">".
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Period") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const inGame = !!state.club;
  const hasWorld = !!state.world;
  const rivalCount = state.world?.rivals.length ?? 0;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>🛠 Dev Panel</span>
        <button style={closeBtnStyle} onClick={() => setOpen(false)} title="Hide (⌘⇧.)">
          ✕
        </button>
      </div>

      <div style={sectionStyle}>
        <label style={rowStyle}>
          <input
            type="checkbox"
            checked={state.devRevealAll}
            onChange={(e) => dispatch({ type: "DEV_SET_REVEAL_ALL", value: e.target.checked })}
          />
          <span>Reveal all tiles</span>
        </label>
        <button
          style={hasWorld ? actionBtnStyle : disabledBtnStyle}
          disabled={!hasWorld}
          onClick={() => dispatch({ type: "DEV_REGEN_MAP" })}
          title="Generate a brand-new world with a fresh random seed"
        >
          🗺 Regenerate Map
        </button>
        {!hasWorld && <div style={hintStyle}>Start a game to generate a map first.</div>}
      </div>

      <div style={sectionStyle}>
        <button
          style={inGame ? actionBtnStyle : disabledBtnStyle}
          disabled={!inGame}
          onClick={() => dispatch({ type: "DEV_RESET_TURN1" })}
        >
          ⟲ Reset to Turn 1
        </button>
        {!inGame && <div style={hintStyle}>Found a club first to reset its season.</div>}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Rivals ({rivalCount})</div>
        <button
          style={rivalCount > 0 ? actionBtnStyle : disabledBtnStyle}
          disabled={rivalCount === 0}
          onClick={() => dispatch({ type: "DEV_MEET_RIVAL" })}
          title="Open the leader meeting screen for the nearest rival club"
        >
          🤝 Meet nearest rival
        </button>
        <div style={hintStyle}>
          Enable “Reveal all tiles” to see rival HQs and their scouts on the map.
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Buildings</div>
        {FACILITIES.map((f) => {
          const done = state.facilities.includes(f.id);
          return (
            <label key={f.id} style={rowStyle}>
              <input
                type="checkbox"
                checked={done}
                onChange={() => dispatch({ type: "DEV_TOGGLE_FACILITY", facilityId: f.id })}
              />
              <span>{f.name}</span>
            </label>
          );
        })}
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Research</div>
        {RESEARCH.map((t) => {
          const done = state.completedResearch.includes(t.id);
          return (
            <label key={t.id} style={rowStyle}>
              <input
                type="checkbox"
                checked={done}
                onChange={() => dispatch({ type: "DEV_TOGGLE_RESEARCH", techId: t.id })}
              />
              <span>{t.name}</span>
            </label>
          );
        })}
      </div>

      <div style={footerStyle}>Toggle this panel with ⌘⇧. (Ctrl⇧. on Windows)</div>
    </div>
  );
}

const panelStyle: CSSProperties = {
  position: "fixed",
  left: 16,
  bottom: 16,
  zIndex: 9999,
  width: 240,
  maxHeight: "70vh",
  overflowY: "auto",
  padding: "12px 14px",
  borderRadius: 10,
  background: "rgba(10, 16, 24, 0.94)",
  border: "1px solid rgba(120, 160, 200, 0.35)",
  boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
  color: "#e6eef6",
  font: "13px/1.4 Inter, system-ui, sans-serif",
  backdropFilter: "blur(4px)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 800,
  letterSpacing: 0.3,
  marginBottom: 8,
};

const closeBtnStyle: CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#8aa0b4",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
  padding: 2,
};

const sectionStyle: CSSProperties = {
  paddingTop: 8,
  marginTop: 8,
  borderTop: "1px solid rgba(120, 160, 200, 0.18)",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const sectionTitleStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  color: "#8aa0b4",
  marginBottom: 2,
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  cursor: "pointer",
};

const actionBtnStyle: CSSProperties = {
  background: "#1c3047",
  border: "1px solid rgba(120, 160, 200, 0.4)",
  color: "#e6eef6",
  borderRadius: 6,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 600,
};

const disabledBtnStyle: CSSProperties = {
  ...actionBtnStyle,
  opacity: 0.45,
  cursor: "not-allowed",
};

const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "#8aa0b4",
};

const footerStyle: CSSProperties = {
  marginTop: 10,
  paddingTop: 8,
  borderTop: "1px solid rgba(120, 160, 200, 0.18)",
  fontSize: 11,
  color: "#6b7f93",
};

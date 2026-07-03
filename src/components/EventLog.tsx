import type { GameState } from "../types/game";
import { turnDateLabel } from "../engine/calendar";

export function EventLog({ state }: { state: GameState }) {
  return (
    <div className="panel">
      <h3>Event Log</h3>
      <div className="panel-sub">What happened, newest first.</div>
      <div className="log">
        {state.eventLog.map((e) => (
          <div className={`log-entry type-${e.type}`} key={e.id}>
            <div className="log-month">{turnDateLabel(e.month)}</div>
            <div className="log-title">{e.title}</div>
            <div className="log-msg">{e.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

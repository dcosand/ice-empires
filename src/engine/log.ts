import type { EventLogEntry, GameState, LogType } from "../types/game";

// Builds log entries with stable, unique ids. Pass a running counter so ids
// never collide within or across months.
export function makeLog(
  month: number,
  seq: number,
  type: LogType,
  title: string,
  message: string,
): EventLogEntry {
  return { id: `m${month}-${seq}-${type}`, month, title, message, type };
}

// Prepend a single log entry for an immediate (non-end-of-month) action, e.g.
// recruiting a scout or surveying a region. Returns a new state.
export function prependLog(
  state: GameState,
  type: LogType,
  title: string,
  message: string,
): GameState {
  const entry: EventLogEntry = {
    id: `m${state.month}-a${state.eventLog.length}-${type}`,
    month: state.month,
    title,
    message,
    type,
  };
  return { ...state, eventLog: [entry, ...state.eventLog] };
}

import type { EventLogEntry, GameState, LogType } from "../types/game";

// Builds log entries with stable, unique ids. Pass a running counter so ids
// never collide within or across months. `from` is the inbox sender (D41);
// omitted, the Inbox derives a desk name from the entry type.
export function makeLog(
  month: number,
  seq: number,
  type: LogType,
  title: string,
  message: string,
  from?: string,
): EventLogEntry {
  return { id: `m${month}-${seq}-${type}`, month, title, message, type, from };
}

// Prepend a single log entry for an immediate (non-end-of-month) action, e.g.
// recruiting a scout or surveying a region. Returns a new state.
export function prependLog(
  state: GameState,
  type: LogType,
  title: string,
  message: string,
  from?: string,
): GameState {
  const entry: EventLogEntry = {
    id: `m${state.month}-a${state.eventLog.length}-${type}`,
    month: state.month,
    title,
    message,
    type,
    from,
  };
  return { ...state, eventLog: [entry, ...state.eventLog] };
}

// Inbox triage (D41): mark the given items read — or the whole inbox when no
// ids are passed. Already-read items are untouched (no object churn).
export function markInboxRead(state: GameState, ids?: string[]): GameState {
  const target = ids ? new Set(ids) : null;
  let changed = false;
  const eventLog = state.eventLog.map((e) => {
    if (e.read || (target && !target.has(e.id))) return e;
    changed = true;
    return { ...e, read: true };
  });
  return changed ? { ...state, eventLog } : state;
}

export function unreadCount(state: GameState): number {
  return state.eventLog.reduce((n, e) => n + (e.read ? 0 : 1), 0);
}

import type { EventLogEntry, LogType } from "../types/game";

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

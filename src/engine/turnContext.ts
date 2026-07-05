import type { LogType } from "../types/game";

// Systems push readable log lines through this callback during turn resolution.
// `from` is the inbox sender line (D41) — a scout's name, an org, a rival GM;
// omitted, the Inbox derives a desk name from the entry type.
export type PushLog = (
  type: LogType,
  title: string,
  message: string,
  from?: string,
) => void;

import type { LogType } from "../types/game";

// Systems push readable log lines through this callback during turn resolution.
export type PushLog = (type: LogType, title: string, message: string) => void;

import { useState } from "react";
import type { Dispatch } from "react";
import type { EventLogEntry, GameAction, GameState, LogType } from "../types/game";
import { turnDateLabel } from "../engine/calendar";
import { unreadCount } from "../engine/log";

// The Inbox (D41): the Log promoted to a triage surface. Every entry is a
// message with a sender — scout reports arrive from the scout, rival news
// from the rival wire, month-end numbers from the treasurer. Unread items
// carry a dot; click marks read; filters cut the pile down.

// Desk names for entries that don't carry an explicit sender.
const DESK_NAMES: Record<LogType, string> = {
  resource: "Club Treasurer",
  build: "Operations",
  research: "Hockey Minds",
  discovery: "Scouting Desk",
  card: "Front Office",
  era: "The Club Historian",
  rival: "Rival Wire",
  flavor: "Around the Rink",
};

const FILTERS: { id: LogType | "all" | "unread"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "discovery", label: "Scouting" },
  { id: "rival", label: "Rivals" },
  { id: "build", label: "Club" },
  { id: "resource", label: "Money" },
];

export function Inbox({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const [filter, setFilter] = useState<LogType | "all" | "unread">("all");
  const unread = unreadCount(state);

  const visible = state.eventLog.filter((e) =>
    filter === "all"
      ? true
      : filter === "unread"
        ? !e.read
        : e.type === filter,
  );

  return (
    <div className="panel inbox-panel">
      <div className="inbox-controls">
        <div className="sc-chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`sc-chip${filter === f.id ? " on" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.id === "unread" && unread > 0 ? ` (${unread})` : ""}
            </button>
          ))}
        </div>
        <button
          className="btn"
          disabled={unread === 0}
          onClick={() => dispatch({ type: "MARK_INBOX_READ" })}
        >
          Mark all read
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="faint">
          {filter === "unread"
            ? "All caught up — nothing unread."
            : "Nothing here yet."}
        </div>
      ) : (
        <div className="inbox-list">
          {visible.map((e) => (
            <InboxItem
              key={e.id}
              entry={e}
              onRead={() =>
                !e.read && dispatch({ type: "MARK_INBOX_READ", ids: [e.id] })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InboxItem({
  entry,
  onRead,
}: {
  entry: EventLogEntry;
  onRead: () => void;
}) {
  return (
    <button
      className={`inbox-item type-${entry.type}${entry.read ? "" : " unread"}`}
      onClick={onRead}
    >
      <span className="inbox-dot" aria-hidden />
      <span className="inbox-body">
        <span className="inbox-head">
          <span className="inbox-from">{entry.from ?? DESK_NAMES[entry.type]}</span>
          <span className="inbox-date">{turnDateLabel(entry.month)}</span>
        </span>
        <span className="inbox-title">{entry.title}</span>
        <span className="inbox-msg">{entry.message}</span>
      </span>
    </button>
  );
}

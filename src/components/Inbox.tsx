import { useEffect, useState } from "react";
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
  initialEntryId = null,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  initialEntryId?: string | null;
}) {
  const [filter, setFilter] = useState<LogType | "all" | "unread">("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialEntryId ?? state.eventLog[0]?.id ?? null,
  );
  const unread = unreadCount(state);

  const visible = state.eventLog.filter((e) =>
    filter === "all"
      ? true
      : filter === "unread"
        ? !e.read
        : e.type === filter,
  );
  const selected =
    state.eventLog.find((e) => e.id === selectedId) ??
    visible[0] ??
    state.eventLog[0] ??
    null;

  useEffect(() => {
    if (!initialEntryId) return;
    setFilter("all");
    setSelectedId(initialEntryId);
  }, [initialEntryId]);

  useEffect(() => {
    if (selectedId && visible.some((e) => e.id === selectedId)) return;
    setSelectedId(visible[0]?.id ?? null);
  }, [filter, visible.map((e) => e.id).join("|"), selectedId]);

  useEffect(() => {
    if (selected && !selected.read) {
      dispatch({ type: "MARK_INBOX_READ", ids: [selected.id] });
    }
  }, [dispatch, selected?.id, selected?.read]);

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

      <div className="inbox-workspace">
        {visible.length === 0 ? (
          <div className="inbox-list empty">
            <div className="faint">
              {filter === "unread"
                ? "All caught up — nothing unread."
                : "Nothing here yet."}
            </div>
          </div>
        ) : (
          <div className="inbox-list" role="listbox" aria-label="Inbox messages">
            {visible.map((e) => (
              <InboxItem
                key={e.id}
                entry={e}
                selected={selected?.id === e.id}
                onSelect={() => setSelectedId(e.id)}
              />
            ))}
          </div>
        )}
        <MessagePane entry={selected} />
      </div>
    </div>
  );
}

function InboxItem({
  entry,
  selected,
  onSelect,
}: {
  entry: EventLogEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`inbox-item type-${entry.type}${entry.read ? "" : " unread"}${selected ? " selected" : ""}`}
      onClick={onSelect}
      role="option"
      aria-selected={selected}
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

function MessagePane({ entry }: { entry: EventLogEntry | null }) {
  if (!entry) {
    return (
      <section className="inbox-detail-pane empty">
        <div className="faint">Select a message to read it.</div>
      </section>
    );
  }
  return (
    <article className={`inbox-detail-pane type-${entry.type}`}>
      <div className="inbox-detail-meta">
        <span>{entry.from ?? DESK_NAMES[entry.type]}</span>
        <span>{turnDateLabel(entry.month)}</span>
      </div>
      <h3>{entry.title}</h3>
      <div className="inbox-detail-type">{typeLabel(entry.type)}</div>
      <p>{entry.message}</p>
    </article>
  );
}

function typeLabel(type: LogType): string {
  switch (type) {
    case "resource":
      return "Finance update";
    case "build":
      return "Operations update";
    case "research":
      return "Research update";
    case "discovery":
      return "Scouting update";
    case "card":
      return "Personnel update";
    case "era":
      return "Era progress";
    case "rival":
      return "Rival news";
    case "flavor":
      return "Club news";
  }
}

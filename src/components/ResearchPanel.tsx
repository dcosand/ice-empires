import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { GameAction, GameState } from "../types/game";
import { RESEARCH_BY_ID } from "../data/research";
import {
  getResearchOptions,
  type ResearchOption,
  type ResearchStatus,
} from "../engine/researchSystem";
import { getMonthlyIncome } from "../engine/selectors";
import { ProgressBar } from "./ProgressBar";
import { ItemArt } from "./ItemArt";

export function ResearchPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const groups = useMemo(() => getResearchOptions(state), [state]);
  const active = state.activeResearch;
  const activeDef = active ? RESEARCH_BY_ID[active.techId] : null;
  const hkPerMonth = getMonthlyIncome(state).hockeyKnowledge;
  const slotBusy = !!active;

  const monthsFor = (cost: number) =>
    hkPerMonth > 0 ? Math.max(1, Math.ceil(cost / hkPerMonth)) : Infinity;

  const lookup = useMemo(
    () => groups.flatMap((g) => g.options),
    [groups],
  );

  // Era tiers collapse like production sections; tiers that are entirely locked
  // start collapsed (still browsable, just out of the way).
  const [openEras, setOpenEras] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      groups.map((g) => [g.eraId, g.options.some((o) => o.status !== "locked")]),
    ),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const selected = lookup.find((o) => o.id === selectedId) ?? null;
  const detail = lookup.find((o) => o.id === detailId) ?? null;

  const selectable = (o: ResearchOption) => o.status === "available" && !slotBusy;

  // Drop a stale selection once the slot fills or the pick is no longer open.
  useEffect(() => {
    if (selectedId && (!selected || !selectable(selected))) setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotBusy, selectedId, selected?.status]);

  const onCardClick = (o: ResearchOption) => {
    if (!selectable(o)) {
      setDetailId(o.id);
      return;
    }
    setSelectedId((cur) => (cur === o.id ? null : o.id));
  };

  const confirmStart = () => {
    if (!selected || !selectable(selected)) return;
    dispatch({ type: "SELECT_RESEARCH", techId: selected.id });
    setSelectedId(null);
  };

  return (
    <div className="panel production-panel">
      <div className="panel-sub">
        Funded by Hockey Knowledge (+{hkPerMonth}/mo applied to active research).
        Click a card to select, then confirm — or right-click (or tap ⓘ) for full
        details.
      </div>

      {active && activeDef && (
        <div className="active-banner">
          <div className="active-name">Researching: {activeDef.name}</div>
          <ProgressBar
            fraction={active.progressKnowledge / activeDef.cost}
            left={`${active.progressKnowledge}/${activeDef.cost} Hockey Knowledge`}
            right={
              hkPerMonth > 0
                ? `~${Math.ceil(active.knowledgeRemaining / hkPerMonth)} mo left`
                : "needs knowledge"
            }
          />
        </div>
      )}

      {groups.map((g) => (
        <ResearchSection
          key={g.eraId}
          title={g.eraName}
          count={g.options.length}
          open={openEras[g.eraId] ?? false}
          onToggle={() =>
            setOpenEras((cur) => ({ ...cur, [g.eraId]: !(cur[g.eraId] ?? false) }))
          }
        >
          {g.options.map((opt) => (
            <ResearchCard
              key={opt.id}
              opt={opt}
              selected={opt.id === selectedId}
              selectable={selectable(opt)}
              estMonths={monthsFor(opt.cost)}
              onClick={() => onCardClick(opt)}
              onDetails={() => setDetailId(opt.id)}
            />
          ))}
        </ResearchSection>
      ))}

      <ConfirmBar
        selected={selected}
        slotBusy={slotBusy}
        estMonths={selected ? monthsFor(selected.cost) : Infinity}
        onConfirm={confirmStart}
        onCancel={() => setSelectedId(null)}
      />

      {detail && (
        <DetailsModal
          opt={detail}
          estMonths={monthsFor(detail.cost)}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

function ResearchSection({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="prod-section">
      <button
        type="button"
        className="prod-section-head"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span className={`prod-section-chevron${open ? " open" : ""}`} aria-hidden>
          ▸
        </span>
        <span className="prod-section-title">{title}</span>
        <span className="prod-section-count">{count}</span>
      </button>
      {open && <div className="prod-gallery">{children}</div>}
    </section>
  );
}

function statusBadge(status: ResearchStatus): string | null {
  if (status === "completed") return "✓ Done";
  if (status === "active") return "Researching…";
  return null;
}

function ResearchCard({
  opt,
  selected,
  selectable,
  estMonths,
  onClick,
  onDetails,
}: {
  opt: ResearchOption;
  selected: boolean;
  selectable: boolean;
  estMonths: number;
  onClick: () => void;
  onDetails: () => void;
}) {
  const badge = statusBadge(opt.status);
  const foot =
    opt.status === "available"
      ? estMonths === Infinity
        ? "needs knowledge"
        : `~${estMonths} mo`
      : opt.status === "locked"
        ? opt.lockReason ?? "Locked"
        : opt.status === "completed"
          ? "Researched"
          : "In progress";

  return (
    <div
      className={[
        "prod-card",
        `status-${opt.status}`,
        selected ? "selected" : "",
        !selectable ? "not-selectable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-disabled={!selectable}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onDetails();
      }}
    >
      <div className="prod-card-art-wrap">
        <ItemArt kind="research" id={opt.id} className="prod-card-art" />
        {selected && <span className="prod-card-check" aria-hidden>✓</span>}
        {badge && <span className="prod-card-badge">{badge}</span>}
        <button
          type="button"
          className="prod-card-info"
          aria-label={`${opt.name} details`}
          onClick={(e) => {
            e.stopPropagation();
            onDetails();
          }}
        >
          ⓘ
        </button>
      </div>
      <div className="prod-card-name">{opt.name}</div>
      <div className="prod-card-kind">{opt.unlockSummary}</div>
      <div className="prod-card-cost">
        <span>{opt.cost} HK</span>
      </div>
      <div className="prod-card-foot">{foot}</div>
    </div>
  );
}

function ConfirmBar({
  selected,
  slotBusy,
  estMonths,
  onConfirm,
  onCancel,
}: {
  selected: ResearchOption | null;
  slotBusy: boolean;
  estMonths: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (slotBusy) {
    return (
      <div className="prod-confirm busy">
        <span className="faint">
          Research is already underway — finish it before starting another.
        </span>
      </div>
    );
  }
  if (!selected) {
    return (
      <div className="prod-confirm empty">
        <span className="faint">Select a technology, then confirm to research.</span>
      </div>
    );
  }

  return (
    <div className="prod-confirm ready">
      <div className="prod-confirm-info">
        <ItemArt kind="research" id={selected.id} className="prod-confirm-art" />
        <div>
          <div className="prod-confirm-name">{selected.name}</div>
          <div className="prod-confirm-cost">
            {selected.cost} HK ·{" "}
            {estMonths === Infinity ? "needs knowledge" : `~${estMonths} mo`}
          </div>
        </div>
      </div>
      <div className="prod-confirm-actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={onConfirm}>
          Begin Research
        </button>
      </div>
    </div>
  );
}

function DetailsModal({
  opt,
  estMonths,
  onClose,
}: {
  opt: ResearchOption;
  estMonths: number;
  onClose: () => void;
}) {
  return (
    <div
      className="prod-detail-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${opt.name} details`}
    >
      <button className="overlay-scrim" aria-label="Close details" onClick={onClose} />
      <div className="prod-detail-sheet">
        <div className="prod-detail-head">
          <ItemArt kind="research" id={opt.id} className="prod-detail-art" />
          <div className="prod-detail-titles">
            <div className="prod-detail-name">{opt.name}</div>
            <div className="prod-detail-kind">Technology</div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="prod-detail-desc">{opt.description}</p>
        {opt.flavor && <p className="prod-detail-flavor">{opt.flavor}</p>}
        <div className="prod-detail-rows">
          <DetailRow label="Unlocks" value={opt.unlockSummary} tone="good" />
          <DetailRow label="Cost" value={`${opt.cost} Hockey Knowledge`} />
          <DetailRow
            label="Research time"
            value={
              estMonths === Infinity
                ? "Needs Hockey Knowledge income"
                : `~${estMonths} month${estMonths === 1 ? "" : "s"}`
            }
          />
          <DetailRow
            label="Requirements"
            value={
              opt.status === "locked" && opt.lockReason
                ? opt.lockReason
                : opt.requirementText
            }
            tone={opt.status === "locked" ? "bad" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="prod-detail-row">
      <span className="prod-detail-rlabel">{label}</span>
      <span className={`prod-detail-rvalue${tone ? ` ${tone}` : ""}`}>{value}</span>
    </div>
  );
}

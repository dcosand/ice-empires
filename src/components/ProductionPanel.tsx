import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import type {
  GameAction,
  GameState,
  ResourceKey,
  ResourceSet,
} from "../types/game";
import {
  getProductionOptions,
  type ProductionOption,
  type ProductionStatus,
} from "../engine/productionSystem";
import { getMonthlyIncome } from "../engine/selectors";
import { ItemArt } from "./ItemArt";

const RESOURCE_SHORT: Record<ResourceKey, string> = {
  budget: "Budget",
  operations: "Ops",
  hockeyKnowledge: "HK",
  reputation: "Rep",
};

// Buildable first, then locked, then in-progress, then already-built.
const STATUS_RANK: Record<ProductionStatus, number> = {
  available: 0,
  locked: 1,
  active: 2,
  built: 3,
};

function upfrontChips(cost: Partial<ResourceSet>): string {
  return (Object.entries(cost) as [ResourceKey, number][])
    .map(([res, amt]) => `${amt} ${RESOURCE_SHORT[res]}`)
    .join(" · ");
}

const keyOf = (o: ProductionOption) => `${o.kind}-${o.id}`;

export function ProductionPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const opts = getProductionOptions(state);
  const opsPerMonth = getMonthlyIncome(state).operations;
  const slotBusy = !!state.activeProduction;

  const monthsFor = (cost: number) =>
    opsPerMonth > 0 ? Math.max(1, Math.ceil(cost / opsPerMonth)) : Infinity;

  // One combined view — facilities and units together, no tabs.
  const allOptions = useMemo(
    () =>
      [...opts.facilities, ...opts.units].sort((a, b) => {
        const r = STATUS_RANK[a.status] - STATUS_RANK[b.status];
        if (r !== 0) return r;
        if (a.status === "available")
          return (a.affordable ? 0 : 1) - (b.affordable ? 0 : 1);
        return 0;
      }),
    [opts],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const selected = allOptions.find((o) => keyOf(o) === selectedKey) ?? null;
  const detail = allOptions.find((o) => keyOf(o) === detailKey) ?? null;

  // A card can be picked only when the HQ slot is free and it's buildable.
  const selectable = (o: ProductionOption) => o.status === "available" && !slotBusy;

  // Drop a stale selection if the slot fills or the pick is no longer buildable.
  useEffect(() => {
    if (selectedKey && (!selected || !selectable(selected))) setSelectedKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotBusy, selectedKey, selected?.status]);

  const onCardClick = (o: ProductionOption) => {
    // Not buildable → fall through to details so the player still learns why.
    if (!selectable(o)) {
      setDetailKey(keyOf(o));
      return;
    }
    setSelectedKey((cur) => (cur === keyOf(o) ? null : keyOf(o)));
  };

  const confirmStart = () => {
    if (!selected || !selectable(selected) || !selected.affordable) return;
    dispatch({ type: "START_PRODUCTION", kind: selected.kind, itemId: selected.id });
    setSelectedKey(null);
  };

  return (
    <div className="panel production-panel">
      <div className="panel-sub">
        Club HQ builds one project at a time. Operations production (+{opsPerMonth}/mo)
        funds it; unit Budget/Reputation costs are paid upfront. Click a card to
        select, then confirm — or right-click (or tap ⓘ) for full details.
      </div>

      <div className="prod-gallery">
        {allOptions.map((opt) => (
          <ProductionCard
            key={keyOf(opt)}
            opt={opt}
            selected={keyOf(opt) === selectedKey}
            selectable={selectable(opt)}
            estMonths={monthsFor(opt.opsCost)}
            onClick={() => onCardClick(opt)}
            onDetails={() => setDetailKey(keyOf(opt))}
          />
        ))}
        {allOptions.length === 0 && <div className="faint">Nothing here yet.</div>}
      </div>

      <ConfirmBar
        selected={selected}
        slotBusy={slotBusy}
        estMonths={selected ? monthsFor(selected.opsCost) : Infinity}
        onConfirm={confirmStart}
        onCancel={() => setSelectedKey(null)}
      />

      {detail && (
        <DetailsModal
          opt={detail}
          estMonths={monthsFor(detail.opsCost)}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}

function statusBadge(status: ProductionStatus): string | null {
  if (status === "built") return "✓ Built";
  if (status === "active") return "Building…";
  if (status === "locked") return "🔒 Locked";
  return null;
}

function ProductionCard({
  opt,
  selected,
  selectable,
  estMonths,
  onClick,
  onDetails,
}: {
  opt: ProductionOption;
  selected: boolean;
  selectable: boolean;
  estMonths: number;
  onClick: () => void;
  onDetails: () => void;
}) {
  const upfront = upfrontChips(opt.upfrontCost);
  const badge = statusBadge(opt.status);
  const unaffordable = opt.status === "available" && !opt.affordable;

  const foot =
    opt.status === "available"
      ? estMonths === Infinity
        ? "needs production"
        : `~${estMonths} mo`
      : opt.status === "locked"
        ? opt.lockReason ?? "Locked"
        : opt.status === "built"
          ? "Already built"
          : "In progress";

  return (
    <div
      className={[
        "prod-card",
        `status-${opt.status}`,
        selected ? "selected" : "",
        !selectable ? "not-selectable" : "",
        unaffordable ? "unaffordable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
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
        <ItemArt kind={opt.kind} id={opt.id} className="prod-card-art" />
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
      <div className="prod-card-kind">
        {opt.kind === "unit" ? opt.categoryLabel : "Facility"}
      </div>
      <div className="prod-card-cost">
        <span>{opt.opsCost} Ops</span>
        {upfront && <span className="prod-card-upfront">+ {upfront}</span>}
      </div>
      <div className={`prod-card-foot${unaffordable || opt.status === "locked" ? " warn" : ""}`}>
        {unaffordable ? `Need ${upfront} upfront` : foot}
      </div>
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
  selected: ProductionOption | null;
  slotBusy: boolean;
  estMonths: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (slotBusy) {
    return (
      <div className="prod-confirm busy">
        <span className="faint">
          HQ slot is busy — finish the current project before starting another.
        </span>
      </div>
    );
  }
  if (!selected) {
    return (
      <div className="prod-confirm empty">
        <span className="faint">Select a facility or unit, then confirm to build.</span>
      </div>
    );
  }

  const upfront = upfrontChips(selected.upfrontCost);
  const canStart = selected.affordable;

  return (
    <div className="prod-confirm ready">
      <div className="prod-confirm-info">
        <ItemArt kind={selected.kind} id={selected.id} className="prod-confirm-art" />
        <div>
          <div className="prod-confirm-name">{selected.name}</div>
          <div className="prod-confirm-cost">
            {selected.opsCost} Ops{upfront ? ` + ${upfront}` : ""} ·{" "}
            {estMonths === Infinity ? "needs production" : `~${estMonths} mo`}
          </div>
        </div>
      </div>
      <div className="prod-confirm-actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!canStart}
          onClick={onConfirm}
        >
          {canStart ? "Start Production" : `Need ${upfront} upfront`}
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
  opt: ProductionOption;
  estMonths: number;
  onClose: () => void;
}) {
  const upfront = upfrontChips(opt.upfrontCost);
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
          <ItemArt kind={opt.kind} id={opt.id} className="prod-detail-art" />
          <div className="prod-detail-titles">
            <div className="prod-detail-name">{opt.name}</div>
            <div className="prod-detail-kind">
              {opt.kind === "unit" ? `Unit · ${opt.categoryLabel}` : "Facility"}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="prod-detail-desc">{opt.description}</p>
        {opt.flavor && <p className="prod-detail-flavor">{opt.flavor}</p>}
        <div className="prod-detail-rows">
          <DetailRow label="Effect" value={opt.effectSummary} tone="good" />
          <DetailRow
            label="Cost"
            value={`${opt.opsCost} Operations${upfront ? ` + ${upfront} upfront` : ""}`}
          />
          <DetailRow
            label="Build time"
            value={
              estMonths === Infinity
                ? "Needs Operations income"
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

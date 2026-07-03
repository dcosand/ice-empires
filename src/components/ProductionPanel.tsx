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
} from "../engine/productionSystem";
import { getMonthlyIncome } from "../engine/selectors";
import { ItemArt } from "./ItemArt";

const RESOURCE_SHORT: Record<ResourceKey, string> = {
  funds: "Funds",
  hockeyKnowledge: "HK",
  reputation: "Rep",
};

function upfrontChips(cost: Partial<ResourceSet>): string {
  return (Object.entries(cost) as [ResourceKey, number][])
    .map(([res, amt]) => `${amt} ${RESOURCE_SHORT[res]}`)
    .join(" · ");
}

const keyOf = (o: ProductionOption) => `${o.kind}-${o.id}`;

// STABLE order: data order, with locked items sinking to the bottom. Never
// re-rank on selection or when something starts building — rows must not jump
// around under the player's cursor.
const sortOptions = (arr: ProductionOption[]): ProductionOption[] =>
  [...arr].sort(
    (a, b) => (a.status === "locked" ? 1 : 0) - (b.status === "locked" ? 1 : 0),
  );

// Compact row list: one line per item — art, name, what it does, cost, state.
// Simpler and quieter than the old card gallery.
export function ProductionPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const opts = getProductionOptions(state);
  const fundsPerMonth = getMonthlyIncome(state).funds;
  const slotBusy = !!state.activeProduction;

  const monthsFor = (cost: number) =>
    fundsPerMonth > 0 ? Math.max(1, Math.ceil(cost / fundsPerMonth)) : Infinity;

  const unitOptions = useMemo(() => sortOptions(opts.units), [opts]);
  const facilityOptions = useMemo(() => sortOptions(opts.facilities), [opts]);
  const lookup = useMemo(
    () => [...unitOptions, ...facilityOptions],
    [unitOptions, facilityOptions],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);

  const selected = lookup.find((o) => keyOf(o) === selectedKey) ?? null;
  const detail = lookup.find((o) => keyOf(o) === detailKey) ?? null;

  const selectable = (o: ProductionOption) => o.status === "available" && !slotBusy;

  // Drop a stale selection if the slot fills or the pick is no longer buildable.
  useEffect(() => {
    if (selectedKey && (!selected || !selectable(selected))) setSelectedKey(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotBusy, selectedKey, selected?.status]);

  const onRowClick = (o: ProductionOption) => {
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

  const renderRows = (options: ProductionOption[]) =>
    options.map((opt) => (
      <ProductionRow
        key={keyOf(opt)}
        opt={opt}
        selected={keyOf(opt) === selectedKey}
        selectable={selectable(opt)}
        estMonths={monthsFor(opt.fundsCost)}
        onClick={() => onRowClick(opt)}
        onDetails={() => setDetailKey(keyOf(opt))}
      />
    ));

  return (
    <div className="panel production-panel">
      <div className="panel-sub">
        One project at a time; Funds income (+{fundsPerMonth}/turn) flows into
        it. Click a row to select, then confirm. ⓘ for details.
      </div>

      <div className="prod-list-title">Units</div>
      <div className="prod-rows">{renderRows(unitOptions)}</div>

      <div className="prod-list-title">Facilities</div>
      <div className="prod-rows">{renderRows(facilityOptions)}</div>

      <ConfirmBar
        selected={selected}
        slotBusy={slotBusy}
        estMonths={selected ? monthsFor(selected.fundsCost) : Infinity}
        onConfirm={confirmStart}
        onCancel={() => setSelectedKey(null)}
      />

      {detail && (
        <DetailsModal
          opt={detail}
          estMonths={monthsFor(detail.fundsCost)}
          onClose={() => setDetailKey(null)}
        />
      )}
    </div>
  );
}

function statusText(opt: ProductionOption, estMonths: number): string {
  switch (opt.status) {
    case "active":
      return "Building…";
    case "built":
      return "Built ✓";
    case "locked":
      return opt.lockReason ?? "Locked";
    default:
      return estMonths === Infinity
        ? "needs Funds"
        : `~${estMonths} turn${estMonths === 1 ? "" : "s"}`;
  }
}

function ProductionRow({
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
  const unaffordable = opt.status === "available" && !opt.affordable;

  return (
    <div
      className={[
        "prod-row",
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
      <ItemArt kind={opt.kind} id={opt.id} className="prod-row-art" />
      <div className="prod-row-main">
        <div className="prod-row-name">
          {opt.name}
          {opt.isUnique && <span className="unique-badge">Unique</span>}
          <span className="prod-row-kind">
            {opt.kind === "unit" ? opt.categoryLabel : "Facility"}
          </span>
        </div>
        <div className="prod-row-effect">{opt.effectSummary}</div>
      </div>
      <div className="prod-row-cost">
        <div>
          {opt.fundsCost} Funds
          {upfront ? ` + ${upfront}` : ""}
        </div>
        <div className={`prod-row-status s-${opt.status}`}>
          {statusText(opt, estMonths)}
        </div>
      </div>
      {selected && (
        <span className="prod-row-check" aria-hidden>
          ✓
        </span>
      )}
      <button
        type="button"
        className="prod-card-info prod-row-info"
        aria-label={`${opt.name} details`}
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
      >
        ⓘ
      </button>
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
        <span className="faint">Select something to build, then confirm.</span>
      </div>
    );
  }

  const upfront = upfrontChips(selected.upfrontCost);
  return (
    <div className="prod-confirm ready">
      <div className="prod-confirm-info">
        <ItemArt kind={selected.kind} id={selected.id} className="prod-confirm-art" />
        <div>
          <div className="prod-confirm-name">{selected.name}</div>
          <div className="prod-confirm-cost">
            {selected.fundsCost} Funds{upfront ? ` + ${upfront}` : ""} ·{" "}
            {estMonths === Infinity
              ? "needs Funds income"
              : `~${estMonths} turn${estMonths === 1 ? "" : "s"}`}
          </div>
        </div>
      </div>
      <div className="prod-confirm-actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!selected.affordable}
          onClick={confirmGuard(onConfirm)}
        >
          Start Building
        </button>
      </div>
    </div>
  );
}

// Plain pass-through kept as a single seam for a future click sound hook.
function confirmGuard(fn: () => void): () => void {
  return fn;
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
            <div className="prod-detail-name">
              {opt.name}
              {opt.isUnique && <span className="unique-badge">Unique</span>}
            </div>
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
          <DetailRow label="Does" value={opt.effectSummary} tone="good" />
          <DetailRow
            label="Cost"
            value={`${opt.fundsCost} Funds${upfront ? ` + ${upfront} upfront` : ""}`}
          />
          <DetailRow
            label="Build time"
            value={
              estMonths === Infinity
                ? "Needs Funds income"
                : `~${estMonths} turn${estMonths === 1 ? "" : "s"}`
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

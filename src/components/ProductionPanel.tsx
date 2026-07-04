import { useEffect, useMemo, useState } from "react";
import type { Dispatch } from "react";
import type {
  GameAction,
  GameState,
  ResourceKey,
  ResourceSet,
  ScoutQualityTier,
} from "../types/game";
import {
  canCancelProduction,
  getProductionOptions,
  productionItemName,
  type ProductionOption,
} from "../engine/productionSystem";
import { scoutTierCost } from "../engine/scoutStaff";
import { SCOUT_TIERS } from "../data/scouts";
import { ItemArt } from "./ItemArt";
import { playSfx } from "../engine/sfx";

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
  const funds = state.resources.funds;
  const slotBusy = !!state.activeProduction;

  const unitOptions = useMemo(() => sortOptions(opts.units), [opts]);
  const facilityOptions = useMemo(() => sortOptions(opts.facilities), [opts]);
  const lookup = useMemo(
    () => [...unitOptions, ...facilityOptions],
    [unitOptions, facilityOptions],
  );

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  // Quality tier for scout-spawning units (D29): reset per selection.
  const [scoutTier, setScoutTier] = useState<ScoutQualityTier>("volunteer");

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
    setScoutTier("volunteer");
    setSelectedKey((cur) => (cur === keyOf(o) ? null : keyOf(o)));
  };

  const tierAffordable = (o: ProductionOption, tier: ScoutQualityTier) =>
    funds >= scoutTierCost(o.fundsCost, tier);

  const confirmStart = () => {
    if (!selected || !selectable(selected)) return;
    if (selected.spawnsScout ? !tierAffordable(selected, scoutTier) : !selected.affordable) {
      return;
    }
    playSfx("confirm");
    dispatch({
      type: "START_PRODUCTION",
      kind: selected.kind,
      itemId: selected.id,
      ...(selected.spawnsScout ? { scoutTier } : {}),
    });
    setSelectedKey(null);
  };

  const cancellable = canCancelProduction(state);
  const activeName = state.activeProduction
    ? productionItemName(state.activeProduction.kind, state.activeProduction.itemId)
    : "";

  const renderRows = (options: ProductionOption[]) =>
    options.map((opt) => (
      <ProductionRow
        key={keyOf(opt)}
        opt={opt}
        selected={keyOf(opt) === selectedKey}
        selectable={selectable(opt)}
        onClick={() => onRowClick(opt)}
        onDetails={() => setDetailKey(keyOf(opt))}
      />
    ));

  return (
    <div className="panel production-panel">
      <div className="panel-sub">
        One project at a time; the full cost is paid when work starts (treasury:{" "}
        {funds} Funds). Click a row to select, then confirm. ⓘ for details.
      </div>

      <div className="prod-list-title">Units</div>
      <div className="prod-rows">{renderRows(unitOptions)}</div>

      <div className="prod-list-title">Facilities</div>
      <div className="prod-rows">{renderRows(facilityOptions)}</div>

      <ConfirmBar
        selected={selected}
        slotBusy={slotBusy}
        activeName={activeName}
        cancellable={cancellable}
        scoutTier={scoutTier}
        onPickTier={setScoutTier}
        tierAffordable={tierAffordable}
        onConfirm={confirmStart}
        onCancel={() => setSelectedKey(null)}
        onCancelActive={() => dispatch({ type: "CANCEL_PRODUCTION" })}
      />

      {detail && <DetailsModal opt={detail} onClose={() => setDetailKey(null)} />}
    </div>
  );
}

function statusText(opt: ProductionOption): string {
  switch (opt.status) {
    case "active":
      return "Building…";
    case "built":
      return "Built ✓";
    case "locked":
      return opt.lockReason ?? "Locked";
    default:
      return `${opt.buildMonths} month${opt.buildMonths === 1 ? "" : "s"}`;
  }
}

function ProductionRow({
  opt,
  selected,
  selectable,
  onClick,
  onDetails,
}: {
  opt: ProductionOption;
  selected: boolean;
  selectable: boolean;
  onClick: () => void;
  onDetails: () => void;
}) {
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
        <div>{upfrontChips(opt.upfrontCost) || "Free"}</div>
        <div className={`prod-row-status s-${opt.status}`}>{statusText(opt)}</div>
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
  activeName,
  cancellable,
  scoutTier,
  onPickTier,
  tierAffordable,
  onConfirm,
  onCancel,
  onCancelActive,
}: {
  selected: ProductionOption | null;
  slotBusy: boolean;
  activeName: string;
  cancellable: boolean;
  scoutTier: ScoutQualityTier;
  onPickTier: (tier: ScoutQualityTier) => void;
  tierAffordable: (o: ProductionOption, tier: ScoutQualityTier) => boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onCancelActive: () => void;
}) {
  if (slotBusy) {
    return (
      <div className="prod-confirm busy">
        <span className="faint">
          {cancellable
            ? `Building ${activeName} — you can still change your mind before ending the turn.`
            : `Building ${activeName} — work has begun; see it through.`}
        </span>
        {cancellable && (
          <button className="btn" onClick={onCancelActive}>
            Cancel {activeName}
          </button>
        )}
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
  const startable = selected.spawnsScout
    ? tierAffordable(selected, scoutTier)
    : selected.affordable;
  const costLine = selected.spawnsScout
    ? `${scoutTierCost(selected.fundsCost, scoutTier)} Funds upfront`
    : `${upfront || "Free"} upfront`;

  return (
    <div className="prod-confirm ready">
      <div className="prod-confirm-info">
        <ItemArt kind={selected.kind} id={selected.id} className="prod-confirm-art" />
        <div>
          <div className="prod-confirm-name">{selected.name}</div>
          <div className="prod-confirm-cost">
            {costLine} · {selected.buildMonths} month
            {selected.buildMonths === 1 ? "" : "s"} to build
          </div>
          {selected.spawnsScout && (
            <div className="prod-tier-row" role="radiogroup" aria-label="Scout quality">
              {SCOUT_TIERS.map((t) => {
                const cost = scoutTierCost(selected.fundsCost, t.tier);
                const afford = tierAffordable(selected, t.tier);
                return (
                  <button
                    key={t.tier}
                    type="button"
                    role="radio"
                    aria-checked={scoutTier === t.tier}
                    className={`prod-tier-chip${scoutTier === t.tier ? " on" : ""}${
                      afford ? "" : " unaffordable"
                    }`}
                    title={t.blurb}
                    onClick={() => onPickTier(t.tier)}
                  >
                    <span className="prod-tier-name">{t.name}</span>
                    <span className="prod-tier-cost">{cost} Funds</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="prod-confirm-actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={!startable}
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
  onClose,
}: {
  opt: ProductionOption;
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
          <DetailRow label="Cost" value={`${upfront || "Free"} — paid upfront`} />
          <DetailRow
            label="Build time"
            value={`${opt.buildMonths} month${opt.buildMonths === 1 ? "" : "s"}`}
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

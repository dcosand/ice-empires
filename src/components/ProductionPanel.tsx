import { useState } from "react";
import type { Dispatch } from "react";
import type {
  GameAction,
  GameState,
  ResourceKey,
  ResourceSet,
} from "../types/game";
import {
  getProductionOptions,
  productionItemName,
  type ProductionOption,
} from "../engine/productionSystem";
import { getMonthlyIncome } from "../engine/selectors";
import { ProgressBar } from "./ProgressBar";
import { ItemArt } from "./ItemArt";

type Tab = "facilities" | "units";

const RESOURCE_SHORT: Record<ResourceKey, string> = {
  budget: "Budget",
  operations: "Ops",
  hockeyKnowledge: "HK",
  reputation: "Rep",
};

function upfrontChips(cost: Partial<ResourceSet>): string {
  return (Object.entries(cost) as [ResourceKey, number][])
    .map(([res, amt]) => `${amt} ${RESOURCE_SHORT[res]}`)
    .join(" · ");
}

export function ProductionPanel({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const [tab, setTab] = useState<Tab>("facilities");
  const opts = getProductionOptions(state);
  const opsPerMonth = getMonthlyIncome(state).operations;
  const active = state.activeProduction;

  const facilityItems = opts.facilities;
  // Show locked units disabled, in place, sorted after the available ones —
  // no separate "locked" view.
  const unitItems = [...opts.units].sort(
    (a, b) => (a.status === "locked" ? 1 : 0) - (b.status === "locked" ? 1 : 0),
  );

  const monthsFor = (cost: number) =>
    opsPerMonth > 0 ? Math.max(1, Math.ceil(cost / opsPerMonth)) : Infinity;

  const list = tab === "facilities" ? facilityItems : unitItems;

  return (
    <div className="panel production-panel">
      <div className="panel-sub">
        Club HQ builds one project at a time. Operations production (+{opsPerMonth}/mo)
        funds it; unit Budget/Reputation costs are paid upfront.
      </div>

      {active && (
        <div className="active-banner">
          <div className="active-name">
            Producing: {productionItemName(active.kind, active.itemId)}
          </div>
          {(() => {
            const cost = active.operationsRemaining + active.progressOperations;
            const left = monthsFor(active.operationsRemaining);
            return (
              <ProgressBar
                fraction={cost > 0 ? active.progressOperations / cost : 0}
                left={`${active.progressOperations}/${cost} Operations`}
                right={left === Infinity ? "needs production" : `~${left} mo left`}
              />
            );
          })()}
        </div>
      )}

      <div className="prod-tabs">
        <TabButton label={`Facilities (${facilityItems.length})`} on={tab === "facilities"} onClick={() => setTab("facilities")} />
        <TabButton label={`Units (${unitItems.length})`} on={tab === "units"} onClick={() => setTab("units")} />
      </div>

      <div className="prod-list">
        {list.map((opt) => (
          <ProductionOptionCard
            key={`${opt.kind}-${opt.id}`}
            opt={opt}
            slotBusy={!!active}
            estMonths={monthsFor(opt.opsCost)}
            onStart={() =>
              dispatch({ type: "START_PRODUCTION", kind: opt.kind, itemId: opt.id })
            }
          />
        ))}
        {list.length === 0 && <div className="faint">Nothing here yet.</div>}
      </div>
    </div>
  );
}

function TabButton({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`prod-tab${on ? " on" : ""}`} onClick={onClick}>
      {label}
    </button>
  );
}

function ProductionOptionCard({
  opt,
  slotBusy,
  estMonths,
  onStart,
}: {
  opt: ProductionOption;
  slotBusy: boolean;
  estMonths: number;
  onStart: () => void;
}) {
  const upfront = upfrontChips(opt.upfrontCost);
  const canStart =
    opt.status === "available" && !slotBusy && opt.affordable;

  return (
    <div className={`prod-option status-${opt.status}`}>
      <div className="prod-option-head">
        <ItemArt kind={opt.kind} id={opt.id} className="prod-thumb" />
        <div className="prod-titles">
          <span className="prod-name">{opt.name}</span>
          <span className="prod-tag">
            {opt.kind === "unit" ? `Unit · ${opt.categoryLabel}` : "Facility"}
          </span>
        </div>
        <div className="prod-cost">
          <span>{opt.opsCost} Ops</span>
          {upfront && <span className="prod-upfront">+ {upfront}</span>}
          <span className="prod-months">
            {estMonths === Infinity ? "needs production" : `~${estMonths} mo`}
          </span>
        </div>
      </div>

      <div className="prod-desc">{opt.description}</div>
      <div className="prod-flavor">{opt.flavor}</div>

      <div className="prod-meta">
        <span className="prod-effect">★ {opt.effectSummary}</span>
        <span
          className={`prod-req${opt.status === "locked" ? " locked" : ""}`}
        >
          {opt.status === "locked" && opt.lockReason
            ? `🔒 ${opt.lockReason}`
            : opt.requirementText}
        </span>
      </div>

      <ProductionButton
        opt={opt}
        canStart={canStart}
        slotBusy={slotBusy}
        onStart={onStart}
      />
    </div>
  );
}

function ProductionButton({
  opt,
  canStart,
  slotBusy,
  onStart,
}: {
  opt: ProductionOption;
  canStart: boolean;
  slotBusy: boolean;
  onStart: () => void;
}) {
  if (opt.status === "built") {
    return (
      <button className="btn btn-block" disabled>
        ✓ Built
      </button>
    );
  }
  if (opt.status === "active") {
    return (
      <button className="btn btn-block" disabled>
        Currently building…
      </button>
    );
  }
  if (opt.status === "locked") {
    return (
      <button className="btn btn-block" disabled>
        Locked
      </button>
    );
  }
  // available
  let label = "Start Production";
  if (slotBusy) label = "HQ slot busy";
  else if (!opt.affordable)
    label = `Need ${upfrontChips(opt.upfrontCost)} upfront`;

  return (
    <button
      className={`btn btn-block${canStart ? " btn-primary" : ""}`}
      disabled={!canStart}
      onClick={onStart}
    >
      {label}
    </button>
  );
}

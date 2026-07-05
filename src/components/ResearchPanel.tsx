import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState, ResearchBranch } from "../types/game";
import { RESEARCH_BY_ID } from "../data/research";
import { ERAS, ERA_ORDER } from "../data/eras";
import {
  canCancelResearch,
  getResearchOptions,
  type ResearchOption,
  type ResearchStatus,
} from "../engine/researchSystem";
import { getMonthlyIncome } from "../engine/selectors";
import { ProgressBar } from "./ProgressBar";
import { ItemArt } from "./ItemArt";
import { playSfx } from "../engine/sfx";

// Branch rows of the tech tree, in display order, each with its accent color.
const BRANCH_META: { id: ResearchBranch; label: string; color: string }[] = [
  { id: "hockey-fundamentals", label: "Hockey Fundamentals", color: "#7dd3fc" },
  { id: "icecraft-infrastructure", label: "Icecraft & Infrastructure", color: "#8fd18f" },
  { id: "team-formation", label: "Team Formation", color: "#f2c14e" },
  { id: "scouting-reach", label: "Scouting & Reach", color: "#e0a06b" },
  { id: "club-formation", label: "Club Formation", color: "#b58cf0" },
  { id: "pipelines-influence", label: "Pipelines & Influence", color: "#5fd08a" },
  { id: "competition", label: "Competition", color: "#ef6f6f" },
  { id: "diplomacy", label: "Diplomacy", color: "#6fb3d0" },
  { id: "legacy", label: "Legacy", color: "#f4e04e" },
];

// The browsable tech tree: era columns × branch rows. Later-era techs are
// visible but ghosted — the whole arc is on screen from month one.
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

  const turnsFor = (cost: number) =>
    hkPerMonth > 0 ? Math.max(1, Math.ceil(cost / hkPerMonth)) : Infinity;

  const lookup = useMemo(() => groups.flatMap((g) => g.options), [groups]);

  // options indexed by era, then branch.
  const byEraBranch = useMemo(() => {
    const map = new Map<string, Map<ResearchBranch, ResearchOption[]>>();
    for (const g of groups) {
      const branchMap = new Map<ResearchBranch, ResearchOption[]>();
      for (const opt of g.options) {
        const list = branchMap.get(opt.branch) ?? [];
        list.push(opt);
        branchMap.set(opt.branch, list);
      }
      map.set(g.eraId, branchMap);
    }
    return map;
  }, [groups]);

  // Only render branch rows that have at least one tech anywhere.
  const branches = BRANCH_META.filter((b) =>
    lookup.some((o) => o.branch === b.id),
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const selected = lookup.find((o) => o.id === selectedId) ?? null;
  const detail = lookup.find((o) => o.id === detailId) ?? null;

  const selectable = (o: ResearchOption) => o.status === "available" && !slotBusy;
  const availableCount = lookup.filter(selectable).length;
  const activeTurns =
    active && hkPerMonth > 0
      ? Math.max(1, Math.ceil(active.knowledgeRemaining / hkPerMonth))
      : Infinity;

  // Drop a stale selection once the slot fills or the pick is no longer open.
  useEffect(() => {
    if (selectedId && (!selected || !selectable(selected))) setSelectedId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotBusy, selectedId, selected?.status]);

  const onNodeClick = (o: ResearchOption) => {
    if (!selectable(o)) {
      setDetailId(o.id);
      return;
    }
    setSelectedId((cur) => (cur === o.id ? null : o.id));
  };

  const confirmStart = () => {
    if (!selected || !selectable(selected)) return;
    playSfx("confirm");
    dispatch({ type: "SELECT_RESEARCH", techId: selected.id });
    setSelectedId(null);
  };

  return (
    <div className="panel production-panel tech-tree-panel">
      <div className="panel-sub">
        Pick one project. Research advances at the end of each turn; cards show
        the estimated turns required. Future eras remain visible but locked
        until your club reaches them.
      </div>

      <div className="research-summary">
        <div className="research-summary-card">
          <span>Active project</span>
          <strong>{activeDef?.name ?? "None selected"}</strong>
          <em>
            {active && activeDef
              ? turnEstimateLabel(activeTurns, "left")
              : "Choose a card below"}
          </em>
        </div>
        <div className="research-summary-card">
          <span>Research pace</span>
          <strong>{hkPerMonth > 0 ? "Advancing" : "Stopped"}</strong>
          <em>{hkPerMonth > 0 ? "Progress each turn" : "No knowledge income"}</em>
        </div>
        <div className="research-summary-card">
          <span>Open choices</span>
          <strong>{availableCount}</strong>
          <em>{availableCount === 1 ? "available tech" : "available techs"}</em>
        </div>
      </div>

      {active && activeDef && (
        <div className="active-banner">
          <div className="active-name">
            Researching: {activeDef.name}
            {canCancelResearch(state) && (
              <button
                className="btn"
                style={{ marginLeft: 12 }}
                title="You can change your mind until the turn ends and work begins."
                onClick={() => dispatch({ type: "CANCEL_RESEARCH" })}
              >
                Cancel
              </button>
            )}
          </div>
          <ProgressBar
            fraction={active.progressKnowledge / activeDef.cost}
            left={`${Math.round((active.progressKnowledge / activeDef.cost) * 100)}% complete`}
            right={
              activeTurns === Infinity
                ? "needs knowledge income"
                : turnEstimateLabel(activeTurns, "left")
            }
          />
        </div>
      )}

      <div className="tech-tree-scroll">
        <div
          className="tech-tree"
          style={{ "--tech-eras": ERA_ORDER.length } as CSSProperties}
        >
          <div className="tech-corner" />
          {ERA_ORDER.map((eraId) => (
            <div
              key={eraId}
              className={`tech-era-head${state.eraId === eraId ? " current" : ""}`}
            >
              <div className="tech-era-name">{ERAS[eraId]?.name ?? eraId}</div>
              <div className="tech-era-q">{ERAS[eraId]?.description}</div>
            </div>
          ))}
          {branches.map((branch) => (
            <TechBranchRow
              key={branch.id}
              branch={branch}
              byEraBranch={byEraBranch}
              selectedId={selectedId}
              selectable={selectable}
              turnsFor={turnsFor}
              onNodeClick={onNodeClick}
              onDetails={setDetailId}
            />
          ))}
        </div>
      </div>

      <ConfirmBar
        selected={selected}
        slotBusy={slotBusy}
        cancellable={canCancelResearch(state)}
        estTurns={selected ? turnsFor(selected.cost) : Infinity}
        onConfirm={confirmStart}
        onCancel={() => setSelectedId(null)}
      />

      {detail && (
        <DetailsModal
          opt={detail}
          estTurns={turnsFor(detail.cost)}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

function TechBranchRow({
  branch,
  byEraBranch,
  selectedId,
  selectable,
  turnsFor,
  onNodeClick,
  onDetails,
}: {
  branch: { id: ResearchBranch; label: string; color: string };
  byEraBranch: Map<string, Map<ResearchBranch, ResearchOption[]>>;
  selectedId: string | null;
  selectable: (o: ResearchOption) => boolean;
  turnsFor: (cost: number) => number;
  onNodeClick: (o: ResearchOption) => void;
  onDetails: (id: string) => void;
}) {
  const rowStyle = { "--branch-color": branch.color } as CSSProperties;
  return (
    <>
      <div className="tech-branch-label" style={rowStyle}>
        <span>{branch.label}</span>
      </div>
      {ERA_ORDER.map((eraId) => {
        const options = byEraBranch.get(eraId)?.get(branch.id) ?? [];
        return (
          <div key={eraId} className="tech-cell" style={rowStyle}>
            {options.map((opt) => (
              <TechNode
                key={opt.id}
                opt={opt}
                selected={opt.id === selectedId}
                selectable={selectable(opt)}
                estTurns={turnsFor(opt.cost)}
                onClick={() => onNodeClick(opt)}
                onDetails={() => onDetails(opt.id)}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function statusBadge(status: ResearchStatus): string | null {
  if (status === "completed") return "✓";
  if (status === "active") return "…";
  return null;
}

function TechNode({
  opt,
  selected,
  selectable,
  estTurns,
  onClick,
  onDetails,
}: {
  opt: ResearchOption;
  selected: boolean;
  selectable: boolean;
  estTurns: number;
  onClick: () => void;
  onDetails: () => void;
}) {
  const badge = statusBadge(opt.status);
  const statusText =
    opt.status === "completed"
      ? "Done"
      : opt.status === "active"
        ? "Active"
        : opt.status === "locked"
          ? "Locked"
          : turnEstimateLabel(estTurns);
  return (
    <div
      className={[
        "tech-node",
        `status-${opt.status}`,
        selected ? "selected" : "",
        !selectable && opt.status === "available" ? "slot-busy" : "",
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
      <div className="tech-node-body">
        <ItemArt kind="research" id={opt.id} className="tech-node-art" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tech-node-head">
            <span className="tech-node-name">{opt.name}</span>
            {badge && <span className="tech-node-badge">{badge}</span>}
            <button
              type="button"
              className="tech-node-info"
              aria-label={`${opt.name} details`}
              onClick={(e) => {
                e.stopPropagation();
                onDetails();
              }}
            >
              ⓘ
            </button>
          </div>
          <div className="tech-node-time">{statusText}</div>
        </div>
      </div>
      {opt.prereqs.length > 0 && (
        <div className="tech-node-prereqs">
          {opt.prereqs.map((p) => (
            <span
              key={p.id}
              className={`tech-prereq-chip${p.met ? " met" : ""}`}
              title={`Requires ${p.name}`}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfirmBar({
  selected,
  slotBusy,
  cancellable,
  estTurns,
  onConfirm,
  onCancel,
}: {
  selected: ResearchOption | null;
  slotBusy: boolean;
  cancellable: boolean;
  estTurns: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (slotBusy) {
    return (
      <div className="prod-confirm busy">
        <span className="faint">
          {cancellable
            ? "Research is underway — cancel it (banner above) if you've changed your mind before ending the turn."
            : "Research is underway and work has begun — finish it before starting another."}
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
          <div className="prod-confirm-cost">{turnEstimateLabel(estTurns)}</div>
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
  estTurns,
  onClose,
}: {
  opt: ResearchOption;
  estTurns: number;
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
            <div className="prod-detail-kind">
              Technology · {ERAS[opt.eraId]?.name ?? opt.eraId}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <p className="prod-detail-desc">{opt.description}</p>
        {opt.flavor && <p className="prod-detail-flavor">{opt.flavor}</p>}
        <div className="prod-detail-rows">
          <DetailRow label="Unlocks" value={opt.unlockSummary} tone="good" />
          <DetailRow
            label="Turns"
            value={turnEstimateLabel(estTurns)}
          />
          <DetailRow
            label="Research effort"
            value={`${opt.cost} knowledge`}
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

function turnEstimateLabel(turns: number, suffix = ""): string {
  if (turns === Infinity) return "Needs knowledge income";
  return `${turns} turn${turns === 1 ? "" : "s"}${suffix ? ` ${suffix}` : ""}`;
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

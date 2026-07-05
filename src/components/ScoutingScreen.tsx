import { useMemo, useState } from "react";
import type {
  AttrEstimate,
  GameState,
  OrgProspect,
  Player,
  PlayerPosition,
  ScoutReport,
} from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";
import { estimateLine, formatEstimate } from "../engine/talentFog";
import { attrEntries, computeOverall, starString, starTier } from "../engine/ratings";
import { ATTR_LABELS, POSITION_LABELS } from "../data/attributes";
import { turnDateLabel } from "../engine/calendar";

// The global scouting board (docs/15 §5, EHM-style): every player and
// prospect the club knows about in one sortable/filterable/searchable table,
// with a per-player detail view — attributes, potential read, and the full
// scouting history (each scout's filed report). Signed players show true
// current attributes; prospects obey fog-of-talent — ranges, never truth.

type ScoutedProspect = OrgProspect & { orgName: string };

type Row = {
  id: string;
  kind: "roster" | "prospect";
  name: string;
  position: PlayerPosition;
  age: number | null;
  style: string;
  source: string;
  // Sort keys: roster OVR is true; a prospect's is the estimate midpoint.
  ovrSort: number;
  ovrLabel: string;
  potSort: number;
  potLabel: string;
  reports: number;
  player?: Player;
  prospect?: ScoutedProspect;
};

type SortKey = "name" | "position" | "age" | "style" | "ovr" | "pot" | "source" | "reports";
type Scope = "all" | "roster" | "prospects";

const mid = (e: AttrEstimate): number => (e.low + e.high) / 2;

export function ScoutingScreen({ state }: { state: GameState }) {
  const [scope, setScope] = useState<Scope>("all");
  const [posFilter, setPosFilter] = useState<PlayerPosition | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("ovr");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rows = useMemo(() => buildRows(state), [state]);

  const visible = rows
    .filter((r) => scope === "all" || r.kind === (scope === "roster" ? "roster" : "prospect"))
    .filter((r) => posFilter === "all" || r.position === posFilter)
    .filter((r) => r.name.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => compareRows(a, b, sortKey) * sortDir);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const header = (key: SortKey, label: string) => (
    <th
      className={`sc-sort${sortKey === key ? " on" : ""}`}
      onClick={() => {
        if (sortKey === key) setSortDir((d) => (d === 1 ? -1 : 1));
        else {
          setSortKey(key);
          setSortDir(key === "name" || key === "source" ? 1 : -1);
        }
      }}
    >
      {label}
      {sortKey === key ? (sortDir === 1 ? " ▲" : " ▼") : ""}
    </th>
  );

  if (selected) {
    return (
      <PlayerDetail
        row={selected}
        reports={state.scoutReports.filter((r) => r.subjectId === selected.id)}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="panel scouting-panel">
      <div className="panel-sub">
        Everyone your club knows about. Signed players show true current
        ability; prospect numbers are your scout’s reads, never the truth —
        tighter ranges come from sharper eyes. Click a row for the full file.
      </div>

      <div className="scouting-controls">
        <input
          className="sc-search"
          type="search"
          placeholder="Search names…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="sc-chips">
          {(["all", "roster", "prospects"] as Scope[]).map((s) => (
            <button
              key={s}
              className={`sc-chip${scope === s ? " on" : ""}`}
              onClick={() => setScope(s)}
            >
              {s === "all" ? "All" : s === "roster" ? "Roster" : "Prospects"}
            </button>
          ))}
        </div>
        <div className="sc-chips">
          {(["all", "C", "W", "D", "G"] as (PlayerPosition | "all")[]).map((p) => (
            <button
              key={p}
              className={`sc-chip${posFilter === p ? " on" : ""}`}
              onClick={() => setPosFilter(p)}
            >
              {p === "all" ? "Any pos" : p}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="faint">
          {rows.length === 0
            ? "Nobody on file yet. Hold tryouts for your first signings, and send a Club Scout to a contacted independent to open their prospect pipeline."
            : "No one matches those filters."}
        </div>
      ) : (
        <table className="indy-prospect-table scouting-table sc-board">
          <thead>
            <tr>
              {header("position", "Pos")}
              {header("name", "Name")}
              {header("age", "Age")}
              {header("style", "Style")}
              {header("ovr", "OVR")}
              {header("pot", "Ceiling")}
              {header("source", "Source")}
              {header("reports", "Reports")}
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="sc-row" onClick={() => setSelectedId(r.id)}>
                <td className="pp-pos">
                  <span className={`pos-badge pos-${r.position}`}>{r.position}</span>
                </td>
                <td className="pp-name">
                  {r.name}
                  {r.player && !r.player.hasEquipment && (
                    <span className="scouting-flag" title="No gear — not counted toward your line">
                      ungeared
                    </span>
                  )}
                </td>
                <td>{r.age ?? "?"}</td>
                <td className="sc-style">{r.style || "—"}</td>
                <td className="sc-num">{r.ovrLabel}</td>
                <td className="sc-num">{r.potLabel}</td>
                <td className="scouting-source">{r.source}</td>
                <td className="sc-num">{r.reports || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function buildRows(state: GameState): Row[] {
  const reportCount = (subjectId: string) =>
    state.scoutReports.filter((r) => r.subjectId === subjectId).length;

  const rosterRows: Row[] = state.roster.map((p) => {
    const ovr = computeOverall(p);
    return {
      id: p.id,
      kind: "roster",
      name: p.name,
      position: p.position,
      age: p.age,
      style: p.style,
      source: p.origin,
      ovrSort: ovr,
      ovrLabel: `${ovr}`,
      // A roster player's ceiling is engine-side truth the club hasn't earned
      // a read on yet (docs/15 §6 self-fog) — never leak it.
      potSort: 0,
      potLabel: "—",
      reports: reportCount(p.id),
      player: p,
    };
  });

  const prospectRows: Row[] = (state.world?.hockeyOrgs ?? []).flatMap((org) =>
    org.prospects
      .filter((p) => p.revealed)
      .map((p): Row => {
        const est = p.attrEstimates;
        const mids = est
          ? Object.values(est).filter(Boolean).map((e) => mid(e!))
          : [];
        const ovrMid = mids.length
          ? Math.round(mids.reduce((a, b) => a + b, 0) / mids.length)
          : 0;
        return {
          id: p.id,
          kind: "prospect",
          name: p.name ?? "???",
          position: p.position,
          age: p.age ?? null,
          style: p.style ?? "",
          source: hockeyOrgDisplayName(org),
          ovrSort: ovrMid,
          ovrLabel: ovrMid ? `~${ovrMid}` : "?",
          potSort: p.potentialEstimate ? mid(p.potentialEstimate) : 0,
          potLabel: p.potentialEstimate ? formatEstimate(p.potentialEstimate) : "?",
          reports: reportCount(p.id),
          prospect: { ...p, orgName: hockeyOrgDisplayName(org) },
        };
      }),
  );

  return [...rosterRows, ...prospectRows];
}

const POS_ORDER: Record<PlayerPosition, number> = { C: 0, W: 1, D: 2, G: 3 };

function compareRows(a: Row, b: Row, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "position":
      return POS_ORDER[a.position] - POS_ORDER[b.position];
    case "age":
      return (a.age ?? 0) - (b.age ?? 0);
    case "style":
      return a.style.localeCompare(b.style);
    case "ovr":
      return a.ovrSort - b.ovrSort;
    case "pot":
      return a.potSort - b.potSort;
    case "source":
      return a.source.localeCompare(b.source);
    case "reports":
      return a.reports - b.reports;
  }
}

// ---------------------------------------------------------------------------
// Player detail — the EHM player file: header, attributes (true bars for your
// roster, fog ranges for prospects), ceiling read, and the scouting history.
// ---------------------------------------------------------------------------

function PlayerDetail({
  row,
  reports,
  onBack,
}: {
  row: Row;
  reports: ScoutReport[];
  onBack: () => void;
}) {
  const p = row.player;
  const stars = p ? starTier(computeOverall(p)) : null;

  return (
    <div className="panel scouting-panel sc-detail">
      <button className="btn sc-back" onClick={onBack}>
        ← Scouting board
      </button>

      <div className="sc-detail-head">
        <span className={`pos-badge pos-${row.position}`}>{row.position}</span>
        <div>
          <div className="sc-detail-name">{row.name}</div>
          <div className="sc-detail-meta">
            {POSITION_LABELS[row.position]}
            {row.age ? ` · Age ${row.age}` : ""}
            {row.style ? ` · ${row.style}` : ""} · {row.source}
          </div>
        </div>
        <div className="sc-detail-ovr">
          {p ? (
            <>
              <strong>{computeOverall(p)}</strong>
              <span>{stars ? starString(stars) : ""}</span>
            </>
          ) : (
            <>
              <strong>{row.ovrLabel}</strong>
              <span className="faint">scout’s read</span>
            </>
          )}
        </div>
      </div>

      <div className="indy-col-title">Attributes</div>
      {p ? (
        <div className="sc-attr-grid">
          {attrEntries(p.attrs).map(([key, value]) => (
            <div className="sc-attr-row" key={key}>
              <span className="attr-label">{ATTR_LABELS[key as keyof typeof ATTR_LABELS]}</span>
              <span className="attr-bar">
                <span className="attr-fill" style={{ width: `${Math.min(100, value)}%` }} />
              </span>
              <span className="attr-value">{value}</span>
            </div>
          ))}
        </div>
      ) : row.prospect?.attrEstimates ? (
        <div className="sc-attr-grid">
          {Object.entries(row.prospect.attrEstimates).map(([key, est]) =>
            est ? (
              <div className="sc-attr-row" key={key}>
                <span className="attr-label">
                  {ATTR_LABELS[key as keyof typeof ATTR_LABELS]}
                </span>
                <span className="attr-bar">
                  <span
                    className="attr-range"
                    style={{
                      left: `${est.low}%`,
                      width: `${Math.max(2, est.high - est.low)}%`,
                    }}
                  />
                </span>
                <span className="attr-value">{formatEstimate(est)}</span>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <div className="faint">“{row.prospect?.teaser}” — no scouted read yet.</div>
      )}

      <div className="indy-col-title">Ceiling</div>
      <div className="sc-ceiling">
        {p ? (
          <span className="faint">
            Your coaches haven’t formed a read on {row.name.split(" ")[0]}’s
            ceiling yet — projecting your own kids takes seasons, not
            practices.
          </span>
        ) : row.prospect?.potentialEstimate ? (
          <>
            Projected {formatEstimate(row.prospect.potentialEstimate)} overall —{" "}
            <span className="faint">{estimateLine(row.prospect)}</span>
          </>
        ) : (
          <span className="faint">Unscouted.</span>
        )}
      </div>

      <div className="indy-col-title">
        Scouting history
        <span className="scouting-count">{reports.length}</span>
      </div>
      {reports.length === 0 ? (
        <div className="faint">
          No reports on file{p ? " — your own players are known by watching, not by reports (scout missions land in a later pass)." : "."}
        </div>
      ) : (
        <div className="sc-reports">
          {reports.map((r) => (
            <div className="sc-report" key={r.id}>
              <div className="sc-report-head">
                <strong>{r.scoutName}</strong>
                {r.orgName ? <span> · seen at {r.orgName}</span> : null}
                <span className="sc-report-date">{turnDateLabel(r.month)}</span>
              </div>
              <div className="sc-report-prose">“{r.prose}”</div>
              <div className="sc-report-foot">
                Ceiling read: {formatEstimate(r.potentialEstimate)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

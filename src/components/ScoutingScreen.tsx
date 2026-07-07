import { useMemo, useState } from "react";
import type { Dispatch } from "react";
import type {
  GameAction,
  GameState,
  OrgProspect,
  Player,
  PlayerPosition,
  ScoutMission,
  ScoutReport,
  TryoutCandidate,
} from "../types/game";
import { CLUBS } from "../data/clubs";
import { nationalityFlag, nationalityLabel } from "../data/nationalities";
import { hockeyOrgDisplayName } from "../engine/world";
import {
  attrEntries,
  computeOverall,
  estimateMid,
  scoutReadOverall,
  starString,
  starTier,
} from "../engine/ratings";
import { ATTR_LABELS, POSITION_LABELS } from "../data/attributes";
import {
  latestReportMonth,
  prospectReadStale,
  watchSlotsForUnit,
} from "../engine/scoutSystem";
import {
  SIGN_COST_FUNDS,
  signGate,
  signGateHint,
  signingOdds,
} from "../engine/signingSystem";
import { turnDateLabel } from "../engine/calendar";

// The global scouting board (docs/15 §5, EHM-style): every player and
// prospect the club knows about in one sortable/filterable/searchable table,
// with a per-player detail view — attributes, potential read, and the full
// scouting history (each scout's filed report). Signed players show true
// current attributes; prospects obey fog-of-talent — reads, never truth.

type ScoutedProspect = OrgProspect & { orgName: string; orgId: string };

type Row = {
  id: string;
  kind: "roster" | "prospect";
  name: string;
  position: PlayerPosition;
  age: number | null;
  nationality: string; // flag emoji (display)
  nationalityTitle: string; // words, for the tooltip
  style: string;
  source: string;
  // Sort keys: roster OVR is true; a prospect's is the estimate midpoint.
  ovrSort: number;
  ovrLabel: string;
  potSort: number;
  potLabel: string;
  reports: number;
  // Prospect-only flags (watch/staleness/signing race, docs/15 §5–§6).
  watched?: boolean;
  stale?: boolean;
  signedByName?: string;
  player?: Player;
  prospect?: ScoutedProspect;
};

type SortKey = "name" | "position" | "age" | "style" | "ovr" | "pot" | "source" | "reports";
type Scope = "all" | "roster" | "prospects";


export function ScoutingScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
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
        state={state}
        row={selected}
        reports={state.scoutReports.filter((r) => r.subjectId === selected.id)}
        dispatch={dispatch}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="panel scouting-panel">
      <div className="panel-sub">
        Everyone your club knows about. Signed players show true current
        ability; prospect numbers are your scout’s reads, never the truth —
        repeat viewings on watched players sharpen them. Click a row for the
        full file.
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
              <tr
                key={r.id}
                className={`sc-row${r.signedByName ? " signed-away" : ""}`}
                onClick={() => setSelectedId(r.id)}
              >
                <td className="pp-pos">
                  <span className={`pos-badge pos-${r.position}`}>{r.position}</span>
                </td>
                <td className="pp-name">
                  {r.name}
                  <span className="nation-flag" title={r.nationalityTitle}>
                    {r.nationality}
                  </span>
                  {r.watched && (
                    <span className="scouting-flag flag-watched" title="On a scout's watch list — repeat viewings sharpen the read">
                      watched
                    </span>
                  )}
                  {r.stale && (
                    <span className="scouting-flag flag-stale" title="No scout on station — this read has aged; trust it less">
                      stale
                    </span>
                  )}
                  {r.signedByName && (
                    <span className="scouting-flag flag-signed" title={`Signed by ${r.signedByName} — the race is over`}>
                      → {r.signedByName}
                    </span>
                  )}
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
  const watchedIds = new Set(
    state.scoutMissions.flatMap((m) => m.watchedPlayerIds),
  );

  const rosterRows: Row[] = state.roster.map((p) => {
    const ovr = computeOverall(p);
    return {
      id: p.id,
      kind: "roster",
      name: p.name,
      position: p.position,
      age: p.age,
      nationality: nationalityFlag(p.nationality),
      nationalityTitle: nationalityLabel(p.nationality),
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
        // The scout's read (EHM): a static believed OVR + Ability/Potential
        // stars — only once a report has been filed. Before that: dashes.
        const readOvr = scoutReadOverall(p.position, p.attrEstimates);
        const potMid = p.potentialEstimate ? estimateMid(p.potentialEstimate) : null;
        return {
          id: p.id,
          kind: "prospect",
          name: p.name ?? "???",
          position: p.position,
          age: p.age ?? null,
          nationality: nationalityFlag(p.nationality),
          nationalityTitle: nationalityLabel(p.nationality),
          style: p.style ?? "",
          source: hockeyOrgDisplayName(org),
          ovrSort: readOvr ?? 0,
          ovrLabel: readOvr != null ? `${readOvr}` : "—",
          potSort: potMid ?? 0,
          potLabel: potMid != null ? starString(starTier(potMid)) : "—",
          reports: reportCount(p.id),
          watched: watchedIds.has(p.id),
          stale: prospectReadStale(state, org.id, p.id),
          signedByName: p.signedByClubId
            ? CLUBS[p.signedByClubId]?.name ?? "a rival"
            : undefined,
          prospect: { ...p, orgName: hockeyOrgDisplayName(org), orgId: org.id },
        };
      }),
  );

  return [...rosterRows, ...prospectRows];
}

// A roster-style row for any Player-like object (a signed player OR an
// unsigned tryout candidate — `TryoutCandidate` is a Player minus equipment).
// Lets the same player file open from the Team screen, the signing cinematic,
// and a tryout card, without the subject having to live in state.roster yet.
type PlayerLike = TryoutCandidate;
export function rowForPlayerLike(
  state: GameState,
  p: PlayerLike,
  source?: string,
): Row {
  const ovr = computeOverall(p as Player);
  return {
    id: p.id,
    kind: "roster",
    name: p.name,
    position: p.position,
    age: p.age,
    nationality: nationalityFlag(p.nationality),
    nationalityTitle: nationalityLabel(p.nationality),
    style: p.style,
    source: source ?? p.origin,
    ovrSort: ovr,
    ovrLabel: `${ovr}`,
    potSort: 0,
    potLabel: "—",
    reports: state.scoutReports.filter((r) => r.subjectId === p.id).length,
    player: p as Player,
  };
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
// roster, the scout's reads for prospects), ceiling read, the watch/sign
// actions, and the scouting history.
// ---------------------------------------------------------------------------

export function PlayerDetail({
  state,
  row,
  reports,
  dispatch,
  onBack,
  backLabel = "← Scouting board",
}: {
  state: GameState;
  row: Row;
  reports: ScoutReport[];
  dispatch: Dispatch<GameAction>;
  onBack: () => void;
  backLabel?: string;
}) {
  const p = row.player;
  const stars = p ? starTier(computeOverall(p)) : null;
  const readOvr = row.prospect
    ? scoutReadOverall(row.position, row.prospect.attrEstimates)
    : null;
  const readAttrs = row.prospect?.attrEstimates;
  const potMid = row.prospect?.potentialEstimate
    ? estimateMid(row.prospect.potentialEstimate)
    : null;
  const lastSeen = latestReportMonth(state, row.id);

  return (
    <div className="panel scouting-panel sc-detail">
      <button className="btn sc-back" onClick={onBack}>
        {backLabel}
      </button>

      <div className="sc-detail-head">
        <span className={`pos-badge pos-${row.position}`}>{row.position}</span>
        <div>
          <div className="sc-detail-name">{row.name}</div>
          <div className="sc-detail-meta">
            {POSITION_LABELS[row.position]}
            {row.age ? ` · Age ${row.age}` : ""}
            {" · "}
            <span className="nation-flag" title={row.nationalityTitle}>
              {row.nationality}
            </span>
            {row.style ? ` · ${row.style}` : ""} · {row.source}
          </div>
        </div>
        <div className="sc-detail-ovr">
          {p ? (
            <>
              <strong>{computeOverall(p)}</strong>
              <span>{stars ? starString(stars) : ""}</span>
            </>
          ) : readOvr != null ? (
            <>
              <strong>{readOvr}</strong>
              <span title="Your scout's ability rating">
                {starString(starTier(readOvr))} <span className="faint">read</span>
              </span>
            </>
          ) : (
            <>
              <strong>?</strong>
              <span className="faint">unscouted</span>
            </>
          )}
        </div>
      </div>

      {row.prospect && (
        <ProspectActions state={state} row={row} dispatch={dispatch} />
      )}

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
      ) : readAttrs ? (
        // The scout's static reads (EHM): believed values, not ranges — and
        // not necessarily the truth. Gold fill marks them as scouted numbers.
        <>
          {row.stale && lastSeen !== null && (
            <div className="sc-stale-note">
              Last report {turnDateLabel(lastSeen)} — no scout on station since.
              Treat these numbers as the file, not the player.
            </div>
          )}
          <div className="sc-attr-grid">
            {Object.entries(readAttrs).map(([key, est]) =>
              est ? (
                <div className="sc-attr-row" key={key}>
                  <span className="attr-label">
                    {ATTR_LABELS[key as keyof typeof ATTR_LABELS]}
                  </span>
                  <span className="attr-bar">
                    <span
                      className="attr-fill scouted"
                      style={{ width: `${Math.min(100, estimateMid(est))}%` }}
                    />
                  </span>
                  <span className="attr-value">{estimateMid(est)}</span>
                </div>
              ) : null,
            )}
          </div>
        </>
      ) : (
        <div className="faint">
          “{row.prospect?.teaser}” — the org’s word is all you have. Assign a
          scout to them for real reads.
        </div>
      )}

      <div className="indy-col-title">Potential</div>
      <div className="sc-ceiling">
        {p ? (
          <span className="faint">
            Your coaches haven’t formed a read on {row.name.split(" ")[0]}’s
            ceiling yet — projecting your own kids takes seasons, not
            practices.
          </span>
        ) : potMid != null ? (
          <>
            {starString(starTier(potMid))} —{" "}
            <span className="faint">
              your scout projects a {potMid}-overall type at maturity.
            </span>
          </>
        ) : (
          <span className="faint">No projection until a scout is assigned.</span>
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
                Ability {(() => {
                  const read = scoutReadOverall(r.position, r.attrEstimates);
                  return read != null ? starString(starTier(read)) : "—";
                })()}{" "}
                · Potential {starString(starTier(estimateMid(r.potentialEstimate)))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Watch + Sign — the two verbs a prospect file offers (docs/15 §5–§6). Watch
// needs an active mission at their org; Sign needs a filed report and opens
// the contested race.
function ProspectActions({
  state,
  row,
  dispatch,
}: {
  state: GameState;
  row: Row;
  dispatch: Dispatch<GameAction>;
}) {
  const prospect = row.prospect!;
  const mission: ScoutMission | undefined = state.scoutMissions.find(
    (m) => m.orgId === prospect.orgId,
  );
  const gate = signGate(state, row.id);
  const odds = signingOdds(state, row.id);
  const first = row.name.split(" ")[0];

  if (row.signedByName) {
    return (
      <div className="sc-actions">
        <div className="sc-signed-note">
          Signed by {row.signedByName} — the race is over. File stays for the
          post-mortem.
        </div>
      </div>
    );
  }

  const watched = !!mission && mission.watchedPlayerIds.includes(row.id);
  const slots = mission ? watchSlotsForUnit(state, mission.unitId) : 0;
  const slotsFull = !!mission && !watched && mission.watchedPlayerIds.length >= slots;

  return (
    <div className="sc-actions">
      {mission ? (
        <button
          className={`btn${watched ? "" : " btn-primary"}`}
          disabled={slotsFull}
          title={
            slotsFull
              ? `All ${slots} watch slots in use — stop watching someone first.`
              : watched
                ? "Your scout moves on; the read stops sharpening."
                : "Repeat viewings sharpen the read with every report."
          }
          onClick={() =>
            dispatch({ type: "WATCH_PLAYER", unitId: mission.unitId, prospectId: row.id })
          }
        >
          {watched
            ? `Stop watching ${first}`
            : `Watch closely (${mission.watchedPlayerIds.length}/${slots})`}
        </button>
      ) : (
        <span className="faint sc-action-hint">
          No scout on station at {prospect.orgName} — assign one to watch{" "}
          {first}.
        </span>
      )}
      <button
        className="btn btn-gold"
        disabled={gate !== "ok"}
        title={
          gate !== "ok"
            ? signGateHint(gate)
            : odds.rivalName
              ? `${odds.rivalName} is in the race — you look ${odds.label}.`
              : "Nobody else is at the table."
        }
        onClick={() => dispatch({ type: "SIGN_PROSPECT", prospectId: row.id })}
      >
        Sign {first} ({SIGN_COST_FUNDS} Funds
        {odds.rivalName ? ` · ${odds.label}` : ""})
      </button>
      {gate !== "ok" && (
        <span className="faint sc-action-hint">{signGateHint(gate)}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player-file overlay — the EHM player file, openable from ANYWHERE (Team
// screen, the signing cinematic, a tryout card), not just the scouting board.
// Stacks above every other modal so it can float over the tryout/HQ screens.
// ---------------------------------------------------------------------------
export type PlayerFileTarget =
  | { kind: "player"; player: Player }
  | { kind: "candidate"; candidate: TryoutCandidate };

export function PlayerFileOverlay({
  state,
  dispatch,
  target,
  onClose,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  target: PlayerFileTarget;
  onClose: () => void;
}) {
  const row =
    target.kind === "candidate"
      ? rowForPlayerLike(state, target.candidate, "Tryout hopeful")
      : rowForPlayerLike(state, target.player);
  const reports = state.scoutReports.filter((r) => r.subjectId === row.id);

  return (
    <div
      className="task-overlay player-file-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${row.name} — player file`}
    >
      <button
        className="overlay-scrim"
        aria-label="Close player file"
        onClick={onClose}
      />
      <div className="overlay-sheet">
        <div className="overlay-head">
          <h2>Player File</h2>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="overlay-body">
          <PlayerDetail
            state={state}
            row={row}
            reports={reports}
            dispatch={dispatch}
            onBack={onClose}
            backLabel="← Back"
          />
        </div>
      </div>
    </div>
  );
}

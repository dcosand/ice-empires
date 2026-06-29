import { useState } from "react";
import type { CSSProperties, Dispatch, ReactNode } from "react";
import type {
  FacilityDef,
  GameAction,
  GameState,
  ResourceKey,
} from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { UNITS_BY_ID } from "../data/units";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";
import { RESOURCE_LABELS } from "../engine/resources";
import {
  getMonthlyIncome,
  getDiscoveredCount,
  getEraProgress,
} from "../engine/selectors";
import { productionItemName } from "../engine/productionSystem";
import { ProductionPanel } from "./ProductionPanel";
import { ItemArt } from "./ItemArt";

export type HQTab = "overview" | "personnel" | "production" | "facilities" | "units";
type Tab = HQTab;

const RESOURCE_ORDER: ResourceKey[] = [
  "budget",
  "operations",
  "hockeyKnowledge",
  "reputation",
];

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "personnel", label: "Personnel" },
  { id: "production", label: "Production" },
  { id: "facilities", label: "Facilities" },
  { id: "units", label: "Units" },
];

export function ClubHQScreen({
  state,
  dispatch,
  onClose,
  initialTab = "overview",
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const club = state.club;
  const era = ERAS[state.eraId];

  const sheetStyle = {
    "--club-accent": club?.accent ?? "#38bdf8",
    "--club-primary": club?.palette.primary ?? "#0f1d2c",
    "--club-secondary": club?.palette.secondary ?? "#38bdf8",
    "--club-light": club?.palette.light ?? "#eef6fb",
  } as CSSProperties;

  return (
    <div
      className="hq-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Club HQ"
    >
      <button className="overlay-scrim" aria-label="Close Club HQ" onClick={onClose} />
      <div className="hq-modal-sheet" style={sheetStyle}>
        {club && (
          <img
            className="hq-modal-bg"
            src={clubAsset(club, "background")}
            alt=""
            aria-hidden
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="hq-modal-shade" aria-hidden />

        <div className="hq-modal-inner">
          <header className="hq-modal-head">
            <div className="hq-head-club">
              {club && (
                <img
                  className="hq-head-logo"
                  src={clubAsset(club, "logo")}
                  alt=""
                  aria-hidden
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <div>
                <div className="hq-head-name">{club?.name ?? "Club HQ"}</div>
                <div className="hq-head-sub">
                  {era?.name} · Month {state.month} · {club?.leaderArchetype}
                </div>
              </div>
            </div>
            <button className="btn" onClick={onClose}>
              Close
            </button>
          </header>

          <nav className="hq-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`hq-tab${tab === t.id ? " on" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="hq-modal-body">
            {tab === "overview" && <OverviewTab state={state} />}
            {tab === "personnel" && <PersonnelTab state={state} />}
            {tab === "production" && (
              <ProductionTab state={state} dispatch={dispatch} />
            )}
            {tab === "facilities" && <FacilitiesTab state={state} />}
            {tab === "units" && <UnitsTab state={state} />}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Overview ------------------------------------------------------------
function OverviewTab({ state }: { state: GameState }) {
  const income = getMonthlyIncome(state);
  const discovered = getDiscoveredCount(state);
  const eraProgress = getEraProgress(state);
  const prod = state.activeProduction;

  return (
    <div className="hq-tabpane">
      {state.club?.identityText && (
        <p className="hq-identity">{state.club.identityText}</p>
      )}

      <SectionTitle>Treasury &amp; Income (per turn)</SectionTitle>
      <div className="hq-res-grid">
        {RESOURCE_ORDER.map((res) => (
          <div className="hq-res-card" key={res}>
            <span className="hq-res-label">{RESOURCE_LABELS[res]}</span>
            <span className="hq-res-total">{state.resources[res]}</span>
            <span className={`hq-res-rate${income[res] > 0 ? " up" : ""}`}>
              {income[res] >= 0 ? "+" : ""}
              {income[res]} / turn
            </span>
          </div>
        ))}
      </div>

      <div className="hq-overview-cols">
        <div className="hq-card">
          <div className="hq-card-title">Now Building</div>
          {prod ? (
            <div className="hq-build-line">
              <ItemArt kind={prod.kind} id={prod.itemId} className="hq-mini-art" />
              <div>
                <div className="hq-card-name">
                  {productionItemName(prod.kind, prod.itemId)}
                </div>
                <div className="faint">
                  {prod.operationsRemaining} Operations remaining
                </div>
              </div>
            </div>
          ) : (
            <div className="faint">HQ production slot is open.</div>
          )}
        </div>

        <div className="hq-card">
          <div className="hq-card-title">Hockey World</div>
          <div className="hq-stat-big">{discovered}</div>
          <div className="hq-stat-sub">regions discovered</div>
        </div>

        <div className="hq-card hq-era-card">
          <div className="hq-card-title">Era Progress</div>
          <ul className="hq-era-list">
            {eraProgress.map((req) => (
              <li key={req.id} className={req.met ? "met" : ""}>
                <span className="hq-era-mark">{req.met ? "✓" : "○"}</span>
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---- Personnel & Roster --------------------------------------------------
function PersonnelTab({ state }: { state: GameState }) {
  const club = state.club;
  const scout = state.world?.scout;
  const players = state.cards.filter(
    (c) => c.type === "player" || c.type === "prospect",
  );
  const staff = state.cards.filter((c) => c.type === "staff");

  return (
    <div className="hq-tabpane">
      <SectionTitle>Leadership</SectionTitle>
      <div className="hq-people">
        <PersonRow
          glyph="★"
          name={club?.leaderArchetype ?? "Club Leadership"}
          role="Founder & Club Leader"
          note={club?.philosophy}
        />
      </div>

      <SectionTitle>Field Staff</SectionTitle>
      {scout ? (
        <div className="hq-people">
          <PersonRow glyph="🔍" name="Club Scout" role="Exploration" note="Out on the ice, mapping the hockey world." />
        </div>
      ) : (
        <div className="faint">No field staff yet.</div>
      )}
      {staff.length > 0 && (
        <div className="hq-people">
          {staff.map((c) => (
            <PersonRow key={c.id} glyph="◆" name={c.name} role="Staff" note={c.flavor} />
          ))}
        </div>
      )}

      <SectionTitle>Players</SectionTitle>
      {players.length === 0 ? (
        <div className="faint">
          No players yet — the Pond Hockey era is mostly ice, rumors, and
          ambition. Wanderers and local believers come later.
        </div>
      ) : (
        <div className="hq-people">
          {players.map((c) => (
            <PersonRow
              key={c.id}
              glyph={c.position ?? "●"}
              name={c.name}
              role={c.type === "prospect" ? "Prospect" : "Player"}
              note={c.role ?? c.flavor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonRow({
  glyph,
  name,
  role,
  note,
}: {
  glyph: string;
  name: string;
  role: string;
  note?: string;
}) {
  return (
    <div className="hq-person">
      <span className="hq-person-avatar">{glyph}</span>
      <div className="hq-person-body">
        <div className="hq-person-top">
          <span className="hq-person-name">{name}</span>
          <span className="hq-person-role">{role}</span>
        </div>
        {note && <div className="hq-person-note">{note}</div>}
      </div>
    </div>
  );
}

// ---- Production ----------------------------------------------------------
function ProductionTab({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const prod = state.activeProduction;
  const opsPerMonth = getMonthlyIncome(state).operations;

  return (
    <div className="hq-tabpane">
      {prod ? (
        (() => {
          const total = prod.operationsRemaining + prod.progressOperations;
          const turnsLeft =
            opsPerMonth > 0
              ? Math.max(1, Math.ceil(prod.operationsRemaining / opsPerMonth))
              : Infinity;
          return (
            <div className="hq-now-building">
              <ItemArt kind={prod.kind} id={prod.itemId} className="hq-build-art" />
              <div className="hq-now-body">
                <div className="hq-now-eyebrow">Now building</div>
                <div className="hq-now-name">
                  {productionItemName(prod.kind, prod.itemId)}
                </div>
                <div className="hq-now-bar">
                  <div
                    className="hq-now-fill"
                    style={{
                      width: `${Math.round((prod.progressOperations / total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="hq-now-meta">
                  <span>
                    {prod.progressOperations}/{total} Operations
                  </span>
                  <span>
                    {turnsLeft === Infinity
                      ? "needs Operations income"
                      : `~${turnsLeft} turn${turnsLeft === 1 ? "" : "s"} left`}
                  </span>
                </div>
              </div>
            </div>
          );
        })()
      ) : (
        <div className="hq-now-building idle">
          <div className="faint">
            Nothing in production. Choose a facility or unit below to start.
          </div>
        </div>
      )}

      <ProductionPanel state={state} dispatch={dispatch} />
    </div>
  );
}

// ---- Facilities ----------------------------------------------------------
function FacilitiesTab({ state }: { state: GameState }) {
  const built = state.facilities
    .map((id) => FACILITIES_BY_ID[id])
    .filter((f): f is FacilityDef => !!f);

  if (built.length === 0) {
    return (
      <div className="hq-tabpane">
        <div className="faint">No facilities yet. The ice is bare.</div>
      </div>
    );
  }

  return (
    <div className="hq-tabpane">
      <div className="hq-built-list">
        {built.map((f) => (
          <div className="hq-built" key={f.id}>
            <ItemArt kind="facility" id={f.id} className="hq-built-art" />
            <div className="hq-built-body">
              <div className="hq-built-name">{f.name}</div>
              <div className="hq-built-desc">{f.description}</div>
              <div className="hq-built-effects">{facilityEffectText(f)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function facilityEffectText(f: FacilityDef): string {
  const parts = f.effects.map((e) => {
    if (e.type === "monthlyIncome")
      return `+${e.amount} ${RESOURCE_LABELS[e.resource]} / turn`;
    if (e.type === "unlockRecruitment") return "Unlocks basic recruitment";
    return "Improves local recruitment events";
  });
  return parts.length ? parts.join(" · ") : "Adds a club capability";
}

// ---- Units (owned / on the map) -----------------------------------------
function UnitsTab({ state }: { state: GameState }) {
  const scout = state.world?.scout;
  const owned = state.units;

  return (
    <div className="hq-tabpane">
      <SectionTitle>On the Map</SectionTitle>
      {scout ? (
        <div className="hq-built-list">
          <div className="hq-built">
            <ItemArt kind="unit" id="pond-scout" className="hq-built-art" />
            <div className="hq-built-body">
              <div className="hq-built-name">Club Scout</div>
              <div className="hq-built-desc">
                At ({scout.x}, {scout.y}) · {scout.movesRemaining}/{scout.movesPerTurn} moves this turn
              </div>
              <div className="hq-built-effects">Reveals the map and surveys hockey regions.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="faint">No units on the map yet.</div>
      )}

      <SectionTitle>Organizational Units</SectionTitle>
      {owned.length === 0 ? (
        <div className="faint">
          None yet. Produce a Pond Scout or Rink Evangelist to build out your
          front office.
        </div>
      ) : (
        <div className="hq-built-list">
          {owned.map((u) => {
            const def = UNITS_BY_ID[u.unitDefId];
            return (
              <div className="hq-built" key={u.id}>
                <ItemArt kind="unit" id={u.unitDefId} className="hq-built-art" />
                <div className="hq-built-body">
                  <div className="hq-built-name">
                    {u.name}
                    <span className="hq-unit-status"> · {u.status}</span>
                  </div>
                  <div className="hq-built-desc">{def?.description}</div>
                  <div className="hq-built-effects">{def?.abilitySummary}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="hq-section-title">{children}</div>;
}

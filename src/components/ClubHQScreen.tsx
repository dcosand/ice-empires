import { useState } from "react";
import type { CSSProperties, Dispatch, ReactNode } from "react";
import type {
  FacilityDef,
  GameAction,
  GameState,
  Player,
  ResourceKey,
} from "../types/game";
import {
  ALL_FACILITY_DEFS_BY_ID,
  ALL_UNIT_DEFS_BY_ID,
} from "../data/clubUniques";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";
import { RESOURCE_LABELS } from "../engine/resources";
import {
  getMonthlyIncome,
  getDiscoveredCount,
  getEraProgress,
} from "../engine/selectors";
import { productionItemName } from "../engine/productionSystem";
import { allScouts } from "../engine/scoutSystem";
import {
  canHoldTryouts,
  TRYOUT_COST_FUNDS,
  tryoutGate,
  tryoutGateHint,
} from "../engine/tryoutSystem";
import { AttrBar } from "./TryoutScreen";
import { ProductionPanel } from "./ProductionPanel";
import { ItemArt } from "./ItemArt";

export type HQTab =
  | "overview"
  | "team"
  | "personnel"
  | "production"
  | "facilities"
  | "units";
type Tab = HQTab;

const RESOURCE_ORDER: ResourceKey[] = ["funds", "hockeyKnowledge", "reputation"];

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "team", label: "Team" },
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
            {tab === "team" && <TeamTab state={state} dispatch={dispatch} />}
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
                  {prod.fundsRemaining} Funds remaining
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

// ---- Team (the actual roster) ---------------------------------------------

// Auto-assign the best available line from the roster. Simple greedy fit:
// goalie by goaltending, defense pair by checking+skating, forward trio by
// shooting+passing+skating; everyone else rides the bench. Manual line
// assignment is a later-era feature.
function assignLines(roster: Player[]): {
  forwards: (Player | null)[];
  defense: (Player | null)[];
  goalie: Player | null;
  bench: Player[];
} {
  const used = new Set<string>();
  const take = (pool: Player[], score: (p: Player) => number, n: number) => {
    const picks = pool
      .filter((p) => !used.has(p.id))
      .sort((a, b) => score(b) - score(a))
      .slice(0, n);
    picks.forEach((p) => used.add(p.id));
    return picks;
  };

  const goalies = roster.filter((p) => p.position === "G");
  const goalie = take(goalies, (p) => p.attrs.goaltending, 1)[0] ?? null;

  const dPool = roster.filter((p) => p.position === "D");
  let defense: Player[] = take(dPool, (p) => p.attrs.checking + p.attrs.skating, 2);
  const fPool = roster.filter((p) => p.position === "F");
  let forwards: Player[] = take(
    fPool,
    (p) => p.attrs.shooting + p.attrs.passing + p.attrs.skating,
    3,
  );
  // Fill gaps with any remaining skater — pond hockey is not fussy.
  const anySkater = roster.filter((p) => p.position !== "G");
  while (defense.length < 2) {
    const extra = take(anySkater, (p) => p.attrs.checking + p.attrs.skating, 1);
    if (!extra.length) break;
    defense = [...defense, ...extra];
  }
  while (forwards.length < 3) {
    const extra = take(anySkater, (p) => p.attrs.shooting + p.attrs.passing, 1);
    if (!extra.length) break;
    forwards = [...forwards, ...extra];
  }
  const bench = roster.filter((p) => !used.has(p.id));
  const pad = <T,>(arr: T[], n: number): (T | null)[] =>
    [...arr, ...Array(Math.max(0, n - arr.length)).fill(null)];
  return {
    forwards: pad(forwards, 3),
    defense: pad(defense, 2),
    goalie,
    bench,
  };
}

function TeamTab({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const roster = state.roster;
  const lines = assignLines(roster);
  const geared = roster.filter((p) => p.hasEquipment);
  const hasGoalie = geared.some((p) => p.position === "G");
  const needBodies = Math.max(0, 6 - geared.length);
  const gate = tryoutGate(state);

  const eraHint = !hasGoalie
    ? needBodies > 0
      ? `${needBodies} more geared player${needBodies === 1 ? "" : "s"} — including a goalie — to ice a full line.`
      : "You have the bodies, but no geared goalie. Someone has to stand in the net."
    : needBodies > 0
      ? `${needBodies} more geared player${needBodies === 1 ? "" : "s"} to ice a full line.`
      : "Full line ready — the Pond Hockey era requirement is met.";

  return (
    <div className="hq-tabpane">
      <div className="team-head">
        <div>
          <SectionTitle>First Line</SectionTitle>
          <div className="muted" style={{ fontSize: 12 }}>
            {eraHint} Equipment in shed: {state.equipment}
          </div>
        </div>
        <button
          className="btn btn-gold"
          disabled={!canHoldTryouts(state)}
          title={tryoutGateHint(gate)}
          onClick={() => dispatch({ type: "HOLD_TRYOUTS" })}
        >
          Hold Tryouts ({TRYOUT_COST_FUNDS} Funds)
        </button>
      </div>

      <div className="line-grid line-forwards">
        <LineSlot label="LW" player={lines.forwards[0]} />
        <LineSlot label="C" player={lines.forwards[1]} />
        <LineSlot label="RW" player={lines.forwards[2]} />
      </div>
      <div className="line-grid line-defense">
        <LineSlot label="LD" player={lines.defense[0]} />
        <LineSlot label="RD" player={lines.defense[1]} />
      </div>
      <div className="line-grid line-goalie">
        <LineSlot label="G" player={lines.goalie} />
      </div>

      <SectionTitle>Bench</SectionTitle>
      {lines.bench.length === 0 ? (
        <div className="faint">
          {roster.length === 0
            ? "No players yet. Build a rink near your HQ, research Local Tryouts, and see who shows up."
            : "Everyone is on the ice."}
        </div>
      ) : (
        <div className="line-grid">
          {lines.bench.map((p) => (
            <LineSlot key={p.id} label={p.position} player={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function LineSlot({ label, player }: { label: string; player: Player | null }) {
  if (!player) {
    return (
      <div className="line-slot empty">
        <span className="line-pos">{label}</span>
        <span className="faint">Open</span>
      </div>
    );
  }
  const attrs: { key: keyof Player["attrs"]; label: string }[] =
    player.position === "G"
      ? [
          { key: "goaltending", label: "Goaltending" },
          { key: "skating", label: "Skating" },
        ]
      : [
          { key: "skating", label: "Skating" },
          { key: "shooting", label: "Shooting" },
          { key: "passing", label: "Passing" },
          { key: "checking", label: "Checking" },
        ];
  return (
    <div className="line-slot">
      <div className="line-slot-top">
        <span className="line-pos">{label}</span>
        <div>
          <div className="line-name">{player.name}</div>
          <div className="line-meta">
            Age {player.age} · Joined M{player.joinedMonth}
          </div>
        </div>
        <span
          className={`gear-badge${player.hasEquipment ? "" : " missing"}`}
          title={player.hasEquipment ? "Geared up" : "No equipment — can't play"}
        >
          {player.hasEquipment ? "🏒" : "no gear"}
        </span>
      </div>
      <div className="line-attrs">
        {attrs.map((a) => (
          <AttrBar key={a.key} label={a.label} value={player.attrs[a.key]} />
        ))}
      </div>
      <div className="line-note">“{player.note}”</div>
    </div>
  );
}

// ---- Personnel & Roster --------------------------------------------------
function PersonnelTab({ state }: { state: GameState }) {
  const club = state.club;
  const fieldUnits = allScouts(state.world);
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
      {fieldUnits.length > 0 ? (
        <div className="hq-people">
          {fieldUnits.map((u) => (
            <PersonRow
              key={u.id ?? u.name}
              glyph={u.kind === "builder" ? "⛏" : "🔍"}
              name={u.name ?? (u.kind === "builder" ? "Rink Rats" : "Club Scout")}
              role={u.kind === "builder" ? "Construction" : "Exploration"}
              note={
                u.working
                  ? `Building a rink — ${u.working.monthsRemaining} mo to go.`
                  : u.kind === "builder"
                    ? "Clearing ponds, raising rinks, cutting sticks."
                    : "Out on the ice, mapping the hockey world."
              }
            />
          ))}
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
  const fundsPerMonth = getMonthlyIncome(state).funds;

  return (
    <div className="hq-tabpane">
      {prod ? (
        (() => {
          const total = prod.fundsRemaining + prod.progressFunds;
          const turnsLeft =
            fundsPerMonth > 0
              ? Math.max(1, Math.ceil(prod.fundsRemaining / fundsPerMonth))
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
                      width: `${Math.round((prod.progressFunds / total) * 100)}%`,
                    }}
                  />
                </div>
                <div className="hq-now-meta">
                  <span>
                    {prod.progressFunds}/{total} Funds
                  </span>
                  <span>
                    {turnsLeft === Infinity
                      ? "needs Funds income"
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
    .map((id) => ALL_FACILITY_DEFS_BY_ID[id])
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
            const def = ALL_UNIT_DEFS_BY_ID[u.unitDefId];
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

import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type {
  EventLogEntry,
  GameAction,
  GameState,
  PendingEncounter,
} from "../types/game";
import { Onboarding } from "./Onboarding";
import { ERAS, ERA_UNLOCK_MESSAGES } from "../data/eras";
import { CLUBS, clubAsset } from "../data/clubs";
import {
  ALL_FACILITY_DEFS_BY_ID,
  ALL_UNIT_DEFS_BY_ID,
} from "../data/clubUniques";
import { RESEARCH_BY_ID } from "../data/research";
import { RESOURCE_LABELS } from "../engine/resources";
import { TopBar } from "./TopBar";
import { IsoWorldMap } from "./IsoWorldMap";
import { ClubHQScreen, type HQTab } from "./ClubHQScreen";
import { RivalMeetingScreen } from "./RivalMeetingScreen";
import { ResearchPanel } from "./ResearchPanel";
import { CardsPanel } from "./CardsPanel";
import { ScoutingScreen } from "./ScoutingScreen";
import { EventLog } from "./EventLog";
import { EraProgressPanel } from "./EraProgressPanel";
import { getAvailableResearch, getEraProgress } from "../engine/selectors";
import {
  productionItemName,
  startableProductionCount,
} from "../engine/productionSystem";
import { activeScout, allScouts } from "../engine/scoutSystem";
import { techPayoff } from "../engine/researchSystem";
import { turnDateLabel, turnDateLong } from "../engine/calendar";
import { ItemArt } from "./ItemArt";
import {
  canHoldTryouts,
  TRYOUT_COST_FUNDS,
  tryoutGate,
  tryoutGateHint,
} from "../engine/tryoutSystem";
import { TryoutScreen } from "./TryoutScreen";
import { PlayerRevealScene } from "./PlayerRevealScene";
import { playSfx } from "../engine/sfx";
import { IndependentMeetingScreen } from "./IndependentMeetingScreen";
import { IndependentsScreen } from "./IndependentsScreen";
import { primeTryoutMusic } from "./BackgroundMusic";

type OverlayView =
  | "build"
  | "research"
  | "club"
  | "independents"
  | "people"
  | "scouting"
  | "era"
  | "log"
  | null;

export function Dashboard({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const [overlay, setOverlay] = useState<OverlayView>(null);
  // Deep link from an independent meeting straight to that org's detail page.
  const [ledgerFocusOrgId, setLedgerFocusOrgId] = useState<string | null>(null);
  // Production now lives inside the Club HQ screen: the "build" task deep-links
  // straight to its Production tab instead of opening a separate panel.
  const [hqInitialTab, setHqInitialTab] = useState<HQTab>("overview");
  const openView = (view: OverlayView) => {
    if (view === "build") {
      setHqInitialTab("production");
      setOverlay("club");
      return;
    }
    if (view === "club") setHqInitialTab("overview");
    setOverlay(view);
  };
  const [dismissedCompletions, setDismissedCompletions] = useState<Set<string>>(
    () => new Set(completionEvents(state).map((e) => e.id)),
  );
  // Celebrate the founding moment over the live map (rather than on a separate
  // screen), the first time the HQ is planted.
  const founded = !!state.world?.hqTile;
  const [showFoundingMoment, setShowFoundingMoment] = useState(false);
  useEffect(() => {
    if (founded) setShowFoundingMoment(true);
  }, [founded]);
  const pastTwelve = state.month > state.maxMonths;
  const completion = completionEvents(state).find(
    (event) => !dismissedCompletions.has(event.id),
  );

  // Era-requirement dopamine: when a checklist item flips to met, pop an
  // animated checkmark toast (click-through to the Era panel).
  const eraMet = getEraProgress(state).filter((r) => r.met);
  const [eraToast, setEraToast] = useState<string | null>(null);
  const prevMetRef = useRef<string[]>(eraMet.map((r) => r.id));
  useEffect(() => {
    const prev = prevMetRef.current;
    const fresh = eraMet.find((r) => !prev.includes(r.id));
    prevMetRef.current = eraMet.map((r) => r.id);
    if (fresh) {
      setEraToast(fresh.label);
      playSfx("check");
      const t = setTimeout(() => setEraToast(null), 4200);
      return () => clearTimeout(t);
    }
  }, [eraMet.map((r) => r.id).join("|")]);

  // Event sounds: the big beats get their own audio on top of button clicks.
  useEffect(() => {
    if (state.pendingMeeting) playSfx("fanfare");
  }, [state.pendingMeeting?.id]);
  useEffect(() => {
    if (completion) playSfx("complete");
  }, [completion?.id]);
  useEffect(() => {
    if (state.month > 1) playSfx("endTurn");
  }, [state.month]);
  useEffect(() => {
    if (state.nextEraUnlocked) playSfx("fanfare");
  }, [state.eraId]);
  useEffect(() => {
    if (state.pendingTryout) playSfx("confirm");
  }, [!!state.pendingTryout]);

  return (
    <div className="dashboard dashboard-map-mode">
      <TopBar
        state={state}
        dispatch={dispatch}
        onOpenHQ={() => openView("club")}
      />

      {state.nextEraUnlocked && (
        <div className="era-banner">
          <h3>{ERAS[state.eraId]?.name ?? "New era"} reached</h3>
          <div className="muted">
            {state.club?.name} {ERA_UNLOCK_MESSAGES[state.eraId] ?? "has entered a new era."}
          </div>
        </div>
      )}

      {pastTwelve && (
        <div className="teaser-banner">
          <strong>The opening scenario is behind you.</strong>{" "}
          {state.club?.name} made it through Year One — and you are already into
          It is {turnDateLong(state.month)}. The deeper hockey world, and the eras
          beyond it, are waiting.
        </div>
      )}

      <div className="map-stage">
        <IsoWorldMap
          state={state}
          dispatch={dispatch}
          onOpenHQ={() => openView("club")}
          onOpenIndependent={(orgId) => {
            setLedgerFocusOrgId(orgId);
            setOverlay("independents");
          }}
        />
        <CommandRail state={state} dispatch={dispatch} open={openView} />
        <InfoDock state={state} open={openView} />
        <NotificationRail state={state} onOpenLog={() => openView("log")} />
        <RivalsStrip state={state} />
        {eraToast && (
          <button className="era-toast" onClick={() => openView("era")}>
            <span className="era-toast-check" aria-hidden>✓</span>
            <span>
              <span className="era-toast-title">Era goal complete</span>
              <span className="era-toast-label">{eraToast}</span>
            </span>
          </button>
        )}
      </div>

      {overlay && overlay !== "club" && (
        <TaskOverlay
          title={overlayTitle(overlay)}
          wide={
            overlay === "research" ||
            overlay === "independents" ||
            overlay === "scouting"
          }
          onClose={() => {
            setOverlay(null);
            setLedgerFocusOrgId(null);
          }}
        >
          {overlay === "research" && <ResearchPanel state={state} dispatch={dispatch} />}
          {overlay === "independents" && (
            <IndependentsScreen
              state={state}
              dispatch={dispatch}
              initialOrgId={ledgerFocusOrgId}
            />
          )}
          {overlay === "people" && <CardsPanel state={state} />}
          {overlay === "scouting" && <ScoutingScreen state={state} />}
          {overlay === "era" && <EraProgressPanel state={state} />}
          {overlay === "log" && <EventLog state={state} />}
        </TaskOverlay>
      )}

      {overlay === "club" && (
        <ClubHQScreen
          state={state}
          dispatch={dispatch}
          onClose={() => setOverlay(null)}
          initialTab={hqInitialTab}
        />
      )}

      {state.pendingEncounter && (
        <EncounterOverlay
          encounter={state.pendingEncounter}
          onAcknowledge={() => dispatch({ type: "RESOLVE_ENCOUNTER" })}
        />
      )}

      {state.pendingTryout && <TryoutScreen state={state} dispatch={dispatch} />}

      {state.pendingPlayerReveal && (
        <PlayerRevealScene
          reveal={state.pendingPlayerReveal}
          club={state.club}
          dispatch={dispatch}
        />
      )}

      {state.pendingMeeting?.kind === "rival" && (
        <RivalMeetingScreen
          clubId={state.pendingMeeting.id}
          month={state.month}
          dispatch={dispatch}
        />
      )}

      {state.pendingMeeting?.kind === "independent" && (
        <IndependentMeetingScreen
          state={state}
          orgId={state.pendingMeeting.id}
          dispatch={dispatch}
          onOpenLedger={(orgId) => {
            setLedgerFocusOrgId(orgId);
            setOverlay("independents");
          }}
        />
      )}

      {completion && (
        <CompletionOverlay
          event={completion}
          onClose={() =>
            setDismissedCompletions((current) => {
              const next = new Set(current);
              next.add(completion.id);
              return next;
            })
          }
        />
      )}

      {founded && showFoundingMoment && state.club && (
        <Onboarding
          state={state}
          onClose={() => {
            setShowFoundingMoment(false);
            // Drop the player straight into play with their Scout in hand.
            const firstScout = allScouts(state.world)[0];
            if (firstScout) dispatch({ type: "SELECT_SCOUT", scoutId: firstScout.id });
          }}
        />
      )}
    </div>
  );
}


function CommandRail({
  state,
  dispatch,
  open,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  open: (view: OverlayView) => void;
}) {
  const founded = !!state.world?.hqTile;
  const buildOptions = startableProductionCount(state);
  const researchOptions = getAvailableResearch(state).length;
  const buildReady = !!state.activeProduction || buildOptions === 0;
  const researchReady = !!state.activeResearch || researchOptions === 0;
  const scouts = allScouts(state.world);
  const selectedScout = activeScout(state.world);
  const scoutMovesRemaining = scouts.reduce((sum, s) => sum + s.movesRemaining, 0);
  const scoutMovesTotal = scouts.reduce((sum, s) => sum + s.movesPerTurn, 0);
  const scoutReady = scouts.length === 0 || scoutMovesRemaining === 0;

  const researchTask = (
    <TaskButton
      done={researchReady}
      label={
        state.activeResearch
          ? "Research active"
          : researchOptions === 0
            ? "Research complete"
            : "Choose research"
      }
      detail={activeResearchName(state)}
      onClick={() => open("research")}
    />
  );

  // ---- The founding turn (Month 1, before the HQ is planted) ----
  // Research is already in play; production stays locked until the club is
  // founded, so the only gating action is planting the HQ.
  if (!founded) {
    const founder = state.world?.founder;
    const club = state.club;
    return (
      <aside className="command-rail">
        <div className="rail-title">Found Your Club · {turnDateLabel(state.month)}</div>
        {researchTask}
        <button
          className="btn btn-gold btn-block rail-end"
          disabled={!founder || !club}
          onClick={() => club && dispatch({ type: "FOUND_CLUB", clubId: club.id })}
        >
          Found {club?.name ?? "Club"} Here
        </button>
        {founder && founder.movesRemaining === 0 && (
          <button
            className="btn btn-block"
            style={{ marginTop: 8 }}
            onClick={() => dispatch({ type: "END_FOUNDING_TURN" })}
          >
            Take another step (refill moves)
          </button>
        )}
        <div className="rail-blocked">
          Move the Founding Group on the map, then plant your HQ. Production opens
          once you've founded.
        </div>
      </aside>
    );
  }

  // Production never blocks End Turn: with pay-upfront costs (D30), saving
  // funds for a bigger purchase is a legitimate play. Research still gates —
  // an empty tech slot just wastes HK income.
  const canEndMonth = researchReady;
  const selectScout = () => {
    if (!selectedScout && scouts[0]?.id) {
      dispatch({ type: "SELECT_SCOUT", scoutId: scouts[0].id });
    }
  };

  const missing: string[] = [];
  if (!researchReady) missing.push("research");

  return (
    <aside className="command-rail">
      <div className="rail-title">Next Tasks</div>
      <TaskButton
        done={buildReady}
        label={
          state.activeProduction
            ? "Production active"
            : buildOptions === 0
              ? "Nothing to build"
              : "Choose production (or save up)"
        }
        detail={activeProductionName(state)}
        onClick={() => open("build")}
      />
      {researchTask}
      {scouts.length > 0 && (
        <TaskButton
          done={scoutReady}
          label={scoutReady ? "Scouts moved" : "Move scouts"}
          detail={`${scoutMovesRemaining}/${scoutMovesTotal} moves remaining`}
          onClick={selectScout}
        />
      )}
      {state.completedResearch.includes("local-tryouts") && (
        <button
          className="btn btn-block"
          style={{ marginTop: 6 }}
          disabled={!canHoldTryouts(state)}
          title={tryoutGateHint(tryoutGate(state))}
          onClick={() => {
            primeTryoutMusic();
            dispatch({ type: "HOLD_TRYOUTS" });
          }}
        >
          Hold Tryouts ({TRYOUT_COST_FUNDS} Funds)
        </button>
      )}
      <button
        className="btn btn-gold btn-block rail-end"
        disabled={!canEndMonth}
        onClick={() => dispatch({ type: "END_MONTH" })}
      >
        End Turn — {turnDateLabel(state.month)}
      </button>
      {!canEndMonth && (
        <div className="rail-blocked">Needs: {missing.join(", ")}</div>
      )}
    </aside>
  );
}

function TaskButton({
  done,
  label,
  detail,
  onClick,
}: {
  done: boolean;
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <button className={`task-button${done ? " done" : ""}`} onClick={onClick}>
      <span className="task-status">{done ? "✓" : "!"}</span>
      <span>
        <span className="task-label">{label}</span>
        {detail && <span className="task-detail">{detail}</span>}
      </span>
    </button>
  );
}

function InfoDock({
  state,
  open,
}: {
  state: GameState;
  open: (view: OverlayView) => void;
}) {
  const contactedOrgs =
    state.world?.hockeyOrgs.filter((o) => o.playerContacted).length ?? 0;
  const knownProspects =
    (state.world?.hockeyOrgs.reduce(
      (n, o) => n + o.prospects.filter((p) => p.revealed).length,
      0,
    ) ?? 0) + state.roster.length;
  const eraProgress = getEraProgress(state);
  const eraDone = eraProgress.filter((r) => r.met).length;
  return (
    <div className="info-dock" role="toolbar" aria-label="Club screens">
      <DockButton
        img="/assets/images/independents.png"
        fallbackIcon="village"
        label="Indies"
        count={contactedOrgs}
        onClick={() => open("independents")}
      />
      <DockButton
        img="/assets/images/people.png"
        fallbackIcon="checklist"
        label="People"
        count={state.cards.length}
        onClick={() => open("people")}
      />
      <DockButton
        img="/assets/images/scouting.png"
        fallbackIcon="spyglass"
        label="Scouting"
        count={knownProspects}
        onClick={() => open("scouting")}
      />
      <DockButton
        img="/assets/images/era.png"
        fallbackIcon="flag-objective"
        label="Era"
        count={eraDone}
        countOf={eraProgress.length}
        onClick={() => open("era")}
      />
      <DockButton
        img="/assets/images/log.png"
        fallbackIcon="archive-research"
        label="Log"
        onClick={() => open("log")}
      />
    </div>
  );
}

const DOCK_TIPS: Record<string, string> = {
  HQ: "Club HQ — overview, team, production, facilities",
  Indies: "Independents ledger — relationships, influence, prospect pipelines",
  People: "People — staff and opportunities you've collected",
  Scouting: "Scouting — every player and prospect your club knows about",
  Era: "Era progress — your checklist to the next era",
  Log: "Event log — everything that has happened",
};

function DockButton({
  icon,
  img,
  fallbackIcon,
  label,
  count,
  countOf,
  onClick,
}: {
  // A game-icons SVG name (auto-inverted for the dark UI)…
  icon?: string;
  // …or a full-color PNG path (rendered as-is). If the PNG 404s we fall back
  // to the game-icons SVG named by `fallbackIcon`.
  img?: string;
  fallbackIcon?: string;
  label: string;
  count?: number;
  countOf?: number;
  onClick: () => void;
}) {
  const svgSrc = (name: string) => `/assets/vendor/game-icons/svg/${name}.svg`;
  return (
    <button
      className="dock-btn has-tip"
      data-tip={DOCK_TIPS[label] ?? label}
      onClick={onClick}
    >
      {img ? (
        <img
          className="dock-btn-png"
          src={img}
          alt=""
          aria-hidden
          onError={(e) => {
            // PNG not present yet — swap in the game-icons SVG and drop the
            // no-invert styling so the mono glyph reads on the dark dock.
            if (!fallbackIcon) return;
            const el = e.currentTarget;
            if (el.dataset.fellBack) return;
            el.dataset.fellBack = "1";
            el.classList.remove("dock-btn-png");
            el.src = svgSrc(fallbackIcon);
          }}
        />
      ) : (
        <img src={svgSrc(icon ?? "hockey")} alt="" aria-hidden />
      )}
      <span className="dock-btn-label">{label}</span>
      {count !== undefined && (
        <span className="dock-btn-count">
          {count}
          {countOf !== undefined ? `/${countOf}` : ""}
        </span>
      )}
    </button>
  );
}

// Every major club you've met, Civ-style: leader portraits across the top of
// the map. Click one for a quick dossier (era, attitude, identity).
function RivalsStrip({ state }: { state: GameState }) {
  const [openClubId, setOpenClubId] = useState<string | null>(null);
  const met = state.world?.rivals.filter((r) => r.contacted) ?? [];
  if (met.length === 0) return null;
  const open = met.find((r) => r.clubId === openClubId) ?? null;
  const openClub = open ? CLUBS[open.clubId] : null;
  return (
    <div className="rivals-strip">
      <div className="rivals-strip-row">
        {met.map((r) => {
          const club = CLUBS[r.clubId];
          if (!club) return null;
          return (
            <button
              key={r.clubId}
              className={`rival-face${openClubId === r.clubId ? " on" : ""}`}
              style={{ borderColor: club.accent }}
              title={club.name}
              onClick={() =>
                setOpenClubId((cur) => (cur === r.clubId ? null : r.clubId))
              }
            >
              <img
                src={clubAsset(club, "leader")}
                alt={club.name}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </button>
          );
        })}
      </div>
      {open && openClub && (
        <div className="rival-popover" style={{ borderTopColor: openClub.accent }}>
          <div className="rival-popover-head">
            <img
              className="rival-popover-crest"
              src={clubAsset(openClub, "logo")}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <div>
              <div className="rival-popover-name">{openClub.name}</div>
              <div className="rival-popover-meta">
                {openClub.leaderArchetype} · {ERAS[open.eraId]?.name ?? open.eraId}
              </div>
            </div>
          </div>
          <div className="rival-popover-line">{openClub.identityText}</div>
          <div className="rival-popover-attitude">
            {open.attitude === "friendly"
              ? "You parted as future friends."
              : open.attitude === "wary"
                ? "You took their measure coldly — they remember."
                : "No formal stance yet."}
            {" "}Scrimmages, trades, and sabotage arrive in later eras.
          </div>
        </div>
      )}
    </div>
  );
}

// Civ-VI-style notification rail: one icon chip per event from the current
// turn, newest on top, hover for the story, click to open the full log.
// Major beats (era, meetings, completions) still get full-screen treatments —
// this rail is the quiet running tally.
const NOTIF_ICONS: Record<string, string> = {
  resource: "coins",
  build: "barn",
  research: "archive-research",
  discovery: "spyglass",
  card: "checklist",
  era: "trophy-cup",
  rival: "flag-objective",
  flavor: "hockey",
};

function NotificationRail({
  state,
  onOpenLog,
}: {
  state: GameState;
  onOpenLog: () => void;
}) {
  const thisTurn = state.eventLog
    .filter((e) => e.month === state.month)
    .slice(0, 8);
  if (thisTurn.length === 0) return null;
  return (
    <div className="notif-rail" aria-label="This turn's events">
      {thisTurn.map((e) => (
        <button
          key={e.id}
          className={`notif-chip notif-${e.type} has-tip tip-left`}
          data-tip={`${e.title} — ${e.message}`}
          aria-label={e.title}
          onClick={onOpenLog}
        >
          <img
            src={`/assets/vendor/game-icons/svg/${NOTIF_ICONS[e.type] ?? "hockey"}.svg`}
            alt=""
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function TaskOverlay({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="task-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button className="overlay-scrim" aria-label="Close overlay" onClick={onClose} />
      <div className={`overlay-sheet${wide ? " wide" : ""}`}>
        <div className="overlay-head">
          <h2>{title}</h2>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        <div className="overlay-body">{children}</div>
      </div>
    </div>
  );
}

function overlayTitle(view: Exclude<OverlayView, null>) {
  const titles: Record<Exclude<OverlayView, null>, string> = {
    build: "Choose Production",
    research: "Choose Research",
    club: "Club HQ",
    independents: "Independents",
    people: "People",
    scouting: "Scouting",
    era: "Era Progress",
    log: "Event Log",
  };
  return titles[view];
}

function activeProductionName(state: GameState) {
  if (!state.activeProduction) return undefined;
  return productionItemName(
    state.activeProduction.kind,
    state.activeProduction.itemId,
  );
}

function activeResearchName(state: GameState) {
  if (!state.activeResearch) return undefined;
  return RESEARCH_BY_ID[state.activeResearch.techId]?.name;
}

function completionEvents(state: GameState): EventLogEntry[] {
  return state.eventLog.filter(
    (event) =>
      (event.type === "build" &&
        (event.title.endsWith(" completed") || event.title.endsWith(" ready"))) ||
      (event.type === "research" && event.title.endsWith(" complete")),
  );
}

// Goodie-hut pop-up: shown the moment a unit steps onto a marker. The player
// reads the randomized event + its outcome, then "Continue" commits the effect.
function EncounterOverlay({
  encounter,
  onAcknowledge,
}: {
  encounter: PendingEncounter;
  onAcknowledge: () => void;
}) {
  const icon = ENCOUNTER_ICON[encounter.kind] ?? "❄️";
  return (
    <div
      className="task-overlay completion-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={encounter.name}
    >
      <button
        className="overlay-scrim"
        aria-label="Acknowledge encounter"
        onClick={onAcknowledge}
      />
      <div className="completion-sheet">
        <div className={`completion-art encounter-${encounter.tone}`}>
          <span className="completion-icon">{icon}</span>
          <span className="completion-glow" />
        </div>
        <div className="completion-copy">
          <div className="eyebrow">Goodie Hut · {encounter.kind.replace("-", " ")}</div>
          <h2>{encounter.name}</h2>
          <p>{encounter.description}</p>
          <div className="completion-value">
            <span>{encounter.tone === "bad" ? "Setback" : "Outcome"}</span>
            <strong>{encounter.outcome}</strong>
          </div>
          <button className="btn btn-gold" onClick={onAcknowledge}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

const ENCOUNTER_ICON: Record<PendingEncounter["kind"], string> = {
  wanderer: "🧍",
  equipment: "🥅",
  "local-believer": "🙌",
  mishap: "💥",
  rumor: "🗺️",
};

function CompletionOverlay({
  event,
  onClose,
}: {
  event: EventLogEntry;
  onClose: () => void;
}) {
  const detail = completionDetail(event);

  return (
    <div className="task-overlay completion-overlay" role="dialog" aria-modal="true" aria-label={event.title}>
      <button className="overlay-scrim" aria-label="Close completion" onClick={onClose} />
      <div className="completion-sheet">
        <div className={`completion-art ${detail.kind}`}>
          <ItemArt
            kind={
              detail.kind === "build"
                ? "facility"
                : detail.kind === "unit"
                  ? "unit"
                  : "research"
            }
            id={detail.id ?? ""}
            className="completion-item-art"
          />
          <span className="completion-glow" />
        </div>
        <div className="completion-copy">
          <div className="eyebrow">{detail.eyebrow}</div>
          <h2>{detail.name}</h2>
          <p>{event.message}</p>
          <div className="completion-value">
            <span>Value</span>
            <strong>{detail.value}</strong>
          </div>
          <button className="btn btn-gold" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function completionDetail(event: EventLogEntry): {
  eyebrow: string;
  id?: string;
  kind: "build" | "research" | "unit";
  name: string;
  value: string;
} {
  if (event.type === "build" && event.title.endsWith(" ready")) {
    const def = Object.values(ALL_UNIT_DEFS_BY_ID).find(
      (unit) => `${unit.name} ready` === event.title,
    );
    return {
      eyebrow: "Unit Ready",
      id: def?.id,
      kind: "unit",
      name: def?.name ?? event.title,
      value: def
        ? `${def.abilitySummary}${def.spawnsMapUnit ? " They're standing by at your HQ — select and move them out." : ""}`
        : "A new unit joins the club.",
    };
  }
  if (event.type === "build") {
    const def = Object.values(ALL_FACILITY_DEFS_BY_ID).find(
      (facility) => `${facility.name} completed` === event.title,
    );
    return {
      eyebrow: "Build Complete",
      id: def?.id,
      kind: "build",
      name: def?.name ?? event.title,
      value: def ? facilityValue(def.id) : "New club infrastructure is online.",
    };
  }

  const def = Object.values(RESEARCH_BY_ID).find(
    (research) => `${research.name} complete` === event.title,
  );
  return {
    eyebrow: "Research Complete",
    id: def?.id,
    kind: "research",
    name: def?.name ?? event.title,
    // "You can now …" — the concrete payoff, not a vague foundation line.
    value: def ? techPayoff(def) : "New hockey knowledge unlocked.",
  };
}

function facilityValue(id: string): string {
  const def = ALL_FACILITY_DEFS_BY_ID[id];
  if (!def) return "New club infrastructure is online.";
  const effects = def.effects.map((effect) => {
    if (effect.type === "monthlyIncome") {
      return `+${effect.amount} ${RESOURCE_LABELS[effect.resource]}/mo`;
    }
    if (effect.type === "unlockRecruitment") return "Unlocks basic player recruitment";
    return "Improves local recruitment events";
  });
  return effects.length > 0 ? effects.join(" · ") : "Adds a new club capability";
}

import { useEffect, useRef, useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type {
  EventLogEntry,
  GameAction,
  GameState,
  PendingEncounter,
} from "../types/game";
import { Onboarding } from "./Onboarding";
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
import { ScoutingScreen, PlayerFileOverlay } from "./ScoutingScreen";
import type { PlayerFileTarget } from "./ScoutingScreen";
import { Inbox } from "./Inbox";
import { unreadCount } from "../engine/log";
import { EraProgressPanel } from "./EraProgressPanel";
import {
  canEndMonth as canEndMonthSel,
  getAvailableResearch,
  getEraProgress,
} from "../engine/selectors";
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
import { MatchResultScreen } from "./MatchResultScreen";
import { exhibitionGate, exhibitionGateHint } from "../engine/matchEngine";
import { NetworkEstablishedScene } from "./NetworkEstablishedScene";
import { IndependentsScreen } from "./IndependentsScreen";
import { WandererScene } from "./WandererScene";
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
  // The EHM player file, openable over any screen (Team, tryout, the signing
  // cinematic). Rendered top-level so it stacks above every other modal.
  const [fileTarget, setFileTarget] = useState<PlayerFileTarget | null>(null);
  const [inboxFocusId, setInboxFocusId] = useState<string | null>(null);
  const [leaderClubId, setLeaderClubId] = useState<string | null>(null);
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
      const t = setTimeout(() => setEraToast(null), 4200);
      return () => clearTimeout(t);
    }
  }, [eraMet.map((r) => r.id).join("|")]);

  // End Turn gets one rollover sound. Follow-up modals/banners stay silent so
  // production notifications do not read as a second click.
  useEffect(() => {
    if (state.month > 1) playSfx("endTurn");
  }, [state.month]);

  // A player scout entering the penalty box only happens from a wanderer scrap,
  // which today resolves to a log line with no modal — fire the negative event
  // stinger the moment it does. Interim hook: when the scrap gets its own
  // outcome modal (docs/18), move this SFX onto that modal's mount.
  const boxedCountRef = useRef(0);
  const boxedScoutCount = (state.world?.scouts ?? []).filter(
    (s) => (s.penaltyBoxTurns ?? 0) > 0,
  ).length;
  useEffect(() => {
    if (boxedScoutCount > boxedCountRef.current) playSfx("eventBad");
    boxedCountRef.current = boxedScoutCount;
  }, [boxedScoutCount]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Enter" && e.code !== "NumpadEnter") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      const target = e.target as HTMLElement | null;
      if (isTypingTarget(target)) return;

      e.preventDefault();
      e.stopPropagation();
      clickTopModalDismissButton();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);

  return (
    <div className="dashboard dashboard-map-mode">
      <TopBar
        state={state}
        dispatch={dispatch}
        onOpenHQ={() => openView("club")}
        onOpenProduction={() => openView("build")}
        onOpenResearch={() => setOverlay("research")}
      />

      <div className="map-stage">
        <IsoWorldMap
          state={state}
          dispatch={dispatch}
          onOpenHQ={() => openView("club")}
          onOpenIndependent={(orgId) => {
            setLedgerFocusOrgId(orgId);
            setOverlay("independents");
          }}
          headerTools={
            <div className="map-header-actions">
              <RivalsStrip state={state} onOpenLeader={setLeaderClubId} />
              <MapDateBadge month={state.month} />
              <InfoDock
                state={state}
                open={openView}
                onOpenTeam={() => {
                  setHqInitialTab("team");
                  setOverlay("club");
                }}
                onOpenInbox={() => {
                  setInboxFocusId(null);
                  openView("log");
                }}
              />
            </div>
          }
          railSlot={<CommandRail state={state} dispatch={dispatch} open={openView} />}
        />
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
            setInboxFocusId(null);
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
          {overlay === "scouting" && (
            <ScoutingScreen state={state} dispatch={dispatch} />
          )}
          {overlay === "era" && <EraProgressPanel state={state} />}
          {overlay === "log" && (
            <Inbox
              state={state}
              dispatch={dispatch}
              initialEntryId={inboxFocusId}
            />
          )}
        </TaskOverlay>
      )}

      {overlay === "club" && (
        <ClubHQScreen
          state={state}
          dispatch={dispatch}
          onClose={() => setOverlay(null)}
          initialTab={hqInitialTab}
          onOpenPlayerFile={(player) =>
            setFileTarget({ kind: "player", player })
          }
        />
      )}

      {state.pendingEncounter && (
        <EncounterOverlay
          encounter={state.pendingEncounter}
          onAcknowledge={() => dispatch({ type: "RESOLVE_ENCOUNTER" })}
        />
      )}

      {state.pendingWanderer && <WandererScene state={state} dispatch={dispatch} />}

      {state.pendingTryout && (
        <TryoutScreen
          state={state}
          dispatch={dispatch}
          onOpenPlayerFile={(candidate) =>
            setFileTarget({ kind: "candidate", candidate })
          }
        />
      )}

      {state.pendingPlayerReveal && (
        <PlayerRevealScene
          reveal={state.pendingPlayerReveal}
          club={state.club}
          dispatch={dispatch}
          onViewProfile={(player) => setFileTarget({ kind: "player", player })}
          onViewSquad={() => {
            dispatch({ type: "ACKNOWLEDGE_PLAYER_REVEAL" });
            setHqInitialTab("team");
            setOverlay("club");
          }}
        />
      )}

      {state.pendingMeeting?.kind === "rival" && (
        <RivalMeetingScreen
          clubId={state.pendingMeeting.id}
          month={state.month}
          dispatch={dispatch}
        />
      )}

      {leaderClubId && !state.pendingMeeting && (
        <RivalMeetingScreen
          clubId={leaderClubId}
          month={state.month}
          dispatch={dispatch}
          mode="dossier"
          rival={state.world?.rivals.find((r) => r.clubId === leaderClubId) ?? null}
          onClose={() => setLeaderClubId(null)}
          exhibition={{
            canPlay: exhibitionGate(state, leaderClubId) === "ok",
            hint: exhibitionGateHint(exhibitionGate(state, leaderClubId)),
            onPlay: () => {
              setLeaderClubId(null);
              dispatch({ type: "PLAY_EXHIBITION", rivalClubId: leaderClubId });
            },
          }}
        />
      )}

      {state.pendingMatchResult && (
        <TaskOverlay
          title="Exhibition — Final"
          onClose={() => dispatch({ type: "ACKNOWLEDGE_MATCH_RESULT" })}
        >
          <MatchResultScreen result={state.pendingMatchResult} />
        </TaskOverlay>
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

      {state.pendingNetwork && !state.pendingMeeting && (
        <NetworkEstablishedScene
          state={state}
          orgId={state.pendingNetwork.orgId}
          unitId={state.pendingNetwork.unitId}
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

      {fileTarget && (
        <PlayerFileOverlay
          state={state}
          dispatch={dispatch}
          target={fileTarget}
          onClose={() => setFileTarget(null)}
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
  const researchOptions = getAvailableResearch(state).length;
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

  const canEndMonth = canEndMonthSel(state);
  const selectScout = () => {
    if (!selectedScout && scouts[0]?.id) {
      dispatch({ type: "SELECT_SCOUT", scoutId: scouts[0].id });
    }
  };

  // "Next Tasks" is Civ-VI-style must-resolve-only now (D56): research and
  // production are optional upfront purchases you make whenever you like (via
  // the Funds/HK header shortcuts or the dock), so they no longer nag here. The
  // only per-turn nudge left is moving scouts — their moves reset each turn.
  return (
    <aside className="command-rail">
      <div className="rail-title">Next Tasks</div>
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
          title={tryoutGateHint(tryoutGate(state), state.month)}
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
        End Turn
      </button>
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

function MapDateBadge({ month }: { month: number }) {
  return (
    <div className="map-date-badge" title={`Turn ${month}`}>
      <span>{turnDateLong(month)}</span>
      <strong>Turn {month}</strong>
    </div>
  );
}

function InfoDock({
  state,
  open,
  onOpenTeam,
  onOpenInbox,
}: {
  state: GameState;
  open: (view: OverlayView) => void;
  onOpenTeam: () => void;
  onOpenInbox: () => void;
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
  const unread = unreadCount(state);
  const dockLabel = (label: string, count: number, total?: number) =>
    total === undefined ? `${label} ${count}` : `${label} ${count}/${total}`;
  return (
    <div className="info-dock" role="toolbar" aria-label="Club screens">
      <DockButton
        img="/assets/images/team.png"
        fallbackIcon="hockey"
        label="Team"
        ariaLabel={`Team roster ${state.roster.length} players`}
        onClick={onOpenTeam}
      />
      <DockButton
        img="/assets/images/independents.png"
        fallbackIcon="village"
        label="Indies"
        ariaLabel={dockLabel("Independents", contactedOrgs)}
        onClick={() => open("independents")}
      />
      <DockButton
        img="/assets/images/people.png"
        fallbackIcon="checklist"
        label="People"
        ariaLabel={dockLabel("People", state.cards.length)}
        onClick={() => open("people")}
      />
      <DockButton
        img="/assets/images/scouting.png"
        fallbackIcon="spyglass"
        label="Scouting"
        ariaLabel={dockLabel("Scouting", knownProspects)}
        onClick={() => open("scouting")}
      />
      <DockButton
        img="/assets/images/era.png"
        fallbackIcon="flag-objective"
        label="Era"
        ariaLabel={dockLabel("Era progress", eraDone, eraProgress.length)}
        onClick={() => open("era")}
      />
      <DockButton
        img="/assets/images/inbox.png"
        fallbackIcon="archive-research"
        label="Inbox"
        ariaLabel={unread > 0 ? `Inbox ${unread} unread` : "Inbox"}
        alertCount={unread}
        onClick={onOpenInbox}
      />
    </div>
  );
}

const DOCK_TIPS: Record<string, string> = {
  HQ: "Club HQ — overview, team, production, facilities",
  Team: "Team — roster, first line, bench, and tryouts",
  Indies: "Independents ledger — relationships, influence, prospect pipelines",
  People: "People — staff and opportunities you've collected",
  Scouting: "Scouting — every player and prospect your club knows about",
  Era: "Era progress — your checklist to the next era",
  Inbox: "Inbox — reports, news, and everything that has happened",
};

function DockButton({
  icon,
  img,
  fallbackIcon,
  label,
  ariaLabel,
  alertCount,
  onClick,
}: {
  // A game-icons SVG name (auto-inverted for the dark UI)…
  icon?: string;
  // …or a full-color PNG path (rendered as-is). If the PNG 404s we fall back
  // to the game-icons SVG named by `fallbackIcon`.
  img?: string;
  fallbackIcon?: string;
  label: string;
  ariaLabel?: string;
  alertCount?: number;
  onClick: () => void;
}) {
  const svgSrc = (name: string) => `/assets/vendor/game-icons/svg/${name}.svg`;
  return (
    <button
      className="dock-btn has-tip"
      data-tip={DOCK_TIPS[label] ?? label}
      aria-label={ariaLabel ?? label}
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
      {alertCount !== undefined && alertCount > 0 && (
        <span className="dock-alert-count" aria-hidden>
          {alertCount > 99 ? "99+" : alertCount}
        </span>
      )}
    </button>
  );
}

// Every major club you've met, Civ-style: leader portraits across the top of
// the map. Click one for a quick dossier (era, attitude, identity).
function RivalsStrip({
  state,
  onOpenLeader,
}: {
  state: GameState;
  onOpenLeader: (clubId: string) => void;
}) {
  const met = state.world?.rivals.filter((r) => r.contacted) ?? [];
  if (met.length === 0) return null;
  return (
    <div className="rivals-strip">
      <div className="rivals-strip-row">
        {met.map((r) => {
          const club = CLUBS[r.clubId];
          if (!club) return null;
          return (
            <button
              key={r.clubId}
              className="rival-face"
              style={{ borderColor: club.accent }}
              onClick={() => onOpenLeader(r.clubId)}
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
    log: "Inbox",
  };
  return titles[view];
}

function activeResearchName(state: GameState) {
  if (!state.activeResearch) return undefined;
  return RESEARCH_BY_ID[state.activeResearch.techId]?.name;
}

function isTypingTarget(target: HTMLElement | null): boolean {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

function clickTopModalDismissButton(): void {
  const dialogs = Array.from(
    document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'),
  );
  const dialog = dialogs[dialogs.length - 1];
  if (!dialog) return;
  const buttons = Array.from(
    dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
  );
  const dismiss = buttons.find((button) => {
    const label = `${button.getAttribute("aria-label") ?? ""} ${button.textContent ?? ""}`;
    return /\b(close|continue|acknowledge)\b/i.test(label);
  });
  dismiss?.click();
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
  // Positive/negative event stinger when the outcome appears (event-sfx-01/02).
  useEffect(() => {
    playSfx(encounter.tone === "bad" ? "eventBad" : "eventGood");
  }, [encounter.tone]);
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
      return `+${effect.amount} ${RESOURCE_LABELS[effect.resource]}/turn`;
    }
    if (effect.type === "unlockRecruitment") return "Unlocks basic player recruitment";
    return "Improves local recruitment events";
  });
  return effects.length > 0 ? effects.join(" · ") : "Adds a new club capability";
}

import { useEffect, useState } from "react";
import type { Dispatch, ReactNode, SyntheticEvent } from "react";
import type {
  EventLogEntry,
  GameAction,
  GameState,
  PendingEncounter,
} from "../types/game";
import { clubAsset } from "../data/clubs";
import { DISCOVERY_BY_ID } from "../data/discovery";
import { CLUB_FORMATION_UNLOCK_MESSAGE } from "../data/eras";
import { FACILITIES_BY_ID } from "../data/facilities";
import { RESEARCH_BY_ID } from "../data/research";
import { RESOURCE_LABELS } from "../engine/resources";
import { TopBar } from "./TopBar";
import { IsoWorldMap } from "./IsoWorldMap";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { ClubHQScreen, type HQTab } from "./ClubHQScreen";
import { ResearchPanel } from "./ResearchPanel";
import { CardsPanel } from "./CardsPanel";
import { EventLog } from "./EventLog";
import { EraProgressPanel } from "./EraProgressPanel";
import { getAvailableResearch } from "../engine/selectors";
import {
  productionItemName,
  startableProductionCount,
} from "../engine/productionSystem";
import { activeScout, allScouts } from "../engine/scoutSystem";

type OverlayView =
  | "build"
  | "research"
  | "search"
  | "club"
  | "cards"
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

  return (
    <div className="dashboard dashboard-map-mode">
      <TopBar
        state={state}
        dispatch={dispatch}
        onOpenHQ={() => openView("club")}
      />

      {state.nextEraUnlocked && (
        <div className="era-banner">
          <h3>Club Formation Era reached</h3>
          <div className="muted">{CLUB_FORMATION_UNLOCK_MESSAGE}</div>
        </div>
      )}

      {pastTwelve && (
        <div className="teaser-banner">
          <strong>The opening scenario is behind you.</strong>{" "}
          {state.club?.name} made it through Year One — and you are already into
          Month {state.month}. The deeper hockey world, and the eras beyond it,
          are waiting.
        </div>
      )}

      <div className="map-stage">
        <IsoWorldMap
          state={state}
          dispatch={dispatch}
          onOpenHQ={() => openView("club")}
        />
        <CommandRail state={state} dispatch={dispatch} open={openView} />
      </div>

      <InfoDock state={state} open={openView} />

      {overlay && overlay !== "club" && (
        <TaskOverlay title={overlayTitle(overlay)} onClose={() => setOverlay(null)}>
          {overlay === "research" && <ResearchPanel state={state} dispatch={dispatch} />}
          {overlay === "search" && <DiscoveryPanel state={state} dispatch={dispatch} />}
          {overlay === "cards" && <CardsPanel state={state} />}
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
        <FoundingMoment
          state={state}
          onClose={() => setShowFoundingMoment(false)}
          onOpenHQ={() => {
            setShowFoundingMoment(false);
            setOverlay("club");
          }}
        />
      )}
    </div>
  );
}

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

// The "club founded" beat, shown over the live map so the moment stays part of
// the same map-oriented gameplay instead of a disconnected screen.
function FoundingMoment({
  state,
  onClose,
  onOpenHQ,
}: {
  state: GameState;
  onClose: () => void;
  onOpenHQ: () => void;
}) {
  const club = state.club!;
  return (
    <div
      className="founding-moment"
      role="dialog"
      aria-modal="true"
      aria-label={`${club.name} founded`}
    >
      <div className="founding-moment-scrim" />
      <div className="founding-moment-card">
        <div className="fmoment-rink-wrap">
          <img
            className="fmoment-rink"
            src={clubAsset(club, "rink")}
            alt={`${club.name} rink`}
            onError={hideOnError}
          />
          <div className="fmoment-sweep" />
        </div>
        <div className="fmoment-body">
          <div className="eyebrow">Club Founded · Month {state.month}</div>
          <h2>{club.name}</h2>
          <p>
            The first home ice is claimed. Production opens — choose your first
            build, then finish out the month.
          </p>
          <div className="fmoment-actions">
            <button className="btn btn-primary" onClick={onClose}>
              Continue
            </button>
            <button className="btn" onClick={onOpenHQ}>
              Open Club HQ
            </button>
          </div>
        </div>
      </div>
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
  const discoveryReady = !!DISCOVERY_BY_ID[state.discovery.activePriorityId];
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
  const discoveryTask = (
    <TaskButton
      done={discoveryReady}
      label="Local search"
      detail={DISCOVERY_BY_ID[state.discovery.activePriorityId]?.name}
      onClick={() => open("search")}
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
        <div className="rail-title">Found Your Club · Month {state.month}</div>
        {researchTask}
        {discoveryTask}
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

  const canEndMonth = buildReady && researchReady && discoveryReady;
  const selectScout = () => {
    if (!selectedScout && scouts[0]?.id) {
      dispatch({ type: "SELECT_SCOUT", scoutId: scouts[0].id });
    }
  };

  const missing: string[] = [];
  if (!buildReady) missing.push("build");
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
              : "Choose production"
        }
        detail={activeProductionName(state)}
        onClick={() => open("build")}
      />
      {researchTask}
      {discoveryTask}
      {scouts.length > 0 && (
        <TaskButton
          done={scoutReady}
          label={scoutReady ? "Scouts moved" : "Move scouts"}
          detail={`${scoutMovesRemaining}/${scoutMovesTotal} moves remaining`}
          onClick={selectScout}
        />
      )}
      <button
        className="btn btn-gold btn-block rail-end"
        disabled={!canEndMonth}
        onClick={() => dispatch({ type: "END_MONTH" })}
      >
        End Month {state.month}
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
  return (
    <div className="info-dock">
      <button onClick={() => open("club")}>HQ</button>
      <button onClick={() => open("cards")}>Cards {state.cards.length}</button>
      <button onClick={() => open("era")}>Era</button>
      <button onClick={() => open("log")}>Log {state.eventLog.length}</button>
    </div>
  );
}

function TaskOverlay({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="task-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <button className="overlay-scrim" aria-label="Close overlay" onClick={onClose} />
      <div className="overlay-sheet">
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
    search: "Local Hockey Search",
    club: "Club HQ",
    cards: "Cards",
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
      (event.type === "build" && event.title.endsWith(" completed")) ||
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
          <span className="completion-icon">{detail.icon}</span>
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
  icon: string;
  kind: "build" | "research";
  name: string;
  value: string;
} {
  if (event.type === "build") {
    const def = Object.values(FACILITIES_BY_ID).find(
      (facility) => `${facility.name} completed` === event.title,
    );
    return {
      eyebrow: "Build Complete",
      icon: facilityIcon(def?.id),
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
    icon: researchIcon(def?.id),
    kind: "research",
    name: def?.name ?? event.title,
    value: def ? researchValue(def.id) : "New hockey knowledge unlocked.",
  };
}

function facilityValue(id: string): string {
  const def = FACILITIES_BY_ID[id];
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

function researchValue(id: string): string {
  const def = RESEARCH_BY_ID[id];
  if (!def) return "New hockey knowledge unlocked.";
  const unlocks = def.unlocks.map((unlock) => {
    if (unlock.type === "card") return "Adds a staff card opportunity";
    if (unlock.type === "deeperDiscovery") return "Improves discovery leads";
    if (unlock.type === "prospectGeneration") return "Unlocks prospect generation";
    if (unlock.type === "goalieEvents") return "Unlocks goalie prospect events";
    return "Unlocks new options";
  });
  return unlocks.length > 0 ? unlocks.join(" · ") : "Improves your hockey foundation";
}

function facilityIcon(id: string | undefined): string {
  if (id === "outdoor-rink") return "RINK";
  if (id === "equipment-shed") return "GEAR";
  if (id === "clubhouse") return "HQ";
  if (id === "volunteer-coaching-bench") return "COACH";
  if (id === "local-notice-board") return "POST";
  return "BUILD";
}

function researchIcon(id: string | undefined): string {
  if (id === "basic-skating") return "EDGE";
  if (id === "organized-practice") return "DRILL";
  if (id === "scouting-reports") return "FILE";
  if (id === "youth-development") return "YOUTH";
  if (id === "goaltending-theory") return "NET";
  return "TECH";
}

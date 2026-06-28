import { useState } from "react";
import type { Dispatch, ReactNode } from "react";
import type { EventLogEntry, GameAction, GameState } from "../types/game";
import { DISCOVERY_BY_ID } from "../data/discovery";
import { CLUB_FORMATION_UNLOCK_MESSAGE } from "../data/eras";
import { FACILITIES_BY_ID } from "../data/facilities";
import { RESEARCH_BY_ID } from "../data/research";
import { RESOURCE_LABELS } from "../engine/resources";
import { TopBar } from "./TopBar";
import { ResourceBar } from "./ResourceBar";
import { IsoWorldMap } from "./IsoWorldMap";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { ClubHQPanel } from "./ClubHQPanel";
import { BuildPanel } from "./BuildPanel";
import { ResearchPanel } from "./ResearchPanel";
import { CardsPanel } from "./CardsPanel";
import { EventLog } from "./EventLog";
import { EraProgressPanel } from "./EraProgressPanel";
import {
  getAvailableFacilities,
  getAvailableResearch,
} from "../engine/selectors";

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
  const [dismissedCompletions, setDismissedCompletions] = useState<Set<string>>(
    () => new Set(completionEvents(state).map((e) => e.id)),
  );
  const pastTwelve = state.month > state.maxMonths;
  const completion = completionEvents(state).find(
    (event) => !dismissedCompletions.has(event.id),
  );

  return (
    <div className="dashboard dashboard-map-mode">
      <TopBar state={state} dispatch={dispatch} />

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

      <div className="map-hud">
        <ResourceBar state={state} />
      </div>

      <div className="map-stage">
        <IsoWorldMap state={state} dispatch={dispatch} />
        <CommandRail state={state} dispatch={dispatch} open={setOverlay} />
      </div>

      <InfoDock state={state} open={setOverlay} />

      {overlay && (
        <TaskOverlay title={overlayTitle(overlay)} onClose={() => setOverlay(null)}>
          {overlay === "build" && <BuildPanel state={state} dispatch={dispatch} />}
          {overlay === "research" && <ResearchPanel state={state} dispatch={dispatch} />}
          {overlay === "search" && <DiscoveryPanel state={state} dispatch={dispatch} />}
          {overlay === "club" && <ClubHQPanel state={state} />}
          {overlay === "cards" && <CardsPanel state={state} />}
          {overlay === "era" && <EraProgressPanel state={state} />}
          {overlay === "log" && <EventLog state={state} />}
        </TaskOverlay>
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
  const buildOptions = getAvailableFacilities(state).length;
  const researchOptions = getAvailableResearch(state).length;
  const buildReady = !!state.activeBuild || buildOptions === 0;
  const researchReady = !!state.activeResearch || researchOptions === 0;
  const discoveryReady = !!DISCOVERY_BY_ID[state.discovery.activePriorityId];
  const scout = state.world?.scout;
  const scoutReady = !scout || scout.movesRemaining === 0;
  const canEndMonth = buildReady && researchReady && discoveryReady && scoutReady;

  const selectScout = () => {
    if (!state.world?.scoutSelected) dispatch({ type: "SELECT_SCOUT" });
  };

  const missing: string[] = [];
  if (!buildReady) missing.push("build");
  if (!researchReady) missing.push("research");
  if (!scoutReady) missing.push("scout moves");

  return (
    <aside className="command-rail">
      <div className="rail-title">Next Tasks</div>
      <TaskButton
        done={buildReady}
        label={state.activeBuild ? "Build active" : buildOptions === 0 ? "Builds complete" : "Choose build"}
        detail={activeBuildName(state)}
        onClick={() => open("build")}
      />
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
      <TaskButton
        done={discoveryReady}
        label="Local search"
        detail={DISCOVERY_BY_ID[state.discovery.activePriorityId]?.name}
        onClick={() => open("search")}
      />
      {scout && (
        <TaskButton
          done={scoutReady}
          label={scoutReady ? "Scout moved" : "Move scout"}
          detail={`${scout.movesRemaining}/${scout.movesPerTurn} moves`}
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

function activeBuildName(state: GameState) {
  if (!state.activeBuild) return undefined;
  return FACILITIES_BY_ID[state.activeBuild.facilityId]?.name;
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

import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUB_FORMATION_UNLOCK_MESSAGE } from "../data/eras";
import { TopBar } from "./TopBar";
import { ResourceBar } from "./ResourceBar";
import { WorldMap } from "./WorldMap";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { ThisMonthPanel } from "./ThisMonthPanel";
import { ClubHQPanel } from "./ClubHQPanel";
import { BuildPanel } from "./BuildPanel";
import { ResearchPanel } from "./ResearchPanel";
import { CardsPanel } from "./CardsPanel";
import { EventLog } from "./EventLog";
import { EraProgressPanel } from "./EraProgressPanel";

export function Dashboard({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const pastTwelve = state.month > state.maxMonths;

  return (
    <div className="dashboard">
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

      <ResourceBar state={state} />

      <div className="strategy-grid">
        {/* Map-first: the world dominates the center/left */}
        <div className="map-col">
          <WorldMap state={state} />
          <DiscoveryPanel state={state} dispatch={dispatch} />
        </div>

        {/* Decisions live in the command sidebar */}
        <div className="control-col">
          <ThisMonthPanel state={state} dispatch={dispatch} />
          <BuildPanel state={state} dispatch={dispatch} />
          <ResearchPanel state={state} dispatch={dispatch} />
          <CardsPanel state={state} />
          <EraProgressPanel state={state} />
          <ClubHQPanel state={state} />
          <EventLog state={state} />
        </div>
      </div>
    </div>
  );
}

import type { Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { CLUB_FORMATION_UNLOCK_MESSAGE } from "../data/eras";
import { TopBar } from "./TopBar";
import { ResourceBar } from "./ResourceBar";
import { ClubHQPanel } from "./ClubHQPanel";
import { BuildPanel } from "./BuildPanel";
import { ResearchPanel } from "./ResearchPanel";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { RegionsPanel } from "./RegionsPanel";
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
  const endLabel =
    state.month >= state.maxMonths
      ? `End Month ${state.month} →`
      : `End Month ${state.month}`;

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
          <strong>The first twelve months are behind you.</strong> Arizona Monsoon
          HC made it through Year One — and you are already into Month{" "}
          {state.month}. The deeper hockey world is waiting.
        </div>
      )}

      <ResourceBar state={state} />

      <div className="grid">
        <div>
          <ClubHQPanel state={state} />
          <EraProgressPanel state={state} />
        </div>
        <div>
          <BuildPanel state={state} dispatch={dispatch} />
          <ResearchPanel state={state} dispatch={dispatch} />
        </div>
        <div>
          <DiscoveryPanel state={state} dispatch={dispatch} />
          <CardsPanel state={state} />
        </div>
      </div>

      <div className="grid" style={{ marginTop: 0 }}>
        <div className="col-span-2">
          <RegionsPanel state={state} />
        </div>
        <div>
          <EventLog state={state} />
        </div>
      </div>

      <div className="turn-footer">
        <button
          className="btn btn-gold btn-lg btn-block"
          onClick={() => dispatch({ type: "END_MONTH" })}
        >
          {endLabel}
        </button>
      </div>
    </div>
  );
}

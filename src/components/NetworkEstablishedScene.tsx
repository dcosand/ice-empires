import { useEffect, useState } from "react";
import type { CSSProperties, Dispatch } from "react";
import type { GameAction, GameState } from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";
import { indieAsset } from "../data/independents";
import { turnDateLabel } from "../engine/calendar";
import { ARCHETYPE_LABELS, tierName } from "../engine/independentsSystem";
import { missionTargetOrg, MISSION_REPORT_MONTHS } from "../engine/scoutSystem";
import { scoutCharacterFor } from "../engine/scoutStaff";
import { setContactMusicActive } from "./BackgroundMusic";

// The scouting-network payoff beat (docs/15 §4): your scout crossed the map
// and opened a pipeline — that's a moment, not a log line. Reuses the meeting
// cinematic staging. Offers the natural next order: begin the assignment.
export function NetworkEstablishedScene({
  state,
  orgId,
  unitId,
  dispatch,
  onOpenLedger,
}: {
  state: GameState;
  orgId: string;
  unitId: string;
  dispatch: Dispatch<GameAction>;
  onOpenLedger: (orgId: string) => void;
}) {
  const org = state.world?.hockeyOrgs.find((o) => o.id === orgId);
  const scout = scoutCharacterFor(state, unitId);
  const [bgFailed, setBgFailed] = useState(false);
  const [cardFailed, setCardFailed] = useState(false);
  useEffect(() => {
    if (!org) return undefined;
    setContactMusicActive(true);
    return () => setContactMusicActive(false);
  }, [org?.id]);

  if (!org) return null;

  const canAssign = !!missionTargetOrg(state, unitId);
  const close = () => dispatch({ type: "ACKNOWLEDGE_NETWORK" });

  const stageStyle = {
    "--meet-primary": "#14202e",
    "--meet-secondary": "#7cc4e8",
    "--meet-accent": "#f2c14e",
  } as CSSProperties;

  return (
    <div
      className="meeting-scene"
      style={stageStyle}
      role="dialog"
      aria-modal="true"
      aria-label={`Scouting network established with ${hockeyOrgDisplayName(org)}`}
    >
      {!bgFailed && (
        <img
          className="meeting-backdrop"
          src={indieAsset(org, "background")}
          alt=""
          aria-hidden
          onError={() => setBgFailed(true)}
        />
      )}
      <div className="meeting-letterbox top" />
      <div className="meeting-letterbox bottom" />
      <div className="meeting-stage">
        <div className="meeting-glow" />
        <div className="meeting-vignette">
          {!cardFailed && (
            <img
              className="meeting-indie-card"
              src={indieAsset(org, "card")}
              alt={hockeyOrgDisplayName(org)}
              onError={() => setCardFailed(true)}
            />
          )}
        </div>
        <div className="meeting-panel">
          <div className="meeting-eyebrow">
            Scouting Network Established · {turnDateLabel(state.month)}
          </div>
          <div className="meeting-crest-row">
            <div>
              <h2 className="meeting-name">{hockeyOrgDisplayName(org)}</h2>
              <div className="meeting-archetype">
                {ARCHETYPE_LABELS[org.archetype]} · now {tierName(org.relationshipLevel)}
              </div>
            </div>
          </div>
          <p className="meeting-line">
            {scout?.name ?? "Your Club Scout"} crossed the map, shook the right
            hands, and opened {hockeyOrgDisplayName(org)}'s doors — all{" "}
            {org.prospects.length} players in their system are on your board
            now.
          </p>
          <p className="meeting-line" style={{ opacity: 0.7, fontSize: 13 }}>
            Names are one thing; reads are another. Assign{" "}
            {scout?.name?.split(" ")[0] ?? "the scout"} to stay and watch, and a
            report lands every {MISSION_REPORT_MONTHS} turns — each viewing
            sharper than the last.
          </p>
          <div className="meeting-choices ready">
            {canAssign && (
              <button
                className="btn btn-primary meeting-choice"
                onClick={() => {
                  close();
                  dispatch({ type: "BEGIN_SCOUT_MISSION", unitId, orgId });
                }}
              >
                Begin the Scouting Assignment
                <span className="meeting-choice-sub">
                  {scout?.name ?? "The scout"} stays on station and files reports
                </span>
              </button>
            )}
            <button
              className="btn meeting-choice"
              onClick={() => {
                close();
                onOpenLedger(org.id);
              }}
            >
              See Their Players
              <span className="meeting-choice-sub">
                The full {hockeyOrgDisplayName(org)} pipeline in the ledger
              </span>
            </button>
            <button className="btn meeting-choice" onClick={close}>
              Continue
              <span className="meeting-choice-sub">Back to the map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

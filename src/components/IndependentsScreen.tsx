import type { Dispatch } from "react";
import type { GameAction, GameState, WorldHockeyOrg } from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { hockeyOrgDisplayName } from "../engine/world";
import {
  ARCHETYPE_LABELS,
  canSendIntroduction,
  INFLUENCE_THRESHOLDS,
  INTRO_COST_FUNDS,
  introGate,
  introGateHint,
  tierName,
} from "../engine/independentsSystem";

// The Independents ledger — the city-state / suzerain surface (v1). Lists every
// org you've met: relationship tier, influence progress, which rival majors
// have also made contact, and their prospect pipeline behind fog. Act 2 adds
// scouting networks (prospect reveal) and Anchor Club competition.
export function IndependentsScreen({
  state,
  dispatch,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}) {
  const orgs = state.world?.hockeyOrgs ?? [];
  const contacted = orgs.filter((o) => o.playerContacted);
  const known = orgs.filter((o) => o.discovered && !o.playerContacted);
  const hiddenCount = orgs.length - contacted.length - known.length;

  return (
    <div className="panel independents-panel">
      <div className="panel-sub">
        Independents are neutral hockey ecosystems — nobody's farm team, yet.
        Grow influence to climb Contacted → Friendly → Partner → Affiliate.
        Rival crests show who else is courting them. {hiddenCount > 0 && (
          <>Somewhere out there: {hiddenCount} more, still undiscovered.</>
        )}
      </div>

      {contacted.length === 0 && (
        <div className="faint" style={{ padding: "18px 4px" }}>
          You haven't met any independents yet. Move a unit next to one of the
          neutral hockey settlements on the map to make first contact.
        </div>
      )}

      <div className="indy-list">
        {contacted.map((org) => (
          <IndependentCard
            key={org.id}
            state={state}
            org={org}
            dispatch={dispatch}
          />
        ))}
      </div>

      {known.length > 0 && (
        <>
          <div className="indy-known-head">Sighted, not yet met</div>
          <div className="indy-known">
            {known.map((org) => (
              <span key={org.id} className="indy-known-chip">
                {hockeyOrgDisplayName(org)}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IndependentCard({
  state,
  org,
  dispatch,
}: {
  state: GameState;
  org: WorldHockeyOrg;
  dispatch: Dispatch<GameAction>;
}) {
  const gate = introGate(state, org.id);
  const nextThreshold =
    INFLUENCE_THRESHOLDS.find((t) => org.influencePoints < t) ?? null;
  const maxThreshold = INFLUENCE_THRESHOLDS[INFLUENCE_THRESHOLDS.length - 1];
  const barMax = maxThreshold * 1.1;

  return (
    <div className="indy-card">
      <div className="indy-card-head">
        <div>
          <div className="indy-name">{hockeyOrgDisplayName(org)}</div>
          <div className="indy-meta">
            {ARCHETYPE_LABELS[org.archetype]} · met Month {org.contactMonth}
          </div>
        </div>
        <span className={`indy-tier tier-${org.relationshipLevel}`}>
          {tierName(org.relationshipLevel)}
        </span>
      </div>

      <div className="indy-influence">
        <div className="indy-influence-bar">
          <div
            className="indy-influence-fill"
            style={{
              width: `${Math.min(100, (org.influencePoints / barMax) * 100)}%`,
            }}
          />
          {INFLUENCE_THRESHOLDS.map((t) => (
            <span
              key={t}
              className={`indy-tick${org.influencePoints >= t ? " passed" : ""}`}
              style={{ left: `${(t / barMax) * 100}%` }}
              title={`${t} influence`}
            />
          ))}
        </div>
        <div className="indy-influence-label">
          {org.influencePoints} influence
          {nextThreshold !== null && <> · next tier at {nextThreshold}</>}
        </div>
      </div>

      <div className="indy-cols">
        <div>
          <div className="indy-col-title">Prospect pipeline</div>
          <div className="indy-prospects">
            {org.prospects.map((p) => (
              <div key={p.id} className={`indy-prospect${p.revealed ? "" : " fogged"}`}>
                <span className={`pos-badge pos-${p.position}`}>{p.position}</span>
                <div>
                  <div className="indy-prospect-name">
                    {p.revealed ? p.id : "???"}
                  </div>
                  <div className="indy-prospect-teaser">“{p.teaser}”</div>
                </div>
              </div>
            ))}
          </div>
          <div className="faint" style={{ fontSize: 11, marginTop: 4 }}>
            A scouting network (next era) reveals who they actually are.
          </div>
        </div>
        <div>
          <div className="indy-col-title">Also in contact</div>
          {org.contactedByClubIds.length === 0 ? (
            <div className="faint" style={{ fontSize: 12 }}>
              No rival club has reached them. Yet.
            </div>
          ) : (
            <div className="indy-rivals">
              {org.contactedByClubIds.map((clubId) => {
                const club = CLUBS[clubId];
                if (!club) return null;
                return (
                  <img
                    key={clubId}
                    className="indy-rival-crest"
                    src={clubAsset(club, "logo")}
                    alt={club.name}
                    title={`${club.name} has made contact`}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                );
              })}
            </div>
          )}
          <button
            className="btn btn-primary btn-block"
            style={{ marginTop: 10 }}
            disabled={!canSendIntroduction(state, org.id)}
            title={introGateHint(gate)}
            onClick={() => dispatch({ type: "SEND_INTRODUCTION", orgId: org.id })}
          >
            Send Introduction ({INTRO_COST_FUNDS} Fund)
          </button>
        </div>
      </div>
    </div>
  );
}

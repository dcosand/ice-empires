import { useState } from "react";
import type { Dispatch } from "react";
import type { GameAction, GameState, WorldHockeyOrg } from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { hockeyOrgDisplayName } from "../engine/world";
import { turnDateLabel } from "../engine/calendar";
import { indieAsset } from "../data/independents";
import {
  ARCHETYPE_BLURBS,
  ARCHETYPE_LABELS,
  canSendIntroduction,
  INFLUENCE_THRESHOLDS,
  INTRO_COST_FUNDS,
  introGate,
  introGateHint,
  leadingSuitor,
  tierName,
} from "../engine/independentsSystem";

// The Independents ledger — list view (one row per org, built to scale to a
// dozen-plus contacts) with a detail view per independent holding the prospect
// pipeline, rival contacts, and relationship actions.
export function IndependentsScreen({
  state,
  dispatch,
  initialOrgId = null,
}: {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  initialOrgId?: string | null;
}) {
  const orgs = state.world?.hockeyOrgs ?? [];
  const contacted = orgs.filter((o) => o.playerContacted);
  const known = orgs.filter((o) => o.discovered && !o.playerContacted);
  const hiddenCount = orgs.length - contacted.length - known.length;

  const [openOrgId, setOpenOrgId] = useState<string | null>(initialOrgId);
  const openOrg = contacted.find((o) => o.id === openOrgId) ?? null;

  if (openOrg) {
    return (
      <IndependentDetail
        state={state}
        org={openOrg}
        dispatch={dispatch}
        onBack={() => setOpenOrgId(null)}
      />
    );
  }

  return (
    <div className="panel independents-panel">
      <div className="panel-sub indy-sub">
        Independents are neutral hockey ecosystems — nobody's farm team, yet.
        Grow influence to climb Contacted → Friendly → Partner → Affiliate.
        Click one for its prospect pipeline and relationship details.
        {hiddenCount > 0 && <> Somewhere out there: {hiddenCount} more, undiscovered.</>}
      </div>

      {contacted.length === 0 && (
        <div className="faint indy-empty">
          You haven't met any independents yet. Move a unit next to one of the
          neutral hockey settlements on the map to make first contact.
        </div>
      )}

      <div className="indy-rowlist">
        {contacted.map((org) => (
          <IndependentRow
            key={org.id}
            org={org}
            onOpen={() => setOpenOrgId(org.id)}
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

// ---- List row --------------------------------------------------------------

function influenceFraction(points: number): number {
  const max = INFLUENCE_THRESHOLDS[INFLUENCE_THRESHOLDS.length - 1] * 1.1;
  return Math.min(1, points / max);
}

function IndependentRow({
  org,
  onOpen,
}: {
  org: WorldHockeyOrg;
  onOpen: () => void;
}) {
  const rivalCount = org.contactedByClubIds.length;
  return (
    <div
      className="indy-row"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <img
        className="indy-row-thumb"
        src={indieAsset(org, "card")}
        alt=""
        aria-hidden
        onError={(e) => {
          e.currentTarget.style.visibility = "hidden";
        }}
      />
      <div className="indy-row-main">
        <div className="indy-row-name">{hockeyOrgDisplayName(org)}</div>
        <div className="indy-row-meta">
          {ARCHETYPE_LABELS[org.archetype]} · {org.prospects.length} prospects in
          the pipeline
        </div>
      </div>

      <div className="indy-row-influence" title={`${org.influencePoints} influence`}>
        <span
          className="indy-row-influence-fill"
          style={{ width: `${influenceFraction(org.influencePoints) * 100}%` }}
        />
      </div>

      <span
        className={`indy-tier tier-${org.relationshipLevel}`}
        title="Your club's relationship standing with this independent"
      >
        {tierName(org.relationshipLevel)}
      </span>

      {/* Rival-contact infographic: stacked crests (details on the org page). */}
      <div
        className="indy-row-rivals"
        title={
          rivalCount === 0
            ? "No rival club has reached them yet"
            : `${rivalCount} rival club${rivalCount === 1 ? "" : "s"} in contact`
        }
      >
        {org.contactedByClubIds.slice(0, 3).map((clubId) => {
          const club = CLUBS[clubId];
          return club ? (
            <img
              key={clubId}
              className="indy-row-crest"
              src={clubAsset(club, "logo")}
              alt={club.name}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null;
        })}
        {rivalCount > 3 && <span className="indy-row-more">+{rivalCount - 3}</span>}
        {rivalCount === 0 && <span className="indy-row-none">—</span>}
      </div>

      <span className="indy-row-chevron" aria-hidden>
        ›
      </span>
    </div>
  );
}

// ---- Detail view -----------------------------------------------------------

function IndependentDetail({
  state,
  org,
  dispatch,
  onBack,
}: {
  state: GameState;
  org: WorldHockeyOrg;
  dispatch: Dispatch<GameAction>;
  onBack: () => void;
}) {
  const gate = introGate(state, org.id);
  const nextThreshold =
    INFLUENCE_THRESHOLDS.find((t) => org.influencePoints < t) ?? null;
  const maxThreshold = INFLUENCE_THRESHOLDS[INFLUENCE_THRESHOLDS.length - 1];
  const barMax = maxThreshold * 1.1;

  return (
    <div className="panel independents-panel indy-detail">
      {/* Blended full-screen backdrop — the org's own wide scene. */}
      <img
        className="indy-detail-bg"
        src={indieAsset(org, "background")}
        alt=""
        aria-hidden
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <button className="btn indy-back" onClick={onBack}>
        ← All Independents
      </button>

      <div className="indy-detail-body">
        {/* Card poster, upper-left. */}
        <img
          className="indy-detail-card"
          src={indieAsset(org, "card")}
          alt={hockeyOrgDisplayName(org)}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        <div className="indy-detail-main">
          <div className="indy-detail-head">
            <div>
              <h2 className="indy-detail-name">{hockeyOrgDisplayName(org)}</h2>
              <div className="indy-detail-meta">
                {ARCHETYPE_LABELS[org.archetype]} · first contact{" "}
                {turnDateLabel(org.contactMonth ?? 1)}
              </div>
            </div>
            <span
              className={`indy-tier indy-tier-big tier-${org.relationshipLevel}`}
              title="Your club's relationship standing with this independent"
            >
              <span className="indy-tier-note">your standing</span>
              {tierName(org.relationshipLevel)}
            </span>
          </div>

          <p className="indy-detail-blurb">{ARCHETYPE_BLURBS[org.archetype]}</p>

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
              {nextThreshold !== null && (
                <>
                  {" "}
                  · next tier ({tierName((org.relationshipLevel + 1) as 0 | 1 | 2 | 3)})
                  at {nextThreshold}
                </>
              )}
            </div>
          </div>

          <button
            className="btn btn-primary indy-intro-btn"
            disabled={!canSendIntroduction(state, org.id)}
            title={introGateHint(gate)}
            onClick={() => dispatch({ type: "SEND_INTRODUCTION", orgId: org.id })}
          >
            Send Introduction ({INTRO_COST_FUNDS} Fund · +5 influence)
          </button>
          {gate !== "ok" && <div className="indy-gate-hint">{introGateHint(gate)}</div>}

          <div className="indy-col-title">Prospect pipeline</div>
          <div className="indy-prospect-scroll">
            <table className="indy-prospect-table">
              <thead>
                <tr>
                  <th className="pp-pos">Pos</th>
                  <th>Prospect</th>
                  <th>Word on them</th>
                </tr>
              </thead>
              <tbody>
                {org.prospects.map((p) => (
                  <tr key={p.id} className={p.revealed ? "" : "fogged"}>
                    <td className="pp-pos">
                      <span className={`pos-badge pos-${p.position}`}>
                        {p.position}
                      </span>
                    </td>
                    <td className="pp-name">{p.revealed ? p.id : "???"}</td>
                    <td className="pp-teaser">“{p.teaser}”</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="faint indy-foot-note">
            A scouting network (next era) reveals who they actually are.
          </div>

          <div className="indy-col-title">The race for their favor</div>
          {org.contactedByClubIds.length === 0 ? (
            <div className="faint indy-foot-note">
              No rival club has reached them. Yet.
            </div>
          ) : (
            <>
              <div className="indy-race-note">
                {(() => {
                  const lead = leadingSuitor(org);
                  if (lead.clubId === null) {
                    return "You lead their favor.";
                  }
                  const club = CLUBS[lead.clubId];
                  return `${club?.name ?? "A rival"} is courting them hardest — ${lead.influence} influence to your ${org.influencePoints}.`;
                })()}
              </div>
              <div className="indy-rivals">
                {org.contactedByClubIds.map((clubId) => {
                  const club = CLUBS[clubId];
                  if (!club) return null;
                  return (
                    <div key={clubId} className="indy-rival-line">
                      <img
                        className="indy-rival-crest"
                        src={clubAsset(club, "logo")}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <span>{club.name}</span>
                      <span className="indy-rival-pts">
                        {org.rivalInfluence[clubId] ?? 0} influence
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

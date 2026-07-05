import type { GameState, OrgProspect, Player, PlayerAttrs } from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";
import { formatEstimate } from "../engine/talentFog";

// The global scouting board: every player and prospect the club currently knows
// about, in one place. Signed players (roster) show true attributes; prospects
// obey the fog-of-talent rule — only the scout's ESTIMATE ranges, never truth.

// Compact attribute readout for a signed player (true values, 20-scale).
function playerAttrLine(position: Player["position"], a: PlayerAttrs): string {
  return position === "G"
    ? `Gt ${a.goaltending} · Sk ${a.skating} · Pa ${a.passing}`
    : `Sk ${a.skating} · Sh ${a.shooting} · Pa ${a.passing} · Ch ${a.checking}`;
}

// Scouted estimate readout for a revealed prospect (ranges, not truth).
function prospectAttrLine(p: OrgProspect): string {
  const e = p.attrEstimates;
  if (!e) return `“${p.teaser}”`;
  const f = formatEstimate;
  const parts =
    p.position === "G"
      ? [`Gt ${f(e.goaltending)}`, `Sk ${f(e.skating)}`, `Pa ${f(e.passing)}`]
      : [
          `Sk ${f(e.skating)}`,
          `Sh ${f(e.shooting)}`,
          `Pa ${f(e.passing)}`,
          `Ch ${f(e.checking)}`,
        ];
  if (p.potentialEstimate) parts.push(`Ceiling ${f(p.potentialEstimate)}`);
  return parts.join(" · ");
}

type ScoutedProspect = OrgProspect & { orgName: string };

export function ScoutingScreen({ state }: { state: GameState }) {
  const roster = state.roster;
  const prospects: ScoutedProspect[] = (state.world?.hockeyOrgs ?? [])
    .flatMap((org) =>
      org.prospects
        .filter((p) => p.revealed)
        .map((p) => ({ ...p, orgName: hockeyOrgDisplayName(org) })),
    )
    .sort((a, b) => a.orgName.localeCompare(b.orgName));

  return (
    <div className="panel scouting-panel">
      <div className="panel-sub">
        Everyone your club knows about — signed players on your roster, plus every
        prospect a scouting network has uncovered. Prospect numbers are your
        scout’s reads, not the truth: tighter ranges come from sharper eyes.
      </div>

      <div className="indy-col-title">
        Your roster
        <span className="scouting-count">{roster.length}</span>
      </div>
      {roster.length === 0 ? (
        <div className="faint">
          No signed players yet — hold tryouts at a club rink to fill your line.
        </div>
      ) : (
        <table className="indy-prospect-table scouting-table">
          <thead>
            <tr>
              <th className="pp-pos">Pos</th>
              <th>Player</th>
              <th>Ratings</th>
              <th>Origin</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((p) => (
              <tr key={p.id}>
                <td className="pp-pos">
                  <span className={`pos-badge pos-${p.position}`}>
                    {p.position}
                  </span>
                </td>
                <td className="pp-name">
                  {p.name}
                  <span className="pp-age"> · {p.age}</span>
                  {!p.hasEquipment && (
                    <span className="scouting-flag" title="No gear — not counted toward your line">
                      ungeared
                    </span>
                  )}
                </td>
                <td className="pp-teaser">{playerAttrLine(p.position, p.attrs)}</td>
                <td className="scouting-source">{p.origin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="indy-col-title">
        Scouted prospects
        <span className="scouting-count">{prospects.length}</span>
      </div>
      {prospects.length === 0 ? (
        <div className="faint">
          No prospects uncovered yet. Contact an independent, then send a Club
          Scout to them — the network opens the moment they arrive, revealing
          who their prospects actually are.
        </div>
      ) : (
        <table className="indy-prospect-table scouting-table">
          <thead>
            <tr>
              <th className="pp-pos">Pos</th>
              <th>Prospect</th>
              <th>Your scout’s read</th>
              <th>Independent</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => (
              <tr key={p.id}>
                <td className="pp-pos">
                  <span className={`pos-badge pos-${p.position}`}>
                    {p.position}
                  </span>
                </td>
                <td className="pp-name">
                  {p.name ?? "???"}
                  {p.age ? <span className="pp-age"> · {p.age}</span> : null}
                </td>
                <td className="pp-teaser">{prospectAttrLine(p)}</td>
                <td className="scouting-source">{p.orgName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

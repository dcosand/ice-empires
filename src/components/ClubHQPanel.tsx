import type { CSSProperties } from "react";
import type { GameState, ResourceKey } from "../types/game";
import { FACILITIES_BY_ID } from "../data/facilities";
import { UNITS_BY_ID } from "../data/units";
import { RESEARCH_BY_ID } from "../data/research";
import { ERAS } from "../data/eras";
import { clubAsset } from "../data/clubs";
import { RESOURCE_LABELS } from "../engine/resources";
import {
  getMonthlyIncome,
  getDiscoveredCount,
  getEraProgress,
  getActiveProductionProgress,
  getActiveResearchProgress,
} from "../engine/selectors";
import { productionItemName } from "../engine/productionSystem";
import { ItemArt } from "./ItemArt";

const RESOURCE_ORDER: ResourceKey[] = [
  "budget",
  "operations",
  "hockeyKnowledge",
  "reputation",
];

export function ClubHQPanel({ state }: { state: GameState }) {
  const club = state.club;
  const income = getMonthlyIncome(state);
  const era = ERAS[state.eraId];
  const eraProgress = getEraProgress(state);
  const discovered = getDiscoveredCount(state);

  const heroStyle = {
    "--club-accent": club?.accent ?? "#38bdf8",
  } as CSSProperties;

  return (
    <div className="hq-screen">
      <div className="hq-hero" style={heroStyle}>
        <div className="hq-hero-art" aria-hidden />
        {club && (
          <img
            className="hq-hero-photo"
            src={clubAsset(club, "background")}
            alt=""
            aria-hidden
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="hq-hero-scrim" aria-hidden />
        <div className="hq-hero-body">
          <div className="hq-eyebrow">
            {era?.name ?? "Club HQ"} · Month {state.month}
          </div>
          <h2 className="hq-club">{club?.name ?? "Club HQ"}</h2>
          {club?.leaderArchetype && (
            <div className="hq-leader">{club.leaderArchetype}</div>
          )}
          {club?.identityText && <p className="hq-identity">{club.identityText}</p>}
        </div>
      </div>

      <div className="hq-resource-row">
        {RESOURCE_ORDER.map((res) => (
          <div className="hq-res" key={res}>
            <span className="hq-res-label">{RESOURCE_LABELS[res]}</span>
            <span className="hq-res-value">{state.resources[res]}</span>
            <span className={`hq-res-income${income[res] > 0 ? " up" : ""}`}>
              {income[res] >= 0 ? "+" : ""}
              {income[res]}/mo
            </span>
          </div>
        ))}
      </div>

      <div className="hq-grid">
        <ProjectCard
          title="Production"
          name={
            state.activeProduction
              ? productionItemName(
                  state.activeProduction.kind,
                  state.activeProduction.itemId,
                )
              : null
          }
          fraction={getActiveProductionProgress(state)}
          idle="HQ production slot is open."
        />
        <ProjectCard
          title="Research"
          name={
            state.activeResearch
              ? RESEARCH_BY_ID[state.activeResearch.techId]?.name ?? null
              : null
          }
          fraction={getActiveResearchProgress(state)}
          idle="No active research."
        />
        <div className="hq-card hq-stat">
          <div className="hq-card-title">Hockey World</div>
          <div className="hq-stat-big">{discovered}</div>
          <div className="hq-stat-sub">regions discovered</div>
        </div>
        <div className="hq-card hq-era">
          <div className="hq-card-title">Era Progress</div>
          <ul className="hq-era-list">
            {eraProgress.map((req) => (
              <li key={req.id} className={req.met ? "met" : ""}>
                <span className="hq-era-mark">{req.met ? "✓" : "○"}</span>
                {req.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="hq-section">
        <div className="hq-section-head">Facilities</div>
        {state.facilities.length === 0 ? (
          <div className="faint">No facilities yet. The ice is bare.</div>
        ) : (
          <div className="hq-facilities">
            {state.facilities.map((id) => (
              <div className="hq-facility" key={id}>
                <ItemArt kind="facility" id={id} className="hq-facility-art" />
                <span className="hq-facility-name">
                  {FACILITIES_BY_ID[id]?.name ?? id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hq-section">
        <div className="hq-section-head">Organizational Units</div>
        {state.units.length === 0 ? (
          <div className="faint">
            No units yet. Produce a Pond Scout or Rink Evangelist at HQ to start
            building your front office.
          </div>
        ) : (
          <div className="hq-units">
            {state.units.map((unit) => {
              const def = UNITS_BY_ID[unit.unitDefId];
              return (
                <div className="hq-unit" key={unit.id}>
                  <ItemArt kind="unit" id={unit.unitDefId} className="hq-unit-art" />
                  <div className="hq-unit-body">
                    <div className="hq-unit-top">
                      <span className="hq-unit-name">{unit.name}</span>
                      <span className="hq-unit-cat">{def?.category ?? ""}</span>
                    </div>
                    <div className="hq-unit-ability">{def?.abilitySummary}</div>
                    <div className="hq-unit-foot">
                      <span className="hq-unit-status">{unit.status}</span>
                      <span className="faint">since mo {unit.createdMonth}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  title,
  name,
  fraction,
  idle,
}: {
  title: string;
  name: string | null;
  fraction: number;
  idle: string;
}) {
  return (
    <div className="hq-card">
      <div className="hq-card-title">{title}</div>
      {name ? (
        <>
          <div className="hq-card-name">{name}</div>
          <div className="hq-progress">
            <div
              className="hq-progress-fill"
              style={{ width: `${Math.round(Math.min(1, fraction) * 100)}%` }}
            />
          </div>
        </>
      ) : (
        <div className="faint hq-card-idle">{idle}</div>
      )}
    </div>
  );
}

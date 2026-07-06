import type { SyntheticEvent } from "react";
import type { MatchResult, MatchTeamLine } from "../types/game";
import { CLUBS, clubAsset } from "../data/clubs";
import { turnDateLabel } from "../engine/calendar";

// The exhibition box score (D51, docs/17 §4): final score with both crests,
// the period-by-period line, the goal reel, and the star of the game. Renders
// inside the standard TaskOverlay chrome from Dashboard; dismissal dispatches
// ACKNOWLEDGE_MATCH_RESULT there. The Inbox letter keeps the score after this
// closes.
export function MatchResultScreen({ result }: { result: MatchResult }) {
  const { home, away } = result;
  const verdict =
    home.score > away.score
      ? "A win to hang in the shed."
      : home.score < away.score
        ? "A loss with lessons in it."
        : "A tie — settled nothing, promised a rematch.";

  return (
    <div className="match-result">
      <div className="match-eyebrow">
        Exhibition · {turnDateLabel(result.month)} · Final
      </div>
      <div className="match-scoreline">
        <TeamBadge line={home} />
        <div className="match-score">
          <span>{home.score}</span>
          <span className="match-score-dash">–</span>
          <span>{away.score}</span>
        </div>
        <TeamBadge line={away} />
      </div>
      <div className="match-verdict">{verdict}</div>

      <table className="match-periods">
        <thead>
          <tr>
            <th />
            {home.periodGoals.map((_, i) => (
              <th key={i}>{i + 1}</th>
            ))}
            <th>T</th>
            <th>Shots</th>
          </tr>
        </thead>
        <tbody>
          {[home, away].map((line) => (
            <tr key={line.clubId}>
              <td className="match-periods-team">{line.name}</td>
              {line.periodGoals.map((g, i) => (
                <td key={i}>{g}</td>
              ))}
              <td className="match-periods-total">{line.score}</td>
              <td>{line.shots}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {result.goals.length > 0 && (
        <div className="match-goals">
          <div className="match-section-title">Scoring</div>
          {result.goals.map((g, i) => (
            <div key={i} className="match-goal-row">
              <span className="match-goal-time">
                P{g.period} {String(g.minute).padStart(2, "0")}′
              </span>
              <span className="match-goal-team" style={{ color: CLUBS[g.clubId]?.accent }}>
                {CLUBS[g.clubId]?.name ?? g.clubId}
              </span>
              <span className="match-goal-scorer">
                {g.scorer}
                {g.assist && <span className="match-goal-assist"> ({g.assist})</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {result.star && (
        <div className="match-star">
          <span className="match-star-label">Star of the game</span>
          <strong>{result.star.name}</strong>
          <span className="match-star-line">
            {result.star.line} · {CLUBS[result.star.clubId]?.name ?? ""}
          </span>
        </div>
      )}
    </div>
  );
}

function TeamBadge({ line }: { line: MatchTeamLine }) {
  const club = CLUBS[line.clubId];
  return (
    <div className="match-team">
      {club && (
        <img
          className="match-team-crest"
          src={clubAsset(club, "logo")}
          alt=""
          aria-hidden
          onError={hideOnError}
        />
      )}
      <span className="match-team-name">{line.name}</span>
    </div>
  );
}

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

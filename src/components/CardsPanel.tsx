import type { GameState } from "../types/game";

export function CardsPanel({ state }: { state: GameState }) {
  return (
    <div className="panel">
      <h3>People & Prospects</h3>
      <div className="panel-sub">
        Staff, prospects, and players your club has attracted.
      </div>

      {state.cards.length === 0 ? (
        <div className="faint">
          No one yet. Build, research, and scout to draw people to the club.
        </div>
      ) : (
        <div className="card-grid">
          {state.cards.map((c) => (
            <div className={`gcard ${c.type}`} key={c.id}>
              <div className="tag">{c.type}</div>
              <div className="gcard-name">{c.name}</div>
              <div className="gcard-flavor">{c.flavor}</div>
              <div className="gcard-meta">
                {c.role && <span>{c.role}</span>}
                {c.position && <span>Pos {c.position}</span>}
                {c.potential && <span> · {c.potential} upside</span>}
                {c.risk && <span> · {c.risk} risk</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

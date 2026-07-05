import type { CardDef, GameState } from "../types/game";

export function CardsPanel({ state }: { state: GameState }) {
  const people = state.cards;
  return (
    <div className="panel">
      <h3>People & Prospects</h3>
      <div className="panel-sub">
        Staff, coaches, instructors, prospects, and players your club has attracted.
      </div>

      {people.length === 0 ? (
        <div className="faint">
          No one yet. Build, research, and scout to draw people to the club.
        </div>
      ) : (
        <div className="card-grid">
          {people.map((c) => (
            <PeopleCard key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleCard({ card }: { card: CardDef }) {
  const art = personArt(card);
  return (
    <div className={`gcard ${card.type}`}>
      <div className="gcard-art-wrap">
        {art ? (
          <img
            className="gcard-art"
            src={art}
            alt=""
            aria-hidden
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <span className="gcard-art-fallback">{card.type.slice(0, 1).toUpperCase()}</span>
        )}
      </div>
      <div className="tag">{cardLabel(card)}</div>
      <div className="gcard-name">{card.name}</div>
      <div className="gcard-flavor">{card.flavor}</div>
      <div className="gcard-meta">
        {card.role && <span>{card.role}</span>}
        {card.position && <span>Pos {card.position}</span>}
        {card.potential && <span> · {card.potential} upside</span>}
        {card.risk && <span> · {card.risk} risk</span>}
      </div>
    </div>
  );
}

function cardLabel(card: CardDef): string {
  if (card.type === "staff") return card.role ?? "Staff";
  if (card.type === "prospect") return "Prospect";
  return card.type;
}

function personArt(card: CardDef): string | null {
  if (card.type !== "staff") return null;
  const role = `${card.role ?? ""} ${card.name}`.toLowerCase();
  const folder = /\b(coach|trainer|instructor|development)\b/.test(role)
    ? "coach"
    : "exec";
  const n = (stableHash(card.id) % 10) + 1;
  return `/assets/people/${folder}-${String(n).padStart(2, "0")}.png`;
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

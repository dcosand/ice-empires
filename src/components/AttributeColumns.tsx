import { ATTR_LABELS, GOALIE_COLUMNS, SKATER_COLUMNS } from "../data/attributes";
import type { AttrKey } from "../types/game";

// EHM-style attribute readout (owner direction 2026-07-07): the full attribute
// list as NUMBER values (not bars) laid out in three columns — Technical /
// Mental / Physical — with each value in a color-coded cell. Shared by the
// player-detail screen and the hockey card. Fog rules are the caller's job:
// pass true values for your own roster, scout-read midpoints for prospects
// (with `scouted` for the gold treatment).
export function AttributeColumns({
  kind,
  values,
  scouted = false,
}: {
  kind: "skater" | "goalie";
  values: Partial<Record<string, number>>;
  scouted?: boolean;
}) {
  const columns = kind === "goalie" ? GOALIE_COLUMNS : SKATER_COLUMNS;
  return (
    <div className={`attr-columns${scouted ? " scouted" : ""}`}>
      {columns.map((col) => (
        <div className="attr-column" key={col.group}>
          <div className="attr-column-head">{col.group}</div>
          {col.keys.map((key) => {
            const raw = values[key];
            const value = raw == null ? null : Math.round(raw);
            return (
              <div className="attr-num-row" key={key}>
                <span className="attr-num-label">
                  {ATTR_LABELS[key as AttrKey]}
                </span>
                <span className={`attr-num-cell ${attrTierClass(value)}`}>
                  {value == null ? "–" : value}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Value → color band. Thresholds (not a gradient) so the tiers stay legible and
// tunable, matching the 1–100 scale doctrine (elite ≈ 90+, average ≈ 75).
export function attrTierClass(value: number | null): string {
  if (value == null) return "attr-t-none";
  if (value >= 85) return "attr-t-elite";
  if (value >= 72) return "attr-t-good";
  if (value >= 58) return "attr-t-fair";
  if (value >= 42) return "attr-t-mid";
  if (value >= 28) return "attr-t-low";
  return "attr-t-poor";
}

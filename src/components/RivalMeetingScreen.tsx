import type { SyntheticEvent } from "react";
import { CLUBS, clubAsset } from "../data/clubs";

// The first-contact "leader scene". Shown full-screen over the map the first time
// the player's scout bumps into a rival club. For now it's a meeting beat — the
// rival's leader, club identity, and a line of flavor — but it's deliberately
// built as a standalone screen so it can grow into the diplomacy / negotiation
// surface (offers, demands, alliances) in later eras.
export function RivalMeetingScreen({
  clubId,
  month,
  onClose,
}: {
  clubId: string;
  month: number;
  onClose: () => void;
}) {
  const club = CLUBS[clubId];
  if (!club) return null;

  return (
    <div
      className="founding-moment"
      role="dialog"
      aria-modal="true"
      aria-label={`First contact with ${club.name}`}
    >
      <div className="founding-moment-scrim" />
      <div
        className="founding-moment-card"
        style={{
          maxWidth: 760,
          display: "grid",
          gridTemplateColumns: "minmax(220px, 40%) 1fr",
          overflow: "hidden",
          borderTop: `3px solid ${club.accent}`,
        }}
      >
        {/* Leader portrait — the face of the rival club. */}
        <div
          style={{
            position: "relative",
            background: `linear-gradient(160deg, ${club.palette.primary}, #05121c)`,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            minHeight: 320,
          }}
        >
          <img
            src={clubAsset(club, "leader")}
            alt={`${club.leaderArchetype} of ${club.name}`}
            onError={hideOnError}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top center",
              position: "absolute",
              inset: 0,
            }}
          />
          <img
            src={clubAsset(club, "logo")}
            alt={`${club.name} crest`}
            onError={hideOnError}
            style={{
              position: "relative",
              width: 64,
              height: 64,
              margin: 14,
              objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.6))",
            }}
          />
        </div>

        {/* Meeting copy. */}
        <div className="fmoment-body" style={{ padding: 28 }}>
          <div className="eyebrow">First Contact · Month {month}</div>
          <h2 style={{ marginBottom: 2 }}>{club.name}</h2>
          <div
            style={{
              color: club.accent,
              fontWeight: 700,
              fontSize: 13,
              marginBottom: 12,
            }}
          >
            {club.leaderArchetype}
          </div>
          <p style={{ marginTop: 0 }}>
            Out on the open ice, your scout meets a party flying the colors of{" "}
            {club.name}. {club.identityText}
          </p>
          <p style={{ opacity: 0.7, fontSize: 13 }}>
            For now the two clubs simply take each other's measure. Talks — trades,
            demands, and alliances — will open in a later era.
          </p>
          <div className="fmoment-actions" style={{ marginTop: 18 }}>
            <button className="btn btn-primary" onClick={onClose}>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

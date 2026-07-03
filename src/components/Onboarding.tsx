import { useEffect, useState } from "react";
import type { ReactNode, SyntheticEvent } from "react";
import type { GameState } from "../types/game";
import { CLUB_LIST, clubAsset } from "../data/clubs";
import { turnDateLong } from "../engine/calendar";

function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = "none";
}

type Slide = {
  icon: string;
  title: string;
  tagline: string;
  lines: string[];
  hero: ReactNode;
};

// The onboarding carousel shown once, right after the club is founded. It sets
// up the fantasy (pond-ice-to-dynasty), then teaches the core loop: discover
// hockey, scout the world, meet clubs, build, develop talent, compete, and lead
// your club to glory. Imagery is placeholder — club art plus a few composed
// panels — until bespoke onboarding art exists.
function buildSlides(state: GameState): Slide[] {
  const club = state.club!;
  // Bespoke onboarding art (cinematic backgrounds, club-agnostic).
  const art = (name: string, alt: string) => (
    <img
      className="onb-hero-img"
      src={`/assets/onboarding/${name}.jpg`}
      alt={alt}
      onError={hideOnError}
    />
  );

  const desertClub = club.cityRegion.toLowerCase().includes("desert");

  return [
    {
      icon: "✦",
      title: `${club.name} Founded`,
      tagline: "Your dynasty begins now.",
      lines: [
        `${turnDateLong(state.month)}. The first home ice is claimed and the ${club.name} take shape.`,
        desertClub
          ? "From a rare sheet of desert ice, you will build a hockey civilization no one saw coming."
          : "From this shed on the pond, you will build a hockey civilization that lasts.",
      ],
      hero: (
        <>
          {/* Prefer the club's own backdrop (right vibe per market); fall back
              to the shared sunrise pond if the club has no background art. */}
          <img
            className="onb-hero-img"
            src={clubAsset(club, "background")}
            alt={`${club.name} home`}
            onError={(e) => {
              e.currentTarget.src = "/assets/onboarding/founded.jpg";
              e.currentTarget.onerror = null;
            }}
          />
          <img
            className="onb-hero-logo"
            src={clubAsset(club, "logo")}
            alt={`${club.name} crest`}
            onError={hideOnError}
          />
        </>
      ),
    },
    {
      icon: "⛸",
      title: "The Pond Hockey Era",
      tagline: "Can we make hockey exist?",
      lines: [
        `Nobody here plays hockey — not yet. Standing on winter ice, your founder saw the whole game in a single vision: skaters, sticks, a frozen pond with a name. ${club.leaderArchetype} has been trying to explain it ever since.`,
        "Making the vision real is the opening quest: shovel a pond into a rink, cut branches into sticks, and hold tryouts for whoever's curious enough to show up.",
      ],
      hero: art("pond-hockey-era", "Pond hockey under the lights"),
    },
    {
      icon: "🔭",
      title: "Discover the World",
      tagline: "Beyond your town lies a hockey world.",
      lines: [
        "Send Scouts across the map to uncover major clubs, independent hockey regions, talent hotbeds, and hidden opportunities.",
        "Select your Scout and click a tile to send it exploring the ice.",
      ],
      hero: art("discover-world", "The hockey world from above"),
    },
    {
      icon: "🛡",
      title: "Major Clubs",
      tagline: "Not everyone will welcome you.",
      lines: [
        "Major clubs are powerful organizations with deep history, resources, and influence.",
        "Build your reputation and earn their respect — or become their greatest rival.",
      ],
      hero: (
        <>
          {art("major-clubs", "Grand club halls")}
          <div className="onb-logo-row">
            {CLUB_LIST.map((c) => (
              <img
                key={c.id}
                src={clubAsset(c, "logo")}
                alt={`${c.name} crest`}
                onError={hideOnError}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      icon: "🌲",
      title: "Independent Regions",
      tagline: "Talent grows everywhere.",
      lines: [
        "Independent regions are neutral hockey ecosystems that produce players, staff, and opportunities.",
        "Scout them. Influence them. Earn their trust and turn them into pipelines that feed your club.",
      ],
      hero: (
        <>
          {art("independent-regions", "An independent hockey town")}
          <div className="onb-panel onb-panel-float">
            <div className="onb-panel-title">Prairie Rink Belt</div>
            <div className="onb-panel-sub">Independent Region</div>
            <OnbBar label="Player Output" value="High" pct={82} />
            <OnbBar label="Staff Opportunities" value="Medium" pct={54} />
            <OnbBar label="Scouting Coverage" value="25%" pct={25} />
            <OnbBar label="Recruitment Influence" value="10%" pct={10} />
          </div>
        </>
      ),
    },
    {
      icon: "🏛",
      title: "Build Your Club",
      tagline: "From a shed to a legacy.",
      lines: [
        "Construct facilities, research hockey knowledge, recruit staff, and shape your identity.",
        "Every decision builds the foundation of your future. Production opens the moment you found — start your first build.",
      ],
      hero: (
        <>
          {art("build-club", "A club rising from the ice")}
          <div className="onb-panel onb-panel-float">
            <div className="onb-panel-title">Club HQ</div>
            <div className="onb-panel-sub">{club.name}</div>
            <OnbBar label="Active Build" value="Outdoor Rink" pct={40} />
            <OnbBar label="Active Research" value="Scouting Reports" pct={70} />
          </div>
        </>
      ),
    },
    {
      icon: "👤",
      title: "Find and Develop Talent",
      tagline: "Great players aren't born in spreadsheets.",
      lines: [
        "Discover prospects. Scour reports. Take risks. Develop skills and build character.",
        "Turn raw potential into stars who carry your club for a generation.",
      ],
      hero: (
        <>
          {art("develop-talent", "A scout evaluating prospects")}
          <div className="onb-panel onb-panel-float">
            <div className="onb-panel-title">Prospect</div>
            <div className="onb-panel-sub">Two-Way Forward · Age 17</div>
            <OnbBar label="Scout Confidence" value="72%" pct={72} />
          </div>
        </>
      ),
    },
    {
      icon: "🏒",
      title: "Compete. Win. Grow.",
      tagline: "Prove yourself on the ice.",
      lines: [
        "Enter tournaments. Test your team. Earn reputation and build rivalries.",
        "Victory opens doors. Dynasties leave legacies.",
      ],
      hero: art("compete", "Championship trophy on arena ice"),
    },
    {
      icon: "👑",
      title: "Lead Your Club to Glory",
      tagline: "This is your legacy.",
      lines: [
        "Progress through the Eras. Unlock new systems. Build a dynasty that stands the test of time.",
        "The ice is yours. The future is unwritten.",
      ],
      hero: (
        <div className="onb-hero-glow">
          <img
            className="onb-hero-crest"
            src={clubAsset(club, "logo")}
            alt={`${club.name} crest`}
            onError={hideOnError}
          />
        </div>
      ),
    },
  ];
}

function OnbBar({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="onb-bar-row">
      <span className="onb-bar-label">{label}</span>
      <span className="onb-bar-track">
        <span className="onb-bar-fill" style={{ width: `${pct}%` }} />
      </span>
      <span className="onb-bar-value">{value}</span>
    </div>
  );
}

export function Onboarding({
  state,
  onClose,
}: {
  state: GameState;
  onClose: () => void;
}) {
  const slides = buildSlides(state);
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const isLast = index === slides.length - 1;
  const next = () => (isLast ? onClose() : setIndex((i) => i + 1));
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Arrow keys tab through the slides; Escape skips the whole intro.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onClose]);

  return (
    <div
      className="onboarding"
      role="dialog"
      aria-modal="true"
      aria-label={`${state.club?.name} onboarding`}
    >
      <div className="onboarding-scrim" onClick={onClose} />
      <div className="onboarding-card">
        <button className="onb-skip" onClick={onClose} aria-label="Skip intro">
          Skip
        </button>
        <div className="onb-hero" key={index}>
          {slide.hero}
          <div className="onb-hero-fade" />
        </div>
        <div className="onb-body">
          <div className="onb-head">
            <span className="onb-icon">{slide.icon}</span>
            <div>
              <h2 className="onb-title">{slide.title}</h2>
              <div className="onb-tagline">{slide.tagline}</div>
            </div>
          </div>
          <div className="onb-lines">
            {slide.lines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          <div className="onb-footer">
            <span className="onb-count">
              {index + 1} / {slides.length}
            </span>
            <div className="onb-dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  className={`onb-dot${i === index ? " is-active" : ""}`}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <div className="onb-nav">
              {index > 0 && (
                <button className="btn" onClick={back}>
                  Back
                </button>
              )}
              {isLast ? (
                <button className="btn btn-gold" onClick={onClose}>
                  Let's Begin
                </button>
              ) : (
                <button className="btn btn-primary" onClick={next}>
                  Next ›
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

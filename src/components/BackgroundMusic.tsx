import { useEffect, useRef, useState } from "react";

// Tracks live in /public/assets/audio (served as static files; spaces encoded).
const TRACKS = [
  { name: "Forge of Empires", url: "/assets/audio/Forge%20of%20Empires.mp3" },
  { name: "Ice Empires", url: "/assets/audio/Ice%20Empires.mp3" },
  { name: "Siren Ridge", url: "/assets/audio/Siren%20Ridge.mp3" },
];

// Single looping playlist, mounted once at the app root so music persists across
// every screen. Browsers block autoplay-with-sound until the user interacts, so
// we attempt to play immediately and also retry on the first interaction. A mini
// player lets the player skip, pause, and cycle tracks.
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const mounted = useRef(false);

  // Initial autoplay attempt + first-interaction fallback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;

    const tryPlay = () => audio.play().catch(() => {});
    tryPlay();

    const onInteract = () => {
      if (audio.paused) tryPlay();
    };
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  // When the track changes (skip/auto-advance), load and play the new one.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // initial track is handled by the autoplay effect
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    audio.play().catch(() => {});
  }, [index]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const go = (delta: number) =>
    setIndex((i) => (i + delta + TRACKS.length) % TRACKS.length);

  const track = TRACKS[index];

  return (
    <div className="miniplayer">
      <audio
        ref={audioRef}
        src={track.url}
        preload="auto"
        onEnded={() => go(1)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        className="mp-btn"
        onClick={() => go(-1)}
        title="Previous track"
        aria-label="Previous track"
      >
        ⏮
      </button>
      <button
        className="mp-btn play"
        onClick={togglePlay}
        title={playing ? "Pause" : "Play"}
        aria-label={playing ? "Pause music" : "Play music"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <button
        className="mp-btn"
        onClick={() => go(1)}
        title="Next track"
        aria-label="Next track"
      >
        ⏭
      </button>
      <span className="mp-track" title={track.name}>
        ♪ {track.name}
      </span>
    </div>
  );
}

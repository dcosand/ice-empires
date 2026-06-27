import { useEffect, useRef, useState } from "react";

// Tracks live in /public/assets/audio (served as static files; spaces encoded).
const TRACKS = [
  { name: "Forge of Empires", url: "/assets/audio/Forge%20of%20Empires.mp3" },
  { name: "Ice Empires", url: "/assets/audio/Ice%20Empires.mp3" },
  { name: "Siren Ridge", url: "/assets/audio/Siren%20Ridge.mp3" },
];

// Single looping playlist, mounted once at the app root so music persists across
// every screen. Browsers block autoplay-with-sound until the user interacts, so
// we attempt to play immediately and retry once on the first interaction. After
// playback has begun (or the player takes control), that fallback is disabled so
// Pause stays paused. A mini player lets the player skip, pause, and cycle tracks.
export function BackgroundMusic() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false); // are we meant to be playing?
  const startedRef = useRef(false); // has playback ever begun / user taken over?
  const mounted = useRef(false);

  // Initial autoplay attempt + a one-shot first-interaction fallback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.35;

    audio.play().catch(() => {});

    const onInteract = (e: Event) => {
      if (startedRef.current) return; // already playing / under user control
      // Ignore clicks on the mini player itself (its buttons handle playback).
      const t = e.target;
      if (t instanceof Element && t.closest(".miniplayer")) return;
      if (audio.paused) audio.play().catch(() => {});
    };
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  // Track change: load the new source; resume only if we were already playing.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // initial track handled by the autoplay effect
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (playingRef.current) audio.play().catch(() => {});
  }, [index]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    startedRef.current = true; // user is in control from here on
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
        onPlay={() => {
          setPlaying(true);
          playingRef.current = true;
          startedRef.current = true;
        }}
        onPause={() => {
          setPlaying(false);
          playingRef.current = false;
        }}
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

import { useEffect, useRef, useState } from "react";

// Tracks live in /public/assets/audio (served as static files; spaces encoded).
const TRACKS = [
  { name: "Forge of Empires", url: "/assets/audio/Forge%20of%20Empires.mp3" },
  { name: "Frozen Apex", url: "/assets/audio/Frozen%20Apex.mp3" },
  { name: "Ice Empires", url: "/assets/audio/Ice%20Empires.mp3" },
  { name: "Siren Ridge", url: "/assets/audio/Siren%20Ridge.mp3" },
  { name: "Stonebound Horizon", url: "/assets/audio/Stonebound%20Horizon.mp3" },
];

const GAME_VOLUME = 0.35;
const TRYOUT_VOLUME = 0.42;
const TRYOUT_START_VOLUME = 0.12;
const FADE_MS = 950;
const RETURN_FADE_MS = 1800;
const TRYOUT_TRACK = {
  name: "Tryouts",
  url: "/assets/audio/tryouts%20or%20new%20signing.m4a",
};
const TRYOUT_AUDIO_PRIME_EVENT = "ice-empires:prime-tryout-audio";

export function primeTryoutMusic() {
  window.dispatchEvent(new Event(TRYOUT_AUDIO_PRIME_EVENT));
}

function fadeAudio(
  audio: HTMLAudioElement,
  to: number,
  ms = FADE_MS,
  onDone?: () => void,
) {
  const from = audio.volume;
  const started = performance.now();
  let frame = 0;

  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / ms);
    audio.volume = from + (to - from) * t;
    if (t < 1) {
      frame = requestAnimationFrame(tick);
    } else {
      onDone?.();
    }
  };

  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

// Single looping playlist, mounted once at the app root so music persists across
// every screen. Browsers block autoplay-with-sound until the user interacts, so
// we attempt to play immediately and retry once on the first interaction. After
// playback has begun (or the player takes control), that fallback is disabled so
// Pause stays paused. A mini player lets the player skip, pause, and cycle tracks.
export function BackgroundMusic({ tryoutActive }: { tryoutActive: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const tryoutRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const musicIntentRef = useRef(false); // does the player want continuous music?
  const startedRef = useRef(false); // has playback ever begun / user taken over?
  const mounted = useRef(false);
  const suppressGamePauseRef = useRef(false);
  const suppressTryoutPauseRef = useRef(false);
  const tryoutWasActiveRef = useRef(false);
  const fadeCleanupsRef = useRef<Array<() => void>>([]);

  const cancelFades = () => {
    fadeCleanupsRef.current.forEach((cleanup) => cleanup());
    fadeCleanupsRef.current = [];
  };

  const fadeOutGame = () => {
    const game = audioRef.current;
    if (!game || game.paused) return;
    fadeCleanupsRef.current.push(
      fadeAudio(game, 0, FADE_MS, () => {
        suppressGamePauseRef.current = true;
        game.pause();
        window.setTimeout(() => {
          suppressGamePauseRef.current = false;
        }, 0);
      }),
    );
  };

  const fadeOutTryout = (ms = FADE_MS) => {
    const tryout = tryoutRef.current;
    if (!tryout || tryout.paused) return;
    fadeCleanupsRef.current.push(
      fadeAudio(tryout, 0, ms, () => {
        suppressTryoutPauseRef.current = true;
        tryout.pause();
        tryout.currentTime = 0;
        window.setTimeout(() => {
          suppressTryoutPauseRef.current = false;
        }, 0);
      }),
    );
  };

  const returnToGameMusic = () => {
    const game = audioRef.current;
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    cancelFades();

    if (!musicIntentRef.current) {
      fadeOutTryout(RETURN_FADE_MS * 0.75);
      return;
    }

    game.volume = Math.max(game.volume, 0.04);
    const start = game.paused ? game.play() : Promise.resolve();

    start
      .then(() => {
        fadeCleanupsRef.current.push(fadeAudio(game, GAME_VOLUME, RETURN_FADE_MS));
        fadeOutTryout(RETURN_FADE_MS * 0.85);
      })
      .catch(() => {
        // If the game track cannot resume immediately, keep the tryout bed up
        // so closing tryouts never drops the player into silence.
        if (!tryout.paused) tryout.volume = TRYOUT_VOLUME;
      });
  };

  const primeTryoutAudioElement = () => {
    const tryout = tryoutRef.current;
    if (!tryout || !tryout.paused) return;
    tryout.currentTime = 0;
    tryout.volume = TRYOUT_START_VOLUME;
    tryout.load();
    tryout.play().catch(() => {});
  };

  const startTryoutMusic = () => {
    const game = audioRef.current;
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    cancelFades();
    tryout.volume = Math.max(tryout.volume, TRYOUT_START_VOLUME);

    const start = tryout.paused ? tryout.play() : Promise.resolve();
    start
      .then(() => {
        fadeCleanupsRef.current.push(fadeAudio(tryout, TRYOUT_VOLUME));
        fadeOutGame();
      })
      .catch(() => {
        // If browser policy blocks the event track, keep the normal track
        // audible instead of fading into silence. The next click retries.
        if (musicIntentRef.current && game.paused) {
          game.volume = GAME_VOLUME;
          game.play().catch(() => {});
        } else if (!game.paused) {
          game.volume = GAME_VOLUME;
        }
      });
  };

  // Initial autoplay attempt + a one-shot first-interaction fallback.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = GAME_VOLUME;

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

  useEffect(() => {
    window.addEventListener(TRYOUT_AUDIO_PRIME_EVENT, primeTryoutAudioElement);
    return () => {
      window.removeEventListener(TRYOUT_AUDIO_PRIME_EVENT, primeTryoutAudioElement);
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
    audio.volume = GAME_VOLUME;
    if (musicIntentRef.current && !tryoutActive) audio.play().catch(() => {});
  }, [index]);

  useEffect(() => {
    const game = audioRef.current;
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    if (tryoutActive) {
      tryoutWasActiveRef.current = true;
      startTryoutMusic();
      return cancelFades;
    }

    if (!tryoutWasActiveRef.current) return undefined;
    tryoutWasActiveRef.current = false;
    returnToGameMusic();

    return cancelFades;
  }, [tryoutActive]);

  useEffect(() => {
    if (!tryoutActive) return undefined;
    const retry = () => {
      const tryout = tryoutRef.current;
      if (tryout?.paused) startTryoutMusic();
    };
    window.addEventListener("pointerdown", retry);
    window.addEventListener("keydown", retry);
    return () => {
      window.removeEventListener("pointerdown", retry);
      window.removeEventListener("keydown", retry);
    };
  }, [tryoutActive]);

  const togglePlay = () => {
    const audio = tryoutActive ? tryoutRef.current : audioRef.current;
    if (!audio) return;
    startedRef.current = true; // user is in control from here on
    if (audio.paused) {
      musicIntentRef.current = true;
      audio.play().catch(() => {});
      if (tryoutActive) fadeAudio(audio, TRYOUT_VOLUME, 180);
      else fadeAudio(audio, GAME_VOLUME, 180);
    } else {
      musicIntentRef.current = false;
      audio.pause();
    }
  };

  const go = (delta: number) =>
    setIndex((i) => (i + delta + TRACKS.length) % TRACKS.length);

  const track = tryoutActive ? TRYOUT_TRACK : TRACKS[index];

  return (
    <div className="miniplayer">
      <audio
        ref={audioRef}
        src={TRACKS[index].url}
        preload="auto"
        onEnded={() => go(1)}
        onPlay={() => {
          setPlaying(true);
          musicIntentRef.current = true;
          startedRef.current = true;
        }}
        onPause={() => {
          if (!suppressGamePauseRef.current && !tryoutActive) {
            setPlaying(false);
            musicIntentRef.current = false;
          }
        }}
      />
      <audio
        ref={tryoutRef}
        src={TRYOUT_TRACK.url}
        preload="auto"
        loop
        onPlay={() => {
          setPlaying(true);
          startedRef.current = true;
        }}
        onPause={() => {
          if (!suppressTryoutPauseRef.current && tryoutActive) {
            setPlaying(false);
            musicIntentRef.current = false;
          }
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

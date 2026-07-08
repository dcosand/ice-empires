import { useEffect, useRef, useState } from "react";
import { randomPracticeSceneTrack, TRYOUT_SCENE_TRACK } from "../data/sceneAudio";
import type { Phase } from "../types/game";

// Tracks live in /public/assets/audio (served as static files).
type MusicScene = "title" | "onboarding" | "gameplay";
type Track = { name: string; url: string };

// Title and club-select each get ONE fixed theme (strict: 01 = title screen,
// 02 = club selection) — single-track pools loop without ever cycling to the
// other theme. Only the gameplay era pools below shuffle.
const TITLE_TRACKS: Track[] = [
  { name: "Ice Empires Theme 01", url: "/assets/audio/music/ice-empires-theme-01.mp3" },
];
const ONBOARDING_TRACKS: Track[] = [
  { name: "Ice Empires Theme 02", url: "/assets/audio/music/ice-empires-theme-02.mp3" },
];
// Gameplay music is a per-era POOL played at RANDOM (Civ VI-style: new tracks
// come into rotation as you advance eras). To add/remove a track just edit the
// pool — filenames map to /public/assets/audio/music. Eras past era 03 reuse
// the era-03 pool until their own tracks land, so every era still has music
// (the fallback below also covers unknown ids).
const M = "/assets/audio/music";
const ERA01_POOL: Track[] = [
  { name: "Era 01 · I", url: `${M}/era01-music-01.mp3` },
  { name: "Era 01 · II", url: `${M}/era01-music-02.mp3` },
  { name: "Era 01 · III", url: `${M}/era01-music-03.mp3` },
  { name: "Era 01 · IV", url: `${M}/era01-music-04.mp3` },
];
const ERA02_POOL: Track[] = [
  { name: "Era 02 · I", url: `${M}/era02-music-01.mp3` },
  { name: "Era 02 · II", url: `${M}/era02-music-02.mp3` },
];
const ERA03_POOL: Track[] = [
  { name: "Era 03 · I", url: `${M}/era03-music-01.mp3` },
];
const ERA_TRACKS: Record<string, Track[]> = {
  "pond-hockey": ERA01_POOL,
  "club-formation": ERA02_POOL,
  "competitive-hockey": ERA03_POOL,
  "hockey-operations": ERA03_POOL,
  dynasty: ERA03_POOL,
};

const GAME_VOLUME = 0.35;
const CONTACT_GAME_VOLUME = 0.08;
const CONTACT_VOLUME = 0.46;
const TRYOUT_VOLUME = 0.42;
const TRYOUT_START_VOLUME = 0;
const FADE_MS = 950;
// One duration for every music<->music crossfade (era change, tryout in/out,
// contact in/out) so transitions feel consistent instead of each having its own
// timing.
const MUSIC_CROSSFADE_MS = 2000;
const TRYOUT_AUDIO_START_EVENT = "ice-empires:start-tryout-audio";
const MUSIC_SCENE_EVENT = "ice-empires:music-scene";
const CONTACT_AUDIO_EVENT = "ice-empires:contact-audio";

export function primeTryoutMusic() {
  window.dispatchEvent(new Event(TRYOUT_AUDIO_START_EVENT));
}

export function setBackgroundMusicScene(scene: MusicScene | null) {
  window.dispatchEvent(new CustomEvent(MUSIC_SCENE_EVENT, { detail: scene }));
}

export function setContactMusicActive(active: boolean) {
  window.dispatchEvent(new CustomEvent(CONTACT_AUDIO_EVENT, { detail: active }));
}

function baseMusicScene(phase: Phase): MusicScene {
  if (phase === "landing") return "title";
  if (phase === "playing" || phase === "complete") return "gameplay";
  return "onboarding";
}

function tracksFor(scene: MusicScene, eraId: string): Track[] {
  if (scene === "title") return TITLE_TRACKS;
  if (scene === "onboarding") return ONBOARDING_TRACKS;
  // Gameplay plays the CURRENT era's pool at random (see advanceTrack + the
  // random pick on era change). Changing era swaps the pool and crossfades to a
  // track from it; it never cycles through other eras' pools mid-play.
  return ERA_TRACKS[eraId] ?? ERA_TRACKS["pond-hockey"];
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

// Single music controller, mounted once at the app root so music persists across
// every screen. Browsers block autoplay-with-sound until the user interacts, so
// we attempt to play immediately and retry once on the first interaction. After
// playback has begun (or the player takes control), that fallback is disabled so
// Pause stays paused. A mini player lets the player skip, pause, and cycle tracks.
export function BackgroundMusic({
  tryoutActive,
  phase,
  eraId,
}: {
  tryoutActive: boolean;
  phase: Phase;
  eraId: string;
}) {
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const contactRef = useRef<HTMLAudioElement>(null);
  const tryoutRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sceneOverride, setSceneOverride] = useState<MusicScene | null>(null);
  const [contactActive, setContactActive] = useState(false);
  const tryoutTrack = TRYOUT_SCENE_TRACK;
  const musicIntentRef = useRef(false); // does the player want continuous music?
  const startedRef = useRef(false); // has playback ever begun / user taken over?
  const mounted = useRef(false);
  const suppressGamePauseRef = useRef(false);
  const suppressTryoutPauseRef = useRef(false);
  const tryoutWasActiveRef = useRef(false);
  const fadeCleanupsRef = useRef<Array<() => void>>([]);
  const contactFadeCleanupsRef = useRef<Array<() => void>>([]);
  const contactRunRef = useRef(0);
  const activeGameRef = useRef<"a" | "b">("a");
  const currentGameUrlRef = useRef("");

  const cancelFades = () => {
    fadeCleanupsRef.current.forEach((cleanup) => cleanup());
    fadeCleanupsRef.current = [];
  };
  const cancelContactFades = () => {
    contactFadeCleanupsRef.current.forEach((cleanup) => cleanup());
    contactFadeCleanupsRef.current = [];
  };
  const scene = sceneOverride ?? baseMusicScene(phase);
  const tracks = tracksFor(scene, eraId);
  const trackIndex = index % tracks.length;
  const gameTrack = tracks[trackIndex];

  const gameAudio = (slot = activeGameRef.current) =>
    slot === "a" ? audioARef.current : audioBRef.current;

  const inactiveGameSlot = () => (activeGameRef.current === "a" ? "b" : "a");

  const pauseInactiveGameAudio = () => {
    const inactive = gameAudio(inactiveGameSlot());
    if (!inactive || inactive.paused) return;
    suppressGamePauseRef.current = true;
    inactive.pause();
    inactive.currentTime = 0;
    window.setTimeout(() => {
      suppressGamePauseRef.current = false;
    }, 0);
  };

  const fadeOutGame = (ms = FADE_MS) => {
    const game = gameAudio();
    if (!game || game.paused) return;
    fadeCleanupsRef.current.push(
      fadeAudio(game, 0, ms, () => {
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

  const fadeGameTo = (volume: number, ms = FADE_MS) => {
    const game = gameAudio();
    if (!game || game.paused) return;
    fadeCleanupsRef.current.push(fadeAudio(game, volume, ms));
  };

  const returnToGameMusic = () => {
    const game = gameAudio();
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    cancelFades();

    if (!musicIntentRef.current) {
      fadeOutTryout(MUSIC_CROSSFADE_MS);
      return;
    }

    game.volume = Math.max(game.volume, 0.04);
    const start = game.paused ? game.play() : Promise.resolve();

    start
      .then(() => {
        fadeCleanupsRef.current.push(fadeAudio(game, GAME_VOLUME, MUSIC_CROSSFADE_MS));
        fadeOutTryout(MUSIC_CROSSFADE_MS);
      })
      .catch(() => {
        // If the game track cannot resume immediately, keep the tryout bed up
        // so closing tryouts never drops the player into silence.
        if (!tryout.paused) tryout.volume = TRYOUT_VOLUME;
      });
  };

  // Unlock the tryout bed WITHIN the user's click gesture (autoplay policy):
  // start it playing but silent. The actual crossfade is driven separately by
  // the tryoutActive effect (startTryoutMusic), so the fade isn't restarted by
  // a second trigger. Keeping prime and crossfade apart is what makes the
  // tryout transition cross-fade cleanly instead of popping.
  const primeTryoutAudioElement = () => {
    const tryout = tryoutRef.current;
    console.log("[tryout-audio] prime called", {
      hasEl: !!tryout,
      paused: tryout?.paused,
      src: tryout?.currentSrc,
      readyState: tryout?.readyState,
    });
    if (!tryout || !tryout.paused) return;
    tryout.currentTime = 0;
    tryout.volume = TRYOUT_START_VOLUME;
    // Just unlock playback within the gesture; the element already preloads
    // (preload="auto"). Do NOT call load() here — re-fetching stalls the very
    // first play(), which is what left tryouts opening in silence.
    tryout
      .play()
      .then(() => console.log("[tryout-audio] prime play() resolved"))
      .catch((e) => console.log("[tryout-audio] prime play() rejected:", e?.name, e?.message));
  };

  const startTryoutMusic = (restart = false) => {
    const game = gameAudio();
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    cancelFades();
    // Src is set declaratively on the <audio> (fixed tryout bed); just rewind.
    if (!tryout.src) tryout.src = tryoutTrack.url;
    if (restart) tryout.currentTime = 0;
    tryout.volume = TRYOUT_START_VOLUME;
    console.log("[tryout-audio] startTryoutMusic", {
      restart,
      paused: tryout.paused,
      readyState: tryout.readyState,
      currentSrc: tryout.currentSrc,
      volume: tryout.volume,
    });

    // Always drive the fade off a real play() resolution. The old code skipped
    // play() when the primed bed was merely "not paused" and attached the fade
    // to Promise.resolve() — but a primed play() that is still buffering (or
    // later rejects) leaves us ramping the volume of an element that never
    // actually started, so the tryout bed stayed silent. play() is a no-op when
    // already playing, and this guarantees the crossfade tracks audible sound.
    tryout
      .play()
      .then(() => {
        console.log("[tryout-audio] start play() resolved, fading in from", tryout.volume);
        fadeCleanupsRef.current.push(
          fadeAudio(tryout, TRYOUT_VOLUME, MUSIC_CROSSFADE_MS),
        );
        fadeOutGame(MUSIC_CROSSFADE_MS);
      })
      .catch((e) => {
        console.log("[tryout-audio] start play() REJECTED:", e?.name, e?.message);
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
    const audio = gameAudio("a");
    if (!audio) return;
    currentGameUrlRef.current = gameTrack.url;
    audio.src = gameTrack.url;
    audio.loop = tracks.length === 1;
    audio.volume = GAME_VOLUME;
    musicIntentRef.current = true;

    audio.play().catch(() => {});

    const onInteract = (e: Event) => {
      if (startedRef.current) return; // already playing / under user control
      // Ignore clicks on the mini player itself (its buttons handle playback).
      const t = e.target;
      if (t instanceof Element && t.closest(".miniplayer")) return;
      const active = gameAudio();
      if (active?.paused) active.play().catch(() => {});
    };
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  useEffect(() => {
    // The click that opens tryouts only PRIMES the bed (silent, gesture-scoped);
    // the tryoutActive effect owns the crossfade so it runs exactly once.
    const onTryoutAudioStart = () => primeTryoutAudioElement();
    const onScene = (event: Event) => {
      setSceneOverride((event as CustomEvent<MusicScene | null>).detail ?? null);
    };
    const onContact = (event: Event) => {
      setContactActive(!!(event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(TRYOUT_AUDIO_START_EVENT, onTryoutAudioStart);
    window.addEventListener(MUSIC_SCENE_EVENT, onScene);
    window.addEventListener(CONTACT_AUDIO_EVENT, onContact);
    return () => {
      window.removeEventListener(TRYOUT_AUDIO_START_EVENT, onTryoutAudioStart);
      window.removeEventListener(MUSIC_SCENE_EVENT, onScene);
      window.removeEventListener(CONTACT_AUDIO_EVENT, onContact);
    };
  }, []);

  // Each scene/era opens on track 0 — a single deterministic crossfade. (An
  // earlier version randomized the index here, but that re-rendered to a second
  // track mid-transition and fired TWO overlapping crossfades → garbled audio
  // that then stalled. Variety comes from advanceTrack picking a random next
  // track when the current one ENDS, which is one clean swap at a time.)
  useEffect(() => {
    setIndex(0);
  }, [scene, eraId]);

  // Track change: cross-fade instead of replacing the active element's src.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return; // initial track handled by the autoplay effect
    }
    if (currentGameUrlRef.current === gameTrack.url) return;

    const from = gameAudio();
    const nextSlot = inactiveGameSlot();
    const to = gameAudio(nextSlot);
    if (!to) return;

    currentGameUrlRef.current = gameTrack.url;
    to.src = gameTrack.url;
    to.currentTime = 0;
    to.volume = 0;
    to.loop = tracks.length === 1;
    to.load();

    if (!musicIntentRef.current || tryoutActive) {
      suppressGamePauseRef.current = true;
      from?.pause();
      window.setTimeout(() => {
        suppressGamePauseRef.current = false;
      }, 0);
      to.volume = GAME_VOLUME;
      activeGameRef.current = nextSlot;
      return;
    }

    cancelFades();
    activeGameRef.current = nextSlot;
    to
      .play()
      .then(() => {
        setPlaying(true);
        fadeCleanupsRef.current.push(fadeAudio(to, GAME_VOLUME, MUSIC_CROSSFADE_MS));
        if (from && !from.paused) {
          fadeCleanupsRef.current.push(
            fadeAudio(from, 0, MUSIC_CROSSFADE_MS, () => {
              suppressGamePauseRef.current = true;
              from.pause();
              from.currentTime = 0;
              window.setTimeout(() => {
                suppressGamePauseRef.current = false;
              }, 0);
            }),
          );
        }
      })
      .catch(() => {
        setPlaying(false);
        if (from && !from.paused) from.volume = GAME_VOLUME;
      });
  }, [gameTrack.url, tracks.length, tryoutActive]);

  useEffect(() => {
    const game = gameAudio();
    const tryout = tryoutRef.current;
    if (!game || !tryout) return;

    if (tryoutActive) {
      tryoutWasActiveRef.current = true;
      startTryoutMusic(true);
      return cancelFades;
    }

    if (!tryoutWasActiveRef.current) return undefined;
    tryoutWasActiveRef.current = false;
    returnToGameMusic();

    return cancelFades;
  }, [tryoutActive]);

  useEffect(() => {
    const contact = contactRef.current;
    if (!contact) return undefined;
    const run = ++contactRunRef.current;
    cancelContactFades();

    if (contactActive) {
      const contactTrack = randomPracticeSceneTrack();
      contact.src = contactTrack.url;
      contact.load();
      contact.currentTime = 0;
      contact.volume = 0;
      const start = contact.paused ? contact.play() : Promise.resolve();
      start
        .then(() => {
          if (contactRunRef.current !== run) return;
          fadeGameTo(CONTACT_GAME_VOLUME, MUSIC_CROSSFADE_MS);
          contactFadeCleanupsRef.current.push(
            fadeAudio(contact, CONTACT_VOLUME, MUSIC_CROSSFADE_MS),
          );
        })
        .catch(() => undefined);
      return cancelContactFades;
    }

    if (!contact.paused) {
      contactFadeCleanupsRef.current.push(
        fadeAudio(contact, 0, MUSIC_CROSSFADE_MS, () => {
          if (contactRunRef.current !== run) return;
          contact.pause();
          contact.currentTime = 0;
        }),
      );
    } else {
      contact.currentTime = 0;
      contact.volume = 0;
    }
    if (musicIntentRef.current && !tryoutActive) {
      const game = gameAudio();
      if (game?.paused) game.play().catch(() => undefined);
      fadeGameTo(GAME_VOLUME, MUSIC_CROSSFADE_MS);
    }

    return cancelContactFades;
  }, [contactActive, tryoutActive]);

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
    const audio = tryoutActive ? tryoutRef.current : gameAudio();
    if (!audio) return;
    startedRef.current = true; // user is in control from here on
    if (audio.paused) {
      musicIntentRef.current = true;
      audio
        .play()
        .then(() => {
          if (!tryoutActive) pauseInactiveGameAudio();
        })
        .catch(() => {});
      if (tryoutActive) fadeAudio(audio, TRYOUT_VOLUME, 180);
      else fadeAudio(audio, GAME_VOLUME, 180);
    } else {
      musicIntentRef.current = false;
      audio.pause();
      if (!tryoutActive) pauseInactiveGameAudio();
    }
  };

  const go = (delta: number) =>
    setIndex((i) => (i + delta + tracks.length) % tracks.length);

  // Auto-advance when a track ends: pick a RANDOM other track in the pool (a
  // 1-track pool loops via the loop attr and never fires onEnded). The prev/next
  // buttons stay sequential (go) so manual skipping is predictable.
  const advanceTrack = () =>
    setIndex((i) => {
      if (tracks.length <= 1) return i;
      const current = ((i % tracks.length) + tracks.length) % tracks.length;
      let n = Math.floor(Math.random() * tracks.length);
      if (n === current) n = (n + 1) % tracks.length;
      return n;
    });

  const track = tryoutActive ? tryoutTrack : gameTrack;

  return (
    <div className="miniplayer">
      <audio
        ref={audioARef}
        preload="auto"
        autoPlay
        playsInline
        loop={tracks.length === 1}
        onEnded={advanceTrack}
        onPlay={() => {
          if (activeGameRef.current !== "a") return;
          setPlaying(true);
          musicIntentRef.current = true;
          startedRef.current = true;
        }}
        onPause={() => {
          if (
            activeGameRef.current === "a" &&
            !suppressGamePauseRef.current &&
            !tryoutActive
          ) {
            setPlaying(false);
            musicIntentRef.current = false;
          }
        }}
      />
      <audio
        ref={audioBRef}
        preload="auto"
        playsInline
        loop={tracks.length === 1}
        onEnded={advanceTrack}
        onPlay={() => {
          if (activeGameRef.current !== "b") return;
          setPlaying(true);
          musicIntentRef.current = true;
          startedRef.current = true;
        }}
        onPause={() => {
          if (
            activeGameRef.current === "b" &&
            !suppressGamePauseRef.current &&
            !tryoutActive
          ) {
            setPlaying(false);
            musicIntentRef.current = false;
          }
        }}
      />
      <audio
        ref={contactRef}
        preload="auto"
        loop
      />
      <audio
        ref={tryoutRef}
        src={tryoutTrack.url}
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

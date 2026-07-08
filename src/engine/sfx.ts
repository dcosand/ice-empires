// Tiny SFX manager over the game audio in /assets/audio.
// No dependencies: a pool of HTMLAudio elements per sound, fire-and-forget.
// Browsers block audio before the first user gesture; play() failures are
// swallowed so early autoplay restrictions never break the game.

const SFX = "/assets/audio/sfx";

export type SfxName =
  | "click" // generic button press
  | "confirm" // committing something (start build/research, recruit)
  | "back" // cancel / close
  | "select" // picking a unit / tile
  | "endTurn" // the month rolls over
  | "complete" // building/unit/research finished
  | "fanfare" // era reached, first contact — the big ones
  | "check" // era requirement ticked off
  | "recruit" // a player joins
  | "cardFlip" // flipping a candidate/player card in the tryout pack
  | "eventGood" // a positive map event resolves (goodie hut, wanderer recruit)
  | "eventBad" // a negative map event resolves (bad hut, wanderer scrap)
  | "walk"
  | "iceWalk"
  | "snowWalk"
  | "forestWalk"
  | "movementError"
  | "error"; // action refused

const FILES: Record<SfxName, string[]> = {
  click: [`${SFX}/click.m4a`],
  confirm: [`${SFX}/success-click.mp3`],
  back: [`${SFX}/transition-click.wav`],
  select: [`${SFX}/click.m4a`],
  endTurn: [`${SFX}/success-click.mp3`],
  complete: [`${SFX}/success-click.mp3`],
  fanfare: [`${SFX}/success-click.mp3`],
  check: [`${SFX}/success-click.mp3`],
  recruit: [`${SFX}/success-click.mp3`],
  cardFlip: [`${SFX}/click.m4a`],
  eventGood: [`${SFX}/event-sfx-01.mp3`],
  eventBad: [`${SFX}/event-sfx-02.mp3`],
  walk: [`${SFX}/walking-01.wav`, `${SFX}/walking-02.wav`],
  iceWalk: [`${SFX}/ice-walking-01.wav`, `${SFX}/ice-walking-02.wav`],
  snowWalk: [`${SFX}/snow-walking-01.wav`, `${SFX}/snow-walking-02.wav`],
  forestWalk: [`${SFX}/forest-walking-01.wav`, `${SFX}/forest-walking-02.wav`],
  movementError: [`${SFX}/movement-error.m4a`],
  error: [`${SFX}/soft-error.mp3`],
};

const VOLUME: Partial<Record<SfxName, number>> = {
  click: 0.25,
  select: 0.25,
  back: 0.3,
  endTurn: 0.4,
  fanfare: 0.55,
  cardFlip: 0.3,
  eventGood: 0.5,
  eventBad: 0.5,
  walk: 0.32,
  iceWalk: 0.34,
  snowWalk: 0.34,
  forestWalk: 0.34,
  movementError: 0.38,
};

const pools = new Map<string, HTMLAudioElement[]>();
// Keyed by resolved file, not by SfxName: the capture-phase global click
// listener and a component's explicit playSfx often fire two DIFFERENT names
// that resolve to the SAME file (e.g. a nav dot → "select" + "cardFlip", both
// click.m4a). Deduping on the file collapses that double-fire.
const lastPlayedAt = new Map<string, number>();
const DEDUP_MS = 60;

function grab(src: string, volume: number): HTMLAudioElement {
  const pool = pools.get(src) ?? [];
  const idle = pool.find((a) => a.paused || a.ended);
  if (idle) {
    idle.volume = volume;
    idle.currentTime = 0;
    return idle;
  }
  const a = new Audio(src);
  a.volume = volume;
  pool.push(a);
  pools.set(src, pool);
  return a;
}

export function playSfx(name: SfxName): void {
  const files = FILES[name];
  if (!files?.length) return;
  const src = files[Math.floor(Math.random() * files.length)];
  const now = performance.now();
  if (now - (lastPlayedAt.get(src) ?? -Infinity) < DEDUP_MS) return;
  lastPlayedAt.set(src, now);
  try {
    void grab(src, VOLUME[name] ?? 0.4).play().catch(() => undefined);
  } catch {
    // Autoplay restrictions before first gesture — fine, stay silent.
  }
}

function buttonText(el: HTMLElement): string {
  return [
    el.getAttribute("aria-label"),
    el.getAttribute("title"),
    el.textContent,
    el.dataset.tip,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function classifyButtonClick(button: HTMLElement): SfxName | null {
  const label = buttonText(button);
  const classes = button.className.toString();

  if (/\b(end turn|let's begin)\b/.test(label)) return null;

  if (
    button.matches(".overlay-scrim") ||
    button.matches(".dock-btn, .task-button, .topbar-club, .notif-chip, .rival-face") ||
    button.matches(".tech-node-info, .prod-card-info, .prod-row-info") ||
    /\b(close|back|skip|continue|restart|details|open|finish tryouts|previous track|next track)\b/.test(
      label,
    )
  ) {
    return "back";
  }

  if (
    button.matches(".btn-gold") ||
    /\b(begin|build|confirm|choose|found|finish|hold tryouts|recruit|send introduction|establish|harvest|clear snow|pave|welcome|hand them)\b/.test(
      label,
    )
  ) {
    return "confirm";
  }

  if (classes.includes("onb-dot") || classes.includes("pack-dot")) {
    return "select";
  }

  return "click";
}

// One global listener gives every <button> an appropriate click without touching
// every component. Event-specific sounds still call playSfx directly.
let installed = false;
export function installGlobalClickSfx(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      const button = el?.closest("button");
      if (button?.dataset.sfx === "manual") return;
      const sound = button ? classifyButtonClick(button) : null;
      if (sound) playSfx(sound);
    },
    { capture: true },
  );
}

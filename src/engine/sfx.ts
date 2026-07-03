// Tiny SFX manager over the Kenney CC0 packs in /assets/vendor/kenney.
// No dependencies: a pool of HTMLAudio elements per sound, fire-and-forget.
// Browsers block audio before the first user gesture; play() failures are
// swallowed so early autoplay restrictions never break the game.

const IS = "/assets/vendor/kenney/interface-sounds/Audio";
const UI = "/assets/vendor/kenney/ui-audio/Audio";

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
  | "error"; // action refused

const FILES: Record<SfxName, string[]> = {
  click: [`${UI}/click1.ogg`, `${UI}/click2.ogg`],
  confirm: [`${IS}/confirmation_001.ogg`],
  back: [`${IS}/back_001.ogg`],
  select: [`${IS}/click_002.ogg`],
  endTurn: [`${IS}/maximize_001.ogg`],
  complete: [`${IS}/confirmation_002.ogg`],
  fanfare: [`${IS}/confirmation_004.ogg`],
  check: [`${IS}/drop_002.ogg`],
  recruit: [`${IS}/confirmation_003.ogg`],
  error: [`${IS}/error_004.ogg`],
};

const VOLUME: Partial<Record<SfxName, number>> = {
  click: 0.25,
  select: 0.25,
  back: 0.3,
  endTurn: 0.4,
  fanfare: 0.55,
};

const pools = new Map<string, HTMLAudioElement[]>();

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

let muted = false;
export function setSfxMuted(value: boolean): void {
  muted = value;
}
export function isSfxMuted(): boolean {
  return muted;
}

export function playSfx(name: SfxName): void {
  if (muted) return;
  const files = FILES[name];
  if (!files?.length) return;
  const src = files[Math.floor(Math.random() * files.length)];
  try {
    void grab(src, VOLUME[name] ?? 0.4).play().catch(() => undefined);
  } catch {
    // Autoplay restrictions before first gesture — fine, stay silent.
  }
}

// One global listener gives every <button> a click sound without touching
// each component. Buttons that want a richer sound (confirm/recruit/etc.)
// play it themselves; the generic click underneath is quiet enough to layer.
let installed = false;
export function installGlobalClickSfx(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button")) playSfx("click");
    },
    { capture: true },
  );
}

// Tiny deterministic PRNG (mulberry32). Seeded so turns are debuggable and
// reproducible. The engine threads `rngSeed` through state and advances it.

export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: t >>> 0 };
}

// Roll an integer in [0, max). Returns the next seed alongside it.
export function nextInt(
  seed: number,
  max: number,
): { value: number; seed: number } {
  const r = nextRandom(seed);
  return { value: Math.floor(r.value * max), seed: r.seed };
}

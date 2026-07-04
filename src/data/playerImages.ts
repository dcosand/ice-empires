import type { PlayerGender, PlayerPosition } from "../types/game";

type PlayerImageKind = "prospect" | "player";

const ROOT = "/assets/players/";

const MALE_SKATER_PLAYER = numbered("skater-player", 8);
const MALE_SKATER_PROSPECT = numbered("skater-prospect", 8);
const FEMALE_SKATER_PLAYER = numbered("female-skater", 4);
const FEMALE_PROSPECT = numbered("female-prospect", 6);
const MALE_GOALIE_PLAYER = numbered("goalie-player", 6);
const MALE_GOALIE_PROSPECT = numbered("goalie-prospect", 5);
const FEMALE_GOALIE_PLAYER = numbered("female-goalie-player", 2);
const FEMALE_GOALIE_PROSPECT = numbered("female-goalie-prospect", 2);

function numbered(base: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, i) => `${ROOT}${base}-${String(i + 1).padStart(2, "0")}.png`,
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function playerImageFor({
  gender,
  kind,
  position,
  seed,
}: {
  gender: PlayerGender;
  kind: PlayerImageKind;
  position: PlayerPosition;
  seed: string;
}): string {
  const pool =
    position === "G"
      ? gender === "female"
        ? kind === "prospect"
          ? FEMALE_GOALIE_PROSPECT
          : FEMALE_GOALIE_PLAYER
        : kind === "prospect"
          ? MALE_GOALIE_PROSPECT
          : MALE_GOALIE_PLAYER
      : gender === "female"
        ? kind === "prospect"
          ? FEMALE_PROSPECT
          : FEMALE_SKATER_PLAYER
        : kind === "prospect"
          ? MALE_SKATER_PROSPECT
          : MALE_SKATER_PLAYER;
  return pool[hashString(seed) % pool.length];
}

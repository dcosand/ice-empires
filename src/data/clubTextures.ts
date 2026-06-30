// Pixi texture warming for club art (leader portrait + crest logo).
//
// These show up on the iso map as the Leader/Founding-Group unit portrait and
// the HQ / scout crest. Pixi keeps its own cache separate from the browser's,
// and decoding a PNG into a GPU texture on map mount is what caused the Leader
// to flash its fallback face for a beat. We warm Pixi's cache as soon as the
// club is known (the founding screen) and read it back synchronously when the
// map mounts, so the portrait is there on the very first frame.
import { Assets, Texture } from "pixi.js";
import { clubAsset } from "./clubs";
import type { ClubDef } from "../types/game";

// The club textures the iso map renders. Backgrounds/rinks are plain <img>
// elsewhere and don't need Pixi textures.
function clubTextureUrls(club: ClubDef): string[] {
  return [clubAsset(club, "leader"), clubAsset(club, "logo")];
}

// Kick off (or join) the Pixi load for a club's textures. Safe to call repeatedly
// — Assets.load dedupes by URL and resolves instantly once cached.
export function preloadClubTextures(club: ClubDef): void {
  for (const url of clubTextureUrls(club)) {
    Assets.load<Texture>(url).catch(() => {
      /* missing art falls back to the painted placeholder */
    });
  }
}

// Synchronous cache read: returns the decoded texture if Pixi has already
// loaded it, else null. Lets the map seed its initial state without a flash.
export function cachedClubTexture(url: string): Texture | null {
  return Assets.cache.has(url) ? Assets.cache.get<Texture>(url) ?? null : null;
}

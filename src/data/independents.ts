import type { WorldHockeyOrg } from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";

// Art for independents lives in /public/assets/independents/<slug>/ with two
// files: card.png (portrait poster) and background.png (wide scene). The
// HOCKEY_ORG_NAMES pool (engine/world.ts) is kept in lockstep with these
// folders, so every placed independent has art — but consumers should still
// keep their fallback (archetype SVG vignette / plain panel) via onError in
// case a folder is mid-add.

// "Baie-Comeau" -> "baie-comeau", "Québec City" -> "quebec-city",
// "St. John's" -> "st-johns"
export function indieSlug(displayName: string): string {
  return displayName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function indieAsset(
  org: Pick<WorldHockeyOrg, "id" | "name" | "x" | "y">,
  kind: "card" | "background",
): string {
  return `/assets/independents/${indieSlug(hockeyOrgDisplayName(org))}/${kind}.png`;
}

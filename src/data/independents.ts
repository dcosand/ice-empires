import type { WorldHockeyOrg } from "../types/game";
import { hockeyOrgDisplayName } from "../engine/world";

// Art for independents lives in /public/assets/independents/<slug>/ with two
// files: card.png (portrait poster) and background.png (wide scene). Only a
// handful of indies have art so far — every consumer must keep its fallback
// (archetype SVG vignette / plain panel) via onError. TODO: full coverage of
// the ~100-name pool as assets land.

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

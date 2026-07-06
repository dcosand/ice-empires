import type {
  NationDefinition,
  NationId,
  NationalityWeights,
  PersonNationality,
} from "../types/game";

export const NATIONS: Record<NationId, NationDefinition> = {
  usa: { id: "usa", displayName: "USA", namePoolId: "usa" },
  canada: { id: "canada", displayName: "Canada", namePoolId: "canada" },
  canada_french: {
    id: "canada_french",
    displayName: "French Canada",
    namePoolId: "canada_french",
  },
  finland: { id: "finland", displayName: "Finland", namePoolId: "finland" },
  sweden: { id: "sweden", displayName: "Sweden", namePoolId: "sweden" },
  czechia: { id: "czechia", displayName: "Czechia", namePoolId: "czechia" },
  slovakia: { id: "slovakia", displayName: "Slovakia", namePoolId: "slovakia" },
  russia: { id: "russia", displayName: "Russia", namePoolId: "russia" },
  germany: { id: "germany", displayName: "Germany", namePoolId: "germany" },
  switzerland: {
    id: "switzerland",
    displayName: "Switzerland",
    namePoolId: "switzerland",
  },
  latvia: { id: "latvia", displayName: "Latvia", namePoolId: "latvia" },
  other: { id: "other", displayName: "Other", namePoolId: "other" },
};

// Emoji flags — no icon assets, no deps. French Canada gets the fleur-de-lis
// (its own name pool and identity, D45); "other" flies the neutral flag.
const NATION_FLAGS: Record<NationId, string> = {
  usa: "🇺🇸",
  canada: "🇨🇦",
  canada_french: "⚜️",
  finland: "🇫🇮",
  sweden: "🇸🇪",
  czechia: "🇨🇿",
  slovakia: "🇸🇰",
  russia: "🇷🇺",
  germany: "🇩🇪",
  switzerland: "🇨🇭",
  latvia: "🇱🇻",
  other: "🏳️",
};

// The flag(s) for a person: primary, plus the secondary for dual nationals.
// Pair with nationalityLabel in a title tooltip — the flag is the display,
// the words are the explanation.
export function nationalityFlag(
  nationality: PersonNationality | NationId | null | undefined,
): string {
  if (!nationality) return NATION_FLAGS.other;
  const primary =
    typeof nationality === "string" ? nationality : nationality.primary;
  const secondary =
    typeof nationality === "string" ? undefined : nationality.secondary;
  const flag = NATION_FLAGS[primary] ?? NATION_FLAGS.other;
  if (!secondary) return flag;
  return `${flag}${NATION_FLAGS[secondary] ?? NATION_FLAGS.other}`;
}

export function nationalityLabel(
  nationality: PersonNationality | NationId | null | undefined,
): string {
  if (!nationality) return "Unknown";
  const primary =
    typeof nationality === "string" ? nationality : nationality.primary;
  const secondary =
    typeof nationality === "string" ? undefined : nationality.secondary;
  const primaryLabel = NATIONS[primary]?.displayName ?? primary;
  if (!secondary) return primaryLabel;
  return `${primaryLabel}/${NATIONS[secondary]?.displayName ?? secondary}`;
}

export function nationalityProfile(
  homeNationId: NationId,
  nationalityWeights?: NationalityWeights,
): { homeNationId: NationId; nationalityWeights: NationalityWeights } {
  return {
    homeNationId,
    nationalityWeights:
      nationalityWeights && Object.keys(nationalityWeights).length > 0
        ? nationalityWeights
        : { [homeNationId]: 1 },
  };
}

export function independentNationalityProfile(name: string): {
  homeNationId: NationId;
  nationalityWeights: NationalityWeights;
} {
  const canadian: NationalityWeights = { canada: 85, usa: 8, canada_french: 7 };
  const canadianFrench: NationalityWeights = {
    canada_french: 80,
    canada: 15,
    usa: 5,
  };
  const american: NationalityWeights = { usa: 84, canada: 12, other: 4 };

  switch (name) {
    case "Baie-Comeau":
    case "Québec City":
    case "Shawinigan":
      return { homeNationId: "canada_french", nationalityWeights: canadianFrench };
    case "Barrie":
    case "Brandon":
    case "Kamloops":
    case "Kelowna":
    case "Kingston":
    case "Ottawa":
    case "Red Deer":
    case "Regina":
    case "Victoria":
    case "Winnipeg":
      return { homeNationId: "canada", nationalityWeights: canadian };
    case "Moscow":
      return {
        homeNationId: "russia",
        nationalityWeights: { russia: 82, finland: 5, sweden: 4, other: 9 },
      };
    case "Tampere":
    case "Espoo":
      return {
        homeNationId: "finland",
        nationalityWeights: { finland: 86, sweden: 6, russia: 3, other: 5 },
      };
    case "Linköping":
    case "Malmö":
      return {
        homeNationId: "sweden",
        nationalityWeights: { sweden: 86, finland: 6, other: 8 },
      };
    case "Bratislava":
      return {
        homeNationId: "slovakia",
        nationalityWeights: { slovakia: 78, czechia: 14, other: 8 },
      };
    case "Pardubice":
      return {
        homeNationId: "czechia",
        nationalityWeights: { czechia: 82, slovakia: 10, other: 8 },
      };
    case "Lugano":
      return {
        homeNationId: "switzerland",
        nationalityWeights: { switzerland: 78, germany: 8, other: 14 },
      };
    // Maine is intentionally treated as a USA profile despite its broad region
    // name; Grand Rapids/Henderson/Hershey/San Diego are current pool items.
    case "Anchorage":
    case "Austin":
    case "Colorado Springs":
    case "Duluth":
    case "Grand Forks":
    case "Grand Rapids":
    case "Henderson":
    case "Hershey":
    case "Maine":
    case "Omaha":
    case "Providence":
    case "San Diego":
    case "Tempe":
      return { homeNationId: "usa", nationalityWeights: american };
    default:
      return { homeNationId: "other", nationalityWeights: { other: 70, usa: 15, canada: 15 } };
  }
}

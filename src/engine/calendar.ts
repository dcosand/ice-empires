// The game calendar. Internally time is a simple month counter (state.month,
// 1-based); player-facing UI shows a hockey-season calendar instead of
// "Month 7". The world is a fantasy timeline — no real-world years — so dates
// anchor to Year 1, and the game begins in November, when the ponds freeze.
//
// month 1 = Nov, Year 1 · month 12 = Oct, Year 1 · month 13 = Nov, Year 2

const MONTH_NAMES = [
  "November",
  "December",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
];

export function turnMonthName(month: number, short = false): string {
  const name = MONTH_NAMES[(Math.max(1, month) - 1) % 12];
  return short ? name.slice(0, 3) : name;
}

export function turnYear(month: number): number {
  return Math.ceil(Math.max(1, month) / 12);
}

// "Nov · Year 1" — the standard date chip.
export function turnDateLabel(month: number): string {
  return `${turnMonthName(month, true)} · Year ${turnYear(month)}`;
}

// "November, Year 1" — for prose copy.
export function turnDateLong(month: number): string {
  return `${turnMonthName(month)}, Year ${turnYear(month)}`;
}

// ---------------------------------------------------------------------------
// Seasonal tryout windows (D37): the hockey calendar has two recruiting
// moments — spring tryouts (May) and training camp (Aug–Sep). Indices are
// positions in MONTH_NAMES (0 = November, the game's opening month).
// ---------------------------------------------------------------------------

export type TryoutWindow = "spring" | "camp";

const SPRING_INDEX = 6; // May
const CAMP_INDICES = [9, 10]; // August, September

export function tryoutWindowFor(month: number): TryoutWindow | null {
  const idx = (Math.max(1, month) - 1) % 12;
  if (idx === SPRING_INDEX) return "spring";
  if (CAMP_INDICES.includes(idx)) return "camp";
  return null;
}

// The next month (strictly after `month`) that opens a tryout window —
// for "Next tryouts open in May" copy.
export function nextTryoutWindowMonth(month: number): number {
  for (let m = month + 1; m <= month + 12; m++) {
    if (tryoutWindowFor(m)) return m;
  }
  return month + 1; // unreachable — every year has windows
}

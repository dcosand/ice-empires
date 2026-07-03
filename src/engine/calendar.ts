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

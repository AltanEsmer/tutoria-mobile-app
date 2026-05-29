import type { ActivityProgress, LocalActivityEntry } from './types';

/**
 * Progress derivation helpers.
 *
 * The backend `GET /v1/progress/:profileId` endpoint can fail (it joins a
 * `activities.display_text` column that may not exist server-side, returning a
 * 500). To keep the Progress page working, the app maintains its own on-device
 * activity log (see `useProgressStore.activityLog`) and derives the same
 * `ActivityProgress[]` / streak shape the backend would have returned.
 *
 * The derivation mirrors the backend rules so the fallback view matches the
 * server view: mastery at 3 distinct correct days, and a day-based consecutive
 * streak anchored to today or yesterday.
 */

const MASTERY_THRESHOLD_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Format a Date as a local YYYY-MM-DD key (matches WeeklyChart bucketing). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse a YYYY-MM-DD key into a local Date at midnight. Returns null if invalid. */
function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  date.setHours(0, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Whole-day difference between two YYYY-MM-DD midnight dates (a - b). */
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/**
 * Map the on-device activity log into the `ActivityProgress[]` shape the
 * Progress UI consumes. `daysCorrect` is the count of distinct correct days and
 * `mastered` follows the backend's >= 3 rule.
 */
export function deriveActivities(
  activityLog: Record<string, LocalActivityEntry>,
): ActivityProgress[] {
  return Object.values(activityLog)
    .map((entry) => {
      const daysCorrect = new Set(entry.correctDates).size;
      return {
        id: entry.id,
        displayText: entry.displayText || entry.id,
        isCorrect: entry.lastIsCorrect,
        daysCorrect,
        mastered: daysCorrect >= MASTERY_THRESHOLD_DAYS,
        lastDate: entry.lastDate,
      };
    })
    .sort((a, b) => {
      // Most recently practiced first; entries without a date sink to the bottom.
      if (a.lastDate === b.lastDate) return 0;
      if (!a.lastDate) return 1;
      if (!b.lastDate) return -1;
      return a.lastDate < b.lastDate ? 1 : -1;
    });
}

/**
 * Compute a day-based consecutive streak from the on-device activity log,
 * mirroring the backend `calculateStreak`: collect all distinct correct dates,
 * and if the most recent is today or yesterday, count back over consecutive
 * single-day gaps. Returns 0 if the streak is broken (newest date older than
 * yesterday) or there are no correct dates.
 */
export function computeStreak(
  activityLog: Record<string, LocalActivityEntry>,
  today: Date,
): number {
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);

  const dates = Array.from(
    new Set(Object.values(activityLog).flatMap((e) => e.correctDates)),
  )
    .map(parseDateKey)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => b.getTime() - a.getTime());

  if (dates.length === 0) return 0;

  // Newest correct day must be today or yesterday, else the streak is broken.
  const gapFromToday = dayDiff(todayMidnight, dates[0]);
  if (gapFromToday > 1) return 0;

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    if (dayDiff(dates[i - 1], dates[i]) === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

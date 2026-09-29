import { istDateString, istMinuteOfDay } from '../time/ist.js';

/** Gainers refresh window (spec 0009 AC-12): 09:22 to 15:22 IST, every 15 minutes. */
export const REFRESH_FIRST_MINUTE = 9 * 60 + 22;
export const REFRESH_LAST_MINUTE = 15 * 60 + 22;
export const REFRESH_EVERY_MINUTES = 15;
/** Cron for the slots above, 2 minutes past each quarter hour so it misses the 5m candle closes. */
export const REFRESH_CRON = '0 7,22,37,52 9-15 * * 1-5';

export function isInRefreshWindow(now: Date = new Date()): boolean {
  const minute = istMinuteOfDay(now);
  return minute >= REFRESH_FIRST_MINUTE && minute <= REFRESH_LAST_MINUTE;
}

export function isFirstRefreshSlot(now: Date = new Date()): boolean {
  return istMinuteOfDay(now) === REFRESH_FIRST_MINUTE;
}

export function isIstWeekday(now: Date = new Date()): boolean {
  const day = new Date(`${istDateString(now)}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/** The next refresh slot after `now` today, or null once the last slot has passed. */
export function nextRefreshAt(now: Date = new Date()): Date | null {
  const minute = istMinuteOfDay(now);
  for (let slot = REFRESH_FIRST_MINUTE; slot <= REFRESH_LAST_MINUTE; slot += REFRESH_EVERY_MINUTES) {
    if (slot > minute) {
      const minuteStart = Math.floor(now.getTime() / 60_000) * 60_000;
      return new Date(minuteStart + (slot - minute) * 60_000);
    }
  }
  return null;
}

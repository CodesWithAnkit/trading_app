import { istDateString, istMinuteOfDay } from '../time/ist.js';

/** Plans close, and no new plan opens, from 15:15 IST (spec 0010 AC-3). */
export const TIME_EXIT_MINUTE = 15 * 60 + 15;
const SESSION_OPEN_MINUTE = 9 * 60 + 15;

export function isIstWeekday(now: Date = new Date()): boolean {
  const day = new Date(`${istDateString(now)}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

/** True from 15:15 IST: too late to open a plan. */
export function isAtOrAfterTimeExit(at: Date): boolean {
  return istMinuteOfDay(at) >= TIME_EXIT_MINUTE;
}

/** Ticks that may close a plan: 09:15 to 15:15 IST (spec 0010). */
export function isInExitWindow(at: Date): boolean {
  const minute = istMinuteOfDay(at);
  return minute >= SESSION_OPEN_MINUTE && minute < TIME_EXIT_MINUTE;
}

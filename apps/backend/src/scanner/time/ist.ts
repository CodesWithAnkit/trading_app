// Indian market only: every "day" in the scanner is an Asia/Kolkata calendar day.
export const IST_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** YYYY-MM-DD for the IST calendar day containing `now`. */
export function istDateString(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`));
}

function istToUtc(date: string, hours: number, minutes: number): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hours, minutes) - IST_OFFSET_MS);
}

/** UTC instants bounding an IST calendar day and its 09:15–15:30 cash session. */
export function istDayRange(date: string) {
  return {
    dayStart: istToUtc(date, 0, 0),
    dayEnd: istToUtc(date, 24, 0),
    sessionStart: istToUtc(date, 9, 15),
    sessionEnd: istToUtc(date, 15, 30),
  };
}

/** `YYYY-MM-DD HH:mm` in IST, the format SmartAPI's historical candle API expects. */
export function istDateTimeString(at: Date): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
}

/** Minutes since IST midnight, e.g. 09:22 -> 562. */
export function istMinuteOfDay(now: Date = new Date()): number {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

// Spec 0024: small text and time helpers shared by the adapters.

const IST_OFFSET_MS = 330 * 60_000;

/** The IST calendar date (YYYY-MM-DD) of an instant. */
export function istDate(at: Date = new Date()): string {
  return new Date(at.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since IST midnight for an instant. */
export function istMinutes(at: Date = new Date()): number {
  const d = new Date(at.getTime() + IST_OFFSET_MS);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Strips tags and CDATA, decodes common entities, and collapses whitespace. */
export function stripHtml(input: string | null | undefined): string {
  if (!input) return '';
  // Feeds often entity encode their HTML, so tags can only be removed after decoding.
  return stripOnce(stripOnce(input));
}

function stripOnce(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (m, e: string) => {
      const k = e.toLowerCase();
      if (ENTITIES[k]) return ENTITIES[k];
      if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith('#')) return String.fromCodePoint(Number(k.slice(1)));
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
}

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/**
 * Parses an exchange IST timestamp as +05:30. Accepts `10-Nov-2026 14:32:11` (NSE),
 * `2026-11-10T14:32:11.27` (BSE), and `10/11/2026 14:32:11`. Returns ISO UTC or null.
 */
export function parseIstTimestamp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) {
    const mon = MONTHS[m[2].toLowerCase()];
    if (!mon) return null;
    return isoFromIst(`${m[3]}-${mon}-${m[1].padStart(2, '0')}`, m[4], m[5], m[6]);
  }
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return isoFromIst(`${m[1]}-${m[2]}-${m[3]}`, m[4], m[5], m[6]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return isoFromIst(`${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, m[4], m[5], m[6]);
  return null;
}

function isoFromIst(date: string, h: string, mi: string, sec?: string): string | null {
  const t = Date.parse(`${date}T${h.padStart(2, '0')}:${mi}:${sec ?? '00'}+05:30`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** Alpha Vantage `YYYYMMDDTHHMMSS` (UTC) to ISO. */
export function parseAlphaVantageTime(raw: string | null | undefined): string | null {
  const m = raw?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?$/);
  if (!m) return null;
  const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? '00'}Z`);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/** RFC822 pubDate (or any Date.parse friendly string) to ISO. */
export function parseRfc822(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = Date.parse(raw.trim());
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

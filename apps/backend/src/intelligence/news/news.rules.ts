// Spec 0024 rule table v1: first match wins. `direction: null` means the rule decides
// impact and event type, but leaves the direction to Gemini.
import type { Direction, EventType, Impact } from './news.types.js';

export const RULES_VERSION = 'rules-v1';
export const RULE_CONFIDENCE = 0.9;

type Rule = {
  pattern: RegExp;
  eventType: EventType;
  impact: Impact;
  /** A fixed direction, null for undecided, or a function of the matched text. */
  direction: Direction | null | ((text: string) => Direction | null);
};

export const RULES_V1: Rule[] = [
  { pattern: /financial results|quarterly results|earnings/i, eventType: 'EARNINGS', impact: 'HIGH', direction: null },
  { pattern: /order win|order received|contract awarded|\bLOI\b|letter of intent/i, eventType: 'OFFICIAL_FILING', impact: 'HIGH', direction: 'BULLISH' },
  { pattern: /SEBI order|penalty|fraud|\bdefault\b|insolvency|\bNCLT\b/i, eventType: 'OFFICIAL_FILING', impact: 'HIGH', direction: 'BEARISH' },
  { pattern: /pledge (invoked|created)|invocation of pledge|creation of pledge/i, eventType: 'OFFICIAL_FILING', impact: 'HIGH', direction: 'BEARISH' },
  { pattern: /pledge (released|revoked)|release of pledge|revocation of pledge/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: 'BULLISH' },
  { pattern: /buy ?back|bonus issue|dividend|stock split|sub-division/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: 'BULLISH' },
  { pattern: /resignation of .{0,40}\b(CEO|CFO|MD|managing director|chief executive|chief financial|auditor)\b/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: 'BEARISH' },
  { pattern: /acquisition|merger|amalgamation|demerger/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: null },
  { pattern: /fund ?raising|\bQIP\b|rights issue|preferential/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: 'NEUTRAL' },
  {
    pattern: /credit rating.{0,40}(upgrade|downgrade)|rating.{0,20}(upgraded|downgraded)/i,
    eventType: 'OFFICIAL_FILING',
    impact: 'MEDIUM',
    direction: text => (/upgrade/i.test(text) ? 'BULLISH' : /downgrade/i.test(text) ? 'BEARISH' : null),
  },
  { pattern: /block deal|bulk deal/i, eventType: 'OFFICIAL_FILING', impact: 'MEDIUM', direction: null },
  { pattern: /board meeting|trading window|\bAGM\b|annual general meeting|record date/i, eventType: 'OFFICIAL_FILING', impact: 'LOW', direction: 'NEUTRAL' },
  { pattern: MACRO_PATTERN(), eventType: 'MACRO', impact: 'HIGH', direction: null },
];

/** Market wide macro keywords (AC-4). Also used to keep unmapped items as `MARKET`. */
function MACRO_PATTERN(): RegExp {
  return /\bRBI\b|reserve bank|repo rate|monetary policy|SEBI circular|union budget|\bbudget\b|GST council|government policy/i;
}

export function isMacro(text: string): boolean {
  return MACRO_PATTERN().test(text);
}

export type RuleOutcome =
  | { matched: false }
  | { matched: true; eventType: EventType; impact: Impact; direction: Direction | null };

/** Matches the category and headline against rules v1. */
export function applyRules(category: string | undefined, headline: string): RuleOutcome {
  const text = `${category ?? ''} ${headline}`;
  for (const rule of RULES_V1) {
    if (!rule.pattern.test(text)) continue;
    const direction = typeof rule.direction === 'function' ? rule.direction(text) : rule.direction;
    return { matched: true, eventType: rule.eventType, impact: rule.impact, direction };
  }
  return { matched: false };
}

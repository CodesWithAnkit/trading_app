// Spec 0024 AC-6: rules first, Gemini for what the rules leave undecided, Low / Neutral otherwise.
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { applyRules, isMacro, RULE_CONFIDENCE, RULES_VERSION } from './news.rules.js';
import type { Classification, Direction, EventType, Impact } from './news.types.js';

export const GEMINI_MODEL = 'gemini-2.5-flash';
export const GEMINI_TIMEOUT_MS = 8_000;
export const GEMINI_DAILY_CAP = 200;
export const DEFAULT_CONFIDENCE = 0.3;

export type ClassifyInput = { headline: string; excerpt: string; symbol: string; category?: string; isOfficialFiling: boolean };
export type GeminiVerdict = { impact: Impact; direction: Direction; eventType: EventType; confidence: number };

/** Calls Gemini once. Resolves null on any failure (timeout, bad JSON, HTTP). */
export type GeminiCall = (input: ClassifyInput) => Promise<GeminiVerdict | null>;
/** Takes one call from today's budget; false when the cap is reached. */
export type TakeBudget = () => Promise<boolean>;

const IMPACTS = ['High', 'Medium', 'Low'];
const DIRECTIONS = ['Bullish', 'Bearish', 'Mixed', 'Neutral'];
const EVENT_TYPES = ['OFFICIAL_FILING', 'EARNINGS', 'GENERAL_NEWS', 'MACRO'];

/** The event type an item gets when no rule sets one. */
function baseEventType(input: ClassifyInput): EventType {
  if (isMacro(`${input.category ?? ''} ${input.headline}`)) return 'MACRO';
  return input.isOfficialFiling ? 'OFFICIAL_FILING' : 'GENERAL_NEWS';
}

export async function classify(input: ClassifyInput, gemini: GeminiCall | null, takeBudget: TakeBudget): Promise<Classification & { usedGemini: boolean }> {
  const rule = applyRules(input.category, input.headline);
  if (rule.matched && rule.direction) {
    return { eventType: rule.eventType, impactLevel: rule.impact, direction: rule.direction, confidence: RULE_CONFIDENCE, classifiedBy: 'rules', rulesVersion: RULES_VERSION, usedGemini: false };
  }

  let verdict: GeminiVerdict | null = null;
  let usedGemini = false;
  if (gemini && (await takeBudget())) {
    usedGemini = true;
    verdict = await gemini(input);
  }

  if (rule.matched) {
    // The rule set impact and event type; only the direction was undecided.
    return verdict
      ? { eventType: rule.eventType, impactLevel: rule.impact, direction: verdict.direction, confidence: verdict.confidence, classifiedBy: 'gemini', rulesVersion: RULES_VERSION, usedGemini }
      : { eventType: rule.eventType, impactLevel: rule.impact, direction: 'NEUTRAL', confidence: DEFAULT_CONFIDENCE, classifiedBy: 'default', rulesVersion: RULES_VERSION, usedGemini };
  }
  if (verdict) {
    return { eventType: verdict.eventType, impactLevel: verdict.impact, direction: verdict.direction, confidence: verdict.confidence, classifiedBy: 'gemini', rulesVersion: null, usedGemini };
  }
  return { eventType: baseEventType(input), impactLevel: 'LOW', direction: 'NEUTRAL', confidence: DEFAULT_CONFIDENCE, classifiedBy: 'default', rulesVersion: null, usedGemini };
}

/** Validates Gemini's JSON into a verdict, or null. */
export function parseVerdict(text: string): GeminiVerdict | null {
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    const impact = String(v.impact ?? '');
    const direction = String(v.direction ?? '');
    const eventType = String(v.eventType ?? '');
    const confidence = Number(v.confidence);
    if (!IMPACTS.includes(impact) || !DIRECTIONS.includes(direction) || !EVENT_TYPES.includes(eventType)) return null;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
    return { impact: impact.toUpperCase() as Impact, direction: direction.toUpperCase() as Direction, eventType: eventType as EventType, confidence };
  } catch {
    return null;
  }
}

/** A Gemini caller with the spec's model, temperature 0, 8 s timeout, and JSON schema. */
export function createGeminiCall(apiKey: string): GeminiCall {
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel(
    {
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            impact: { type: SchemaType.STRING, format: 'enum', enum: IMPACTS },
            direction: { type: SchemaType.STRING, format: 'enum', enum: DIRECTIONS },
            eventType: { type: SchemaType.STRING, format: 'enum', enum: EVENT_TYPES },
            confidence: { type: SchemaType.NUMBER },
          },
          required: ['impact', 'direction', 'eventType', 'confidence'],
        },
      },
    },
    { timeout: GEMINI_TIMEOUT_MS },
  );
  return async input => {
    const prompt =
      'Classify this Indian stock market news item for an intraday trader. ' +
      'Return impact on the stock price (High, Medium, Low), direction (Bullish, Bearish, Mixed, Neutral), ' +
      'eventType (OFFICIAL_FILING, EARNINGS, GENERAL_NEWS, MACRO) and confidence from 0 to 1.\n' +
      `Symbol: ${input.symbol}\nHeadline: ${input.headline}\nExcerpt: ${input.excerpt}`;
    try {
      const timeout = new Promise<null>(resolve => setTimeout(() => resolve(null), GEMINI_TIMEOUT_MS));
      const result = await Promise.race([model.generateContent(prompt), timeout]);
      return result ? parseVerdict(result.response.text()) : null;
    } catch {
      return null;
    }
  };
}

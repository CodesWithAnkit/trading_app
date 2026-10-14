import { MarketTick } from './types.js';

export type SymbolResolver = (token: string) => string | undefined;

/**
 * Normalizes a SmartAPI WebSocketV2 tick. In Quote mode (spec 0009 AC-14) the SDK
 * hands every field over as a string, and prices are in paise. Plain numbers (tests,
 * other feeds) are taken as rupees already.
 */
export class TickNormalizer {
  constructor(private readonly resolveSymbol: SymbolResolver = () => undefined) {}

  public normalize(raw: any): MarketTick | null {
    if (!raw || raw.token === undefined || raw.token === null) return null;

    // The token arrives as a fixed width string that can carry quotes and NUL padding.
    const token = String(raw.token).replace(/\u0000/g, '').replace(/^"|"$/g, '').trim();
    if (!token) return null;

    const ltp = price(raw.last_traded_price);
    if (ltp === undefined || ltp <= 0) return null;

    const date = raw.exchange_timestamp ? new Date(Number(raw.exchange_timestamp)) : new Date();
    if (isNaN(date.getTime())) return null;

    const cumulativeVolume = count(raw.vol_traded);
    return {
      instrumentToken: token,
      exchange: 'NSE',
      symbol: this.resolveSymbol(token) || `UNKNOWN_${token}`,
      ltp,
      timestamp: date,
      volume: cumulativeVolume === undefined ? count(raw.last_traded_quantity ?? raw.volume) : undefined,
      cumulativeVolume,
      open: price(raw.open_price_day),
      high: price(raw.high_price_day),
      low: price(raw.low_price_day),
      prevClose: price(raw.close_price),
      rawTimestamp: raw.exchange_timestamp ? Number(raw.exchange_timestamp) : Date.now()
    };
  }
}

function price(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'string' ? Number(value) / 100 : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function count(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

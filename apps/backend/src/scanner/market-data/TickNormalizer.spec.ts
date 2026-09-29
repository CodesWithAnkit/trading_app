import { describe, it, expect, beforeEach } from 'vitest';
import { TickNormalizer } from './TickNormalizer.js';

describe('TickNormalizer', () => {
  let normalizer: TickNormalizer;

  beforeEach(() => {
    normalizer = new TickNormalizer(token => (token === '2885' ? 'RELIANCE' : undefined));
  });

  it('normalizes a Quote mode tick from SDK strings in paise (covers 0009 AC-14)', () => {
    const raw = {
      subscription_mode: '2',
      token: '"2885"\u0000\u0000\u0000',
      exchange_timestamp: '1698748300000',
      last_traded_price: '145025',
      vol_traded: '1200000',
      open_price_day: '142000',
      high_price_day: '146000',
      low_price_day: '141500',
      close_price: '141500'
    };

    const result = normalizer.normalize(raw);

    expect(result).toMatchObject({
      instrumentToken: '2885',
      symbol: 'RELIANCE',
      ltp: 1450.25,
      cumulativeVolume: 1200000,
      volume: undefined,
      open: 1420,
      high: 1460,
      low: 1415,
      prevClose: 1415
    });
    expect(result?.timestamp.getTime()).toBe(1698748300000);
  });

  it('takes plain numbers as rupees and per tick volume when there is no day volume', () => {
    const result = normalizer.normalize({ token: '2885', last_traded_price: 19500.5, last_traded_quantity: 50 });
    expect(result?.ltp).toBe(19500.5);
    expect(result?.volume).toBe(50);
    expect(result?.cumulativeVolume).toBeUndefined();
    expect(result?.prevClose).toBeUndefined();
  });

  it('returns null when raw is null or undefined', () => {
    expect(normalizer.normalize(null)).toBeNull();
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('returns null when token is missing', () => {
    expect(normalizer.normalize({ last_traded_price: 100, exchange_timestamp: 1000 })).toBeNull();
    expect(normalizer.normalize({ token: '\u0000\u0000', last_traded_price: 100 })).toBeNull();
  });

  it('returns null when last_traded_price is invalid', () => {
    expect(normalizer.normalize({ token: '2885', last_traded_price: 0 })).toBeNull();
    expect(normalizer.normalize({ token: '2885', last_traded_price: -10 })).toBeNull();
    expect(normalizer.normalize({ token: '2885', last_traded_price: 'invalid' })).toBeNull();
    expect(normalizer.normalize({ token: '2885' })).toBeNull();
  });

  it('marks tokens the resolver does not know', () => {
    expect(normalizer.normalize({ token: '99999', last_traded_price: 100 })?.symbol).toBe('UNKNOWN_99999');
  });

  it('falls back to current time if exchange_timestamp is missing', () => {
    const now = Date.now();
    const result = normalizer.normalize({ token: '2885', last_traded_price: 100 });
    expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(now - 100);
  });
});

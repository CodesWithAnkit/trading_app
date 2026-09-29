import { describe, it, expect, beforeEach } from 'vitest';
import { TickNormalizer } from './TickNormalizer.js';

describe('TickNormalizer', () => {
  let normalizer: TickNormalizer;

  beforeEach(() => {
    normalizer = new TickNormalizer();
  });

  it('normalizes a valid tick correctly (covers AC-3)', () => {
    const raw = {
      token: '26000',
      last_traded_price: 19500.5,
      exchange_timestamp: 1698748300000,
      last_traded_quantity: 50,
      open_price_of_the_day: 19400,
      high_price_of_the_day: 19550,
      low_price_of_the_day: 19350,
      close_price_of_the_day: 19450
    };

    const result = normalizer.normalize(raw);

    expect(result).not.toBeNull();
    expect(result?.instrumentToken).toBe('26000');
    expect(result?.symbol).toBe('NIFTY 50');
    expect(result?.ltp).toBe(19500.5);
    expect(result?.volume).toBe(50);
    expect(result?.timestamp).toBeInstanceOf(Date);
    expect(result?.timestamp.getTime()).toBe(1698748300000);
  });

  it('returns null when raw is null or undefined', () => {
    expect(normalizer.normalize(null)).toBeNull();
    expect(normalizer.normalize(undefined)).toBeNull();
  });

  it('returns null when token is missing', () => {
    const raw = { last_traded_price: 100, exchange_timestamp: 1000 };
    expect(normalizer.normalize(raw)).toBeNull();
  });

  it('returns null when last_traded_price is invalid', () => {
    expect(normalizer.normalize({ token: '26000', last_traded_price: 0 })).toBeNull();
    expect(normalizer.normalize({ token: '26000', last_traded_price: -10 })).toBeNull();
    expect(normalizer.normalize({ token: '26000', last_traded_price: 'invalid' })).toBeNull();
    expect(normalizer.normalize({ token: '26000' })).toBeNull();
  });

  it('handles ticks with unknown tokens gracefully', () => {
    const raw = {
      token: '99999',
      last_traded_price: 100,
      exchange_timestamp: 1000
    };

    const result = normalizer.normalize(raw);
    expect(result?.symbol).toBe('UNKNOWN_99999');
  });

  it('falls back to current time if exchange_timestamp is missing', () => {
    const raw = {
      token: '26000',
      last_traded_price: 100
    };
    const now = Date.now();
    const result = normalizer.normalize(raw);
    
    expect(result?.timestamp.getTime()).toBeGreaterThanOrEqual(now - 100);
  });
});

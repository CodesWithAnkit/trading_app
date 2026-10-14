import { Candle, CandleSchema } from './candleTypes.js';

export function validateCandle(data: unknown): Candle {
  return CandleSchema.parse(data);
}

export function validateCandles(data: unknown[]): Candle[] {
  return data.map(validateCandle);
}

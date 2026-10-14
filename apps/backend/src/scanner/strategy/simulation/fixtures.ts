import { Candle } from '../market/candleTypes.js';

export function generateTrendFixtures(basePrice: number, count: number, direction: "BULLISH" | "BEARISH"): Candle[] {
  const candles: Candle[] = [];
  let current = basePrice;
  const time = new Date("2024-01-01T09:15:00Z").getTime();
  
  for (let i = 0; i < count; i++) {
    const move = direction === "BULLISH" ? 1 : -1;
    candles.push({
      symbol: "TEST",
      timestamp: new Date(time + i * 60000).toISOString(),
      open: current,
      high: current + move + 0.5,
      low: current - 0.5,
      close: current + move,
      volume: 1000,
      exchange: "NSE",
      timeframe: "1m",
      isComplete: true
    } as Candle);
    current += move;
  }
  return candles;
}

export function generateRangeFixtures(basePrice: number, count: number): Candle[] {
  const candles: Candle[] = [];
  const time = new Date("2024-01-01T09:15:00Z").getTime();
  
  for (let i = 0; i < count; i++) {
    const isUp = i % 2 === 0;
    const move = isUp ? 2 : -2;
    candles.push({
      symbol: "TEST",
      timestamp: new Date(time + i * 60000).toISOString(),
      open: basePrice,
      high: basePrice + 3,
      low: basePrice - 3,
      close: basePrice + move,
      volume: 1000,
      exchange: "NSE",
      timeframe: "1m",
      isComplete: true
    } as Candle);
  }
  return candles;
}

export function generateBreakoutFixture(basePrice: number, historyCount: number): Candle[] {
  const candles = generateRangeFixtures(basePrice, historyCount);
  const time = new Date(candles[candles.length - 1].timestamp).getTime() + 60000;
  
  // The breakout candle
  candles.push({
    symbol: "TEST",
    timestamp: new Date(time).toISOString(),
    open: basePrice + 2,
    high: basePrice + 10,
    low: basePrice + 1,
    close: basePrice + 8, // Closed outside range
    volume: 5000, // High RVOL
    exchange: "NSE",
    timeframe: "1m",
    isComplete: true
  });

  return candles;
}

export function generateGapFixture(): Candle[] {
  return [
    { symbol: "TEST", timestamp: "2024-01-01T15:29:00Z", open: 100, high: 101, low: 99, close: 100, volume: 1000, exchange: "NSE", timeframe: "1m", isComplete: true },
    // Gap up next day
    { symbol: "TEST", timestamp: "2024-01-02T09:15:00Z", open: 110, high: 112, low: 109, close: 111, volume: 2000, exchange: "NSE", timeframe: "1m", isComplete: true }
  ];
}

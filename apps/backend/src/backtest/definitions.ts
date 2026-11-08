// Rule definitions v1 as shown read only on the leaderboard (spec 0020). Text mirrors the spec table;
// the executable truth is scanner/strategy/guru/rules.ts.
export const RULE_DEFINITIONS_V1: Record<string, { name: string; style: string; text: string }> = {
  GJ_PDHL: {
    name: 'Gautam Jha · previous day high/low break',
    style: 'level',
    text: 'Buy stop at the previous day high or sell stop at the previous day low, whichever is touched first after 09:15. Stop 0.5 × daily ATR(14) from entry. Target 10R. One trade per day.',
  },
  MR_EMA_PIN: {
    name: 'Mayank Raj · EMA 9/15 pin bar',
    style: 'trend',
    text: 'Long only. EMA9 > EMA15, and both above their value 3 bars ago. Pin bar: lower wick ≥ 2 × body and ≥ 60% of range, low touches an EMA. Buy stop at the pin high, valid one bar. Stop at the pin low. Target 2R.',
  },
  UP_ORB: {
    name: 'Umar Punjabi · 30 min opening range',
    style: 'range',
    text: 'Range = 09:15 to 09:45 high and low. The first 5m close outside the range enters at that close. Stop the other side. Target 2R. Skip days whose range is more than 1.5 × daily ATR.',
  },
  SP_5EMA: {
    name: 'Subhash Pani · 5 EMA alert candle',
    style: 'reversal',
    text: 'Short only. The alert candle has its low above EMA5. Sell stop at the alert low on the next bar. Stop at the alert high. Target 3R. A newer qualifying bar replaces the alert.',
  },
  AST_RG: {
    name: 'Anish Singh Thakur · red then small green',
    style: 'pattern',
    text: 'A red bar, then a green bar whose body is under 50% of the red body. Buy at the next close if it closes above the green high. Stop at the green low. Target 1R. One trade per day.',
  },
  BASE_COIN: {
    name: 'Coin toss 1:2',
    style: 'baseline',
    text: 'Random side at the 09:30 close, seeded. Stop 1 × ATR(14, 5m). Target 2R. Same costs. 1000 seeds, median shown.',
  },
  BASE_BUYHOLD: {
    name: 'Buy and hold',
    style: 'baseline',
    text: 'Buy the first bar after warm up and hold to the end of the window. Reported as % return and % max drawdown only, never gated.',
  },
};

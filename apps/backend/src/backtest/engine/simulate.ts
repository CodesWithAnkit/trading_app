import {
  Bar,
  DailyBar,
  GuruRule,
  Order,
  Side,
  emaSet,
  istDate,
  minuteOfDayOf,
  priorDayAtrByDate,
  wilderAtr,
} from '../../scanner/strategy/guru/index.js';
import { CostModel, Exchange, costInR, roundTripCharges } from './costModel.js';

// Precision rules v1 (spec 0020).
export const WARMUP_BARS = 30;
export const WARMUP_DAYS = 20;
export const LAST_ENTRY_MIN = 14 * 60 + 45; // no new entries on bars opening at or after 14:45 IST
export const TIME_EXIT_BAR_MIN = 15 * 60 + 10; // the bar closing at 15:15 IST
export const BARS_PER_FULL_DAY = 75;

export type ExitReason = 'target' | 'stop' | 'time';

export type SimTrade = {
  tradeDate: string;
  side: Side;
  entryTime: Date;
  entry: number;
  stop: number;
  target: number;
  exitTime: Date;
  exit: number;
  exitReason: ExitReason;
  rGross: number;
  costR: number;
  rNet: number;
};

export type SimInput = {
  rule: GuruRule;
  symbol: string;
  exchange: Exchange;
  lot: number;
  bars: Bar[]; // 5m, ascending, UTC open times
  daily: DailyBar[]; // 1d, ascending
  costModel: CostModel;
  seed?: number;
  /** Called every `yieldEvery` bars so long runs can yield to the event loop. */
  onProgress?: (barIndex: number, total: number) => Promise<void> | void;
  yieldEvery?: number;
};

export type SimResult = { trades: SimTrade[]; tradingDays: string[]; gapDays: string[] };

/** Mulberry32: small seeded PRNG so BASE_COIN is reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Position = {
  side: Side;
  entry: number;
  stop: number;
  target: number;
  risk: number;
  entryTime: Date;
  entryIndex: number;
  /** STOP fills happen inside the bar, so that bar can also hit stop or target. */
  checkEntryBar: boolean;
  tradeDate: string;
};

type Pending = Order & { placedAt: number; day: string };

/** Splits bars into IST trading days. A day with fewer than a full session of bars is a gap day. */
export function groupDays(bars: Bar[]) {
  const days: { date: string; start: number; end: number }[] = [];
  for (let i = 0; i < bars.length; i++) {
    const d = istDate(bars[i].t);
    const last = days[days.length - 1];
    if (!last || last.date !== d) days.push({ date: d, start: i, end: i });
    else last.end = i;
  }
  return days;
}

export async function simulate(input: SimInput): Promise<SimResult> {
  const { rule, bars, daily, costModel, exchange, lot } = input;
  const slip = costModel.slippagePoints[input.symbol] ?? 1;
  const ema = emaSet(bars);
  const atr5 = wilderAtr(bars, 14);
  const dailyAtr = priorDayAtrByDate(daily);
  const dailyIndex = new Map(daily.map((d, i) => [d.date, i]));
  const random = seededRandom(input.seed ?? 1);
  const yieldEvery = input.yieldEvery ?? 5000;

  const days = groupDays(bars);
  const trades: SimTrade[] = [];
  const gapDays: string[] = [];
  const tradingDays: string[] = [];

  let pos: Position | null = null;
  let barsSeen = 0;

  for (let d = 0; d < days.length; d++) {
    const day = days[d];
    const dayBarCount = day.end - day.start + 1;
    const isGap = dayBarCount < BARS_PER_FULL_DAY - 3; // tolerate a couple of missing bars
    if (isGap) {
      gapDays.push(day.date);
      barsSeen += dayBarCount;
      continue;
    }
    tradingDays.push(day.date);
    const warm = d < WARMUP_DAYS;

    const di = dailyIndex.get(day.date);
    const prevDay = di !== undefined && di > 0 ? daily[di - 1] : prevDailyBefore(daily, day.date);
    const dAtr = dailyAtr.get(day.date) ?? null;

    let pending: Pending[] = [];
    let tradesToday = 0;

    for (let i = day.start; i <= day.end; i++) {
      const bar = bars[i];
      const minute = minuteOfDayOf(bar.t);
      barsSeen++;
      if (input.onProgress && barsSeen % yieldEvery === 0) await input.onProgress(barsSeen, bars.length);

      // 1. Fill pending stop orders on this bar.
      if (!pos && pending.length && minute < LAST_ENTRY_MIN && tradesToday < rule.maxTradesPerDay) {
        const fills = pending
          .map((o) => ({ o, px: stopFillPrice(o, bar) }))
          .filter((f): f is { o: Pending; px: number } => f.px !== null);
        if (fills.length) {
          // Both sides of an OCO touched in one bar: take the one nearer the open (it was reached first).
          fills.sort((a, b) => Math.abs(a.o.trigger! - bar.o) - Math.abs(b.o.trigger! - bar.o));
          const f = fills[0];
          pos = openPosition(f.o, f.px, slip, bar, i, day.date, true);
          if (pos) tradesToday++;
          pending = f.o.oco ? [] : pending.filter((p) => p !== f.o);
        }
      }
      // NEXT_BAR orders expire after the bar they were valid on.
      pending = pending.filter((p) => p.validity === 'DAY');

      // 2. Manage an open position on this bar.
      if (pos) {
        const managedFrom = pos.checkEntryBar ? pos.entryIndex : pos.entryIndex + 1;
        if (i >= managedFrom) {
          const exit = checkExit(pos, bar, slip, i === pos.entryIndex);
          if (exit) {
            trades.push(closeTrade(pos, exit.price, bar.t, exit.reason, exchange, lot, costModel));
            pos = null;
          } else if (minute >= TIME_EXIT_BAR_MIN || i === day.end) {
            const px = pos.side === 'LONG' ? bar.c - slip : bar.c + slip;
            trades.push(closeTrade(pos, px, endOf(bar), 'time', exchange, lot, costModel));
            pos = null;
            pending = [];
          }
        }
      }

      // 3. Ask the rule for new orders at the close of this bar.
      if (warm || i - 0 < WARMUP_BARS) continue;
      if (minute >= LAST_ENTRY_MIN || minute >= TIME_EXIT_BAR_MIN) {
        pending = [];
        continue;
      }
      if (tradesToday >= rule.maxTradesPerDay) continue;
      const orders = rule.onBarClose({
        bars,
        i,
        dayStart: day.start,
        minuteOfDay: minute,
        prevDay: prevDay ?? null,
        dailyAtr: dAtr,
        ema,
        atr5,
        tradesToday,
        random,
      });
      for (const o of orders) {
        if (o.kind === 'CLOSE') {
          if (pos) continue;
          pos = openPosition(o, o.side === 'LONG' ? bar.c + slip : bar.c - slip, 0, bar, i, day.date, false, endOf(bar));
          if (pos) tradesToday++;
        } else if (!pos) {
          // A newer order of the same rule replaces older one-bar orders (SP_5EMA alert replacement).
          if (o.validity !== 'DAY') pending = pending.filter((p) => p.validity === 'DAY');
          pending.push({ ...o, placedAt: i, day: day.date });
        }
      }
    }
    // Safety: never hold overnight.
    if (pos) {
      const last = bars[day.end];
      const px = pos.side === 'LONG' ? last.c - slip : last.c + slip;
      trades.push(closeTrade(pos, px, endOf(last), 'time', exchange, lot, costModel));
      pos = null;
    }
  }
  return { trades, tradingDays, gapDays };
}

function prevDailyBefore(daily: { date: string }[], date: string) {
  let found: any = null;
  for (const d of daily) {
    if (d.date < date) found = d;
    else break;
  }
  return found;
}

function endOf(bar: Bar): Date {
  return new Date(bar.t.getTime() + 5 * 60_000);
}

/** Stop entry fill: max(open, trigger) for longs, min(open, trigger) for shorts. Null if not touched. */
export function stopFillPrice(o: Order, bar: Bar): number | null {
  const trig = o.trigger!;
  if (o.side === 'LONG') return bar.h >= trig ? Math.max(bar.o, trig) : null;
  return bar.l <= trig ? Math.min(bar.o, trig) : null;
}

function openPosition(
  o: Order,
  rawFill: number,
  slip: number,
  bar: Bar,
  i: number,
  tradeDate: string,
  checkEntryBar: boolean,
  entryTime: Date = bar.t,
): Position | null {
  const entry = o.side === 'LONG' ? rawFill + slip : rawFill - slip;
  const stop = 'price' in o.stop ? o.stop.price : o.side === 'LONG' ? entry - o.stop.distance : entry + o.stop.distance;
  const risk = o.side === 'LONG' ? entry - stop : stop - entry;
  if (!(risk > 0)) return null; // slippage pushed the fill through the stop: no valid trade
  const target = o.side === 'LONG' ? entry + o.targetR * risk : entry - o.targetR * risk;
  return { side: o.side, entry, stop, target, risk, entryTime, entryIndex: i, checkEntryBar, tradeDate };
}

/** Stop first: if a bar touches both, it is a stop. Gaps through a level fill at the open. */
export function checkExit(
  pos: { side: Side; stop: number; target: number },
  bar: Bar,
  slip: number,
  isEntryBar: boolean,
): { price: number; reason: ExitReason } | null {
  if (pos.side === 'LONG') {
    const hitStop = bar.l <= pos.stop;
    const hitTarget = bar.h >= pos.target;
    if (hitStop) {
      const lvl = !isEntryBar && bar.o < pos.stop ? bar.o : pos.stop;
      return { price: lvl - slip, reason: 'stop' };
    }
    if (hitTarget) {
      const lvl = !isEntryBar && bar.o > pos.target ? bar.o : pos.target;
      return { price: lvl - slip, reason: 'target' };
    }
  } else {
    const hitStop = bar.h >= pos.stop;
    const hitTarget = bar.l <= pos.target;
    if (hitStop) {
      const lvl = !isEntryBar && bar.o > pos.stop ? bar.o : pos.stop;
      return { price: lvl + slip, reason: 'stop' };
    }
    if (hitTarget) {
      const lvl = !isEntryBar && bar.o < pos.target ? bar.o : pos.target;
      return { price: lvl + slip, reason: 'target' };
    }
  }
  return null;
}

function closeTrade(
  pos: Position,
  exit: number,
  exitTime: Date,
  reason: ExitReason,
  exchange: Exchange,
  lot: number,
  model: CostModel,
): SimTrade {
  const pnlPoints = pos.side === 'LONG' ? exit - pos.entry : pos.entry - exit;
  const rGross = pnlPoints / pos.risk;
  const buy = pos.side === 'LONG' ? pos.entry : exit;
  const sell = pos.side === 'LONG' ? exit : pos.entry;
  const costR = costInR(roundTripCharges(model, exchange, buy, sell, lot), pos.risk, lot);
  return {
    tradeDate: pos.tradeDate,
    side: pos.side,
    entryTime: pos.entryTime,
    entry: round(pos.entry),
    stop: round(pos.stop),
    target: round(pos.target),
    exitTime,
    exit: round(exit),
    exitReason: reason,
    rGross: round4(rGross),
    costR: round4(costR),
    rNet: round4(rGross - costR),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

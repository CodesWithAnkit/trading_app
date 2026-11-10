// spec 0023: the live guru engine core. Pure of Nest and the database: it is fed closed 5m bars and
// ticks, asks the same guru rule functions as the backtest, and reports fills through `onFill`.
import { Bar, DailyBar, GuruRule, istDate, minuteOfDayOf, Order, ruleById, emaSet, priorDayAtrByDate, wilderAtr } from '../strategy/guru/index.js';
import { openPosition, Position } from '../../backtest/engine/fills.js';
import { LAST_ENTRY_MIN, WARMUP_BARS } from '../../backtest/engine/simulate.js';

/** Rules that read daily context (previous day levels or daily ATR) need it before they can run. */
const NEEDS_DAILY = new Set(['GJ_PDHL', 'UP_ORB']);
const MIN_DAILY_FOR_ATR = 15;
const MAX_BARS = 400;

export type Fill = { ruleId: string; symbol: string; position: Position; at: Date };

type Pending = { ruleId: string; order: Order; validUntil: number | 'DAY'; day: string };

export type EngineHooks = {
  /** Which rules are live for a symbol right now (toggle on and gate passing). */
  liveRules: (symbol: string) => string[];
  /** True while that rule already has an open plan on this symbol. */
  hasOpenPlan: (symbol: string, ruleId: string) => boolean;
  onFill: (fill: Fill) => void;
  onWarming: (ruleId: string, symbol: string, reason: string | null) => void;
};

export class GuruLiveEngine {
  private readonly bars = new Map<string, Bar[]>();
  private readonly daily = new Map<string, DailyBar[]>();
  private readonly pending = new Map<string, Pending[]>();
  private readonly tradesToday = new Map<string, number>(); // `${day}|${symbol}|${ruleId}`

  constructor(private readonly hooks: EngineHooks) {}

  /** Warm up from stored candles (AC-3). Daily bars are filled from 5m for days with no 1d row. */
  seed(symbol: string, bars5m: Bar[], daily1d: DailyBar[]) {
    this.bars.set(symbol, bars5m.slice(-MAX_BARS));
    this.daily.set(symbol, mergeDaily(daily1d, bars5m));
  }

  isSeeded(symbol: string) {
    return this.bars.has(symbol);
  }

  /** A closed 5m bar (AC-2): expire last bar's one bar orders, then ask each live rule for new ones. */
  onBarClose(symbol: string, bar: Bar) {
    const bars = [...(this.bars.get(symbol) ?? []), bar].slice(-MAX_BARS);
    this.bars.set(symbol, bars);
    const day = istDate(bar.t);
    this.daily.set(symbol, mergeDaily(this.daily.get(symbol) ?? [], bars));

    const barEnd = bar.t.getTime() + 5 * 60_000;
    this.pending.set(
      symbol,
      (this.pending.get(symbol) ?? []).filter((p) => p.day === day && (p.validUntil === 'DAY' || p.validUntil > barEnd)),
    );

    const minute = minuteOfDayOf(bar.t);
    if (minute >= LAST_ENTRY_MIN) {
      this.pending.set(symbol, []);
      return;
    }
    const i = bars.length - 1;
    let dayStart = i;
    while (dayStart > 0 && istDate(bars[dayStart - 1].t) === day) dayStart--;
    const daily = this.daily.get(symbol) ?? [];
    const prevDay = [...daily].reverse().find((d) => d.date < day) ?? null;
    const dailyAtr = priorDayAtrByDate(daily).get(day) ?? null;
    const ema = emaSet(bars);
    const atr5 = wilderAtr(bars, 14);

    for (const ruleId of this.hooks.liveRules(symbol)) {
      const rule = ruleById(ruleId) as GuruRule | undefined;
      if (!rule) continue;
      const warming = warmingReason(rule.id, bars.length, daily.filter((d) => d.date < day).length);
      this.hooks.onWarming(rule.id, symbol, warming);
      if (warming) continue;
      const key = `${day}|${symbol}|${rule.id}`;
      const taken = this.tradesToday.get(key) ?? 0;
      if (taken >= rule.maxTradesPerDay || this.hooks.hasOpenPlan(symbol, rule.id)) continue;

      const orders = rule.onBarClose({ bars, i, dayStart, minuteOfDay: minute, prevDay, dailyAtr, ema, atr5, tradesToday: taken, random: Math.random });
      const keep = (this.pending.get(symbol) ?? []).filter((p) => p.ruleId !== rule.id || p.validUntil === 'DAY');
      for (const o of orders) {
        if (o.kind === 'CLOSE') {
          this.fill(symbol, rule.id, o, bar.c, new Date(barEnd), false);
          break;
        }
        keep.push({ ruleId: rule.id, order: o, validUntil: o.validity === 'DAY' ? 'DAY' : barEnd + 5 * 60_000, day });
      }
      this.pending.set(symbol, keep);
    }
  }

  /** Every tick (AC-4): fire a pending stop only when price crosses its trigger. */
  onTick(symbol: string, price: number, at: Date) {
    const list = this.pending.get(symbol);
    if (!list?.length || minuteOfDayOf(at) >= LAST_ENTRY_MIN) return;
    for (const p of [...list]) {
      const trig = p.order.trigger!;
      const crossed = p.order.side === 'LONG' ? price >= trig : price <= trig;
      if (!crossed || this.hooks.hasOpenPlan(symbol, p.ruleId)) continue;
      const fillPx = p.order.side === 'LONG' ? Math.max(price, trig) : Math.min(price, trig);
      // Remove this order, and its OCO partner if any.
      this.pending.set(
        symbol,
        (this.pending.get(symbol) ?? []).filter((q) => q !== p && !(p.order.oco && q.ruleId === p.ruleId && q.order.oco === p.order.oco)),
      );
      this.fill(symbol, p.ruleId, p.order, fillPx, at, true);
    }
  }

  pendingFor(symbol: string) {
    return [...(this.pending.get(symbol) ?? [])];
  }

  private fill(symbol: string, ruleId: string, order: Order, rawPrice: number, at: Date, checkEntryBar: boolean) {
    // Live entries are real prices: slippage 0 (spec 0023 AC-4). Same stop and R multiple as the backtest.
    const bars = this.bars.get(symbol) ?? [];
    const bar = bars[bars.length - 1];
    const position = openPosition(order, rawPrice, 0, bar, bars.length - 1, istDate(at), checkEntryBar, at);
    if (!position) return;
    const key = `${istDate(at)}|${symbol}|${ruleId}`;
    this.tradesToday.set(key, (this.tradesToday.get(key) ?? 0) + 1);
    this.hooks.onFill({ ruleId, symbol, position, at });
  }
}

/** Why a rule can't run yet (AC-3), or null when warm up is met. */
export function warmingReason(ruleId: string, bars: number, priorDays: number): string | null {
  if (bars < WARMUP_BARS) return `Needs ${WARMUP_BARS} stored 5m bars, has ${bars}.`;
  if (NEEDS_DAILY.has(ruleId) && priorDays < MIN_DAILY_FOR_ATR) return `Needs ${MIN_DAILY_FOR_ATR} prior trading days for daily ATR, has ${priorDays}.`;
  return null;
}

/** 1d rows, plus a daily bar built from 5m for every day that has no 1d row. */
export function mergeDaily(daily: DailyBar[], bars: Bar[]): DailyBar[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const built = new Map<string, DailyBar>();
  for (const b of bars) {
    const date = istDate(b.t);
    if (byDate.has(date)) continue;
    const d = built.get(date);
    if (!d) built.set(date, { date, o: b.o, h: b.h, l: b.l, c: b.c });
    else Object.assign(d, { h: Math.max(d.h, b.h), l: Math.min(d.l, b.l), c: b.c });
  }
  return [...byDate.values(), ...built.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
}

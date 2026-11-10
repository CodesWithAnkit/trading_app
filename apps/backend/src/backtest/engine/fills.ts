// Shared fill and exit rules (spec 0023 AC-4): used by the backtest (slippage from the cost model)
// and the live guru engine (slippage 0, real prices). Changing these changes both.
import { Bar, Order, Side } from '../../scanner/strategy/guru/index.js';

export type Position = {
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

export type ExitReason = 'target' | 'stop' | 'time';

/** Stop entry fill: max(open, trigger) for longs, min(open, trigger) for shorts. Null if not touched. */
export function stopFillPrice(o: Order, bar: Bar): number | null {
  const trig = o.trigger!;
  if (o.side === 'LONG') return bar.h >= trig ? Math.max(bar.o, trig) : null;
  return bar.l <= trig ? Math.min(bar.o, trig) : null;
}

export function openPosition(
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

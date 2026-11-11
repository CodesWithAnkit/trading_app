/**
 * Spec 0028: turns a signal into "take N shares" or "skip, reason". Pure: the same
 * signal and context always give the same verdict (never reads or writes anything).
 */
import { referenceEntryOf } from '../scanner/signalMapper.js';

export type RiskLimits = {
  riskPerTrade: number;
  dailyLossLimit: number;
  maxOpenTrades: number;
  maxCapitalPerTrade: number;
};

export type RiskContext = {
  limits: RiskLimits;
  /** max(0, −net realized P&L of entries closed today in IST). */
  realizedLossToday: number;
  /** Sum of qty × |entry − stop| over PENDING entries. */
  openRisk: number;
  openCount: number;
  /** daily limit − realized loss − open risk (may be ≤ 0). */
  dailyRoom: number;
};

export type SkipReason =
  | 'STOP_INVALID'
  | 'MAX_OPEN_TRADES'
  | 'DAILY_LOSS_LIMIT'
  | 'STOP_TOO_WIDE'
  | 'CAPITAL_TOO_SMALL'
  | 'STOP_TOO_WIDE_FOR_ROOM';

export type RiskNote = 'CAPPED_BY_CAPITAL' | 'REDUCED_TO_ROOM';

export type RiskVerdict =
  | { verdict: 'TAKE'; qty: number; riskInr: number; notionalInr: number; notes: RiskNote[]; skipReason: null }
  | { verdict: 'SKIP'; qty: 0; riskInr: 0; notionalInr: 0; notes: []; skipReason: SkipReason };

export const DEFAULT_LIMITS: RiskLimits = {
  riskPerTrade: 1500,
  dailyLossLimit: 6000,
  maxOpenTrades: 3,
  maxCapitalPerTrade: 50000,
};

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const skip = (skipReason: SkipReason): RiskVerdict => ({ verdict: 'SKIP', qty: 0, riskInr: 0, notionalInr: 0, notes: [], skipReason });
const round2 = (v: number) => Math.round(v * 100) / 100;

/** AC-2 to AC-5, in the spec's skip order (first match wins). */
export function sizeSignal(signal: any, ctx: RiskContext): RiskVerdict {
  // (1) Stop validity, before any division. `stopOf` is not used: its fallback invents a stop.
  const entry = referenceEntryOf(signal);
  const stop = num(signal?.snapshot_json?.stop?.level);
  const isLong = signal?.direction !== 'SHORT';
  if (!(entry > 0) || stop === null) return skip('STOP_INVALID');
  const riskPerShare = Math.abs(entry - stop);
  if (riskPerShare === 0 || (isLong ? stop >= entry : stop <= entry)) return skip('STOP_INVALID');

  // (2) Open trade slots, (3) daily room.
  if (ctx.openCount >= ctx.limits.maxOpenTrades) return skip('MAX_OPEN_TRADES');
  if (ctx.dailyRoom <= 0) return skip('DAILY_LOSS_LIMIT');

  // (4) Base size from risk per trade.
  let qty = Math.floor(ctx.limits.riskPerTrade / riskPerShare);
  if (qty < 1) return skip('STOP_TOO_WIDE');

  // (5) Capital cap.
  const notes: RiskNote[] = [];
  if (qty * entry > ctx.limits.maxCapitalPerTrade) {
    qty = Math.floor(ctx.limits.maxCapitalPerTrade / entry);
    if (qty < 1) return skip('CAPITAL_TOO_SMALL');
    notes.push('CAPPED_BY_CAPITAL');
  }

  // (6) Fit inside today's remaining loss room.
  if (qty * riskPerShare > ctx.dailyRoom) {
    qty = Math.floor(ctx.dailyRoom / riskPerShare);
    if (qty < 1) return skip('STOP_TOO_WIDE_FOR_ROOM');
    notes.push('REDUCED_TO_ROOM');
  }

  return { verdict: 'TAKE', qty, riskInr: round2(qty * riskPerShare), notionalInr: round2(qty * entry), notes, skipReason: null };
}

export type JournalRow = {
  status: string;
  direction: string | null;
  quantity: number | null;
  entry_price: number | string;
  stop_price: number | string;
  realized_pnl: number | string | null;
  exit_at: string | null;
};

/** AC-4: builds the context from the user's journal rows and limits. Rows with no quantity count as ₹0. */
export function buildContext(limits: RiskLimits, openRows: JournalRow[], closedTodayRows: JournalRow[]): RiskContext {
  const net = closedTodayRows.reduce((a, r) => a + (num(r.realized_pnl) ?? 0), 0);
  const realizedLossToday = round2(Math.max(0, -net));
  const openRisk = round2(
    openRows.reduce((a, r) => {
      const q = num(r.quantity);
      const e = num(r.entry_price);
      const s = num(r.stop_price);
      return q && e !== null && s !== null ? a + q * Math.abs(e - s) : a;
    }, 0)
  );
  return {
    limits,
    realizedLossToday,
    openRisk,
    openCount: openRows.length,
    dailyRoom: round2(limits.dailyLossLimit - realizedLossToday - openRisk),
  };
}

/** AC-9: server side P&L for a close. */
export function realizedPnl(direction: 'LONG' | 'SHORT', entry: number, exit: number, qty: number): number {
  return round2((direction === 'SHORT' ? entry - exit : exit - entry) * qty);
}

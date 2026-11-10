// Spec 0025 live news gate: loads candidate items, calls the pure `evaluateNewsGate`, and
// writes the entry verdict (fixed at insert) or the after entry verdict (only escalates).
// Depends only on Supabase, so the scanner and the intelligence module can both use it; SSE
// goes out through the `publish` callback the caller passes (no module cycle).
import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service.js';
import {
  evaluateNewsGate,
  GATE_ITEM_COLUMNS,
  GATE_WINDOW_MS,
  GateItem,
  GateSide,
  GateVerdict,
  isIndexSymbol,
  rowToGateItem,
} from './news-gate.js';
import { istDate } from './news.text.js';
import { MARKET_SYMBOL } from './news.types.js';

export const NEWS_UNAVAILABLE = 'News unavailable';

export type NewsGateEvent = {
  type: 'signal:news-gate';
  data: {
    signalId: string;
    kind: 'entry' | 'after';
    gate: GateVerdict['result'];
    reason: string;
    items: GateVerdict['items'];
    marketWideOnly: boolean;
    checkedAt: string;
  };
};
export type Publish = (event: NewsGateEvent) => void;

/** The signal fields the gate reads. */
export type GateSignal = { id: string; symbol: string | null; direction: string | null; created_at: string };

/** Plain NSE symbol, the same form as `news_and_events.symbol` (`-EQ` stripped). */
export const plainSymbol = (symbol: string) => symbol.toUpperCase().replace(/-EQ$/, '');

const istMidnight = (at: Date) => new Date(`${istDate(at)}T00:00:00+05:30`);
const toSide = (direction: string | null): GateSide => (direction === 'LONG' || direction === 'SHORT' ? direction : null);

@Injectable()
export class NewsGateService {
  private readonly logger = new Logger(NewsGateService.name);
  /** Test seam. */
  now: () => Date = () => new Date();

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Items for `symbols` from the earlier of IST midnight and `at − 60 min`, up to `to`. The
   * whole IST day is loaded because the same day earnings rule needs it; the pure function
   * applies the 60 minute window itself.
   */
  private async loadItems(symbols: string[], at: Date, to: Date): Promise<GateItem[]> {
    const db = this.supabase.client;
    if (!db) throw new Error('Database is not configured');
    const from = new Date(Math.min(istMidnight(at).getTime(), at.getTime() - GATE_WINDOW_MS));
    const { data, error } = await db
      .from('news_and_events')
      .select(GATE_ITEM_COLUMNS)
      .eq('is_seed', false)
      .in('symbol', symbols)
      .gte('published_at', from.toISOString())
      .lte('published_at', to.toISOString());
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToGateItem);
  }

  /** Latest `finished_at` of a `done` or `partial` fetch run at or before `at`. */
  private async lastGoodFetchAt(at: Date): Promise<Date | null> {
    const db = this.supabase.client;
    if (!db) throw new Error('Database is not configured');
    const { data, error } = await db
      .from('news_fetch_runs')
      .select('finished_at')
      .in('status', ['done', 'partial'])
      .lte('finished_at', at.toISOString())
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.finished_at ? new Date(data.finished_at) : null;
  }

  private symbolsFor(symbol: string): string[] {
    return isIndexSymbol(symbol) ? [MARKET_SYMBOL] : [symbol, MARKET_SYMBOL];
  }

  /** AC-6: the `direction` of the symbol's latest ACTIVE signal created today (IST), else null. */
  async latestActiveSide(symbol: string, now: Date = this.now()): Promise<GateSide> {
    const db = this.supabase.client;
    if (!db) return null;
    const { data } = await db
      .from('signals')
      .select('direction, created_at')
      .eq('symbol', plainSymbol(symbol))
      .eq('status', 'ACTIVE')
      .gte('created_at', istMidnight(now).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return toSide(data?.direction ?? null);
  }

  /** Gate 06 and the entry check: the verdict for (symbol, side) at `at`, read only. */
  async evaluate(symbol: string, side: GateSide, at: Date): Promise<GateVerdict> {
    const plain = plainSymbol(symbol);
    const [items, lastGood] = await Promise.all([this.loadItems(this.symbolsFor(plain), at, at), this.lastGoodFetchAt(at)]);
    return evaluateNewsGate({ symbol: plain, side, at, lastGoodFetchAt: lastGood }, items);
  }

  /**
   * AC-1, AC-7: the entry verdict for a just inserted signal. Never throws and never blocks
   * the insert. Writes only when no real verdict exists yet ("News unavailable" is replaced).
   */
  async checkNewSignal(signal: GateSignal, publish?: Publish): Promise<GateVerdict | null> {
    const db = this.supabase.client;
    if (!db || !signal.symbol) return null;
    const at = new Date(signal.created_at);
    let verdict: GateVerdict;
    try {
      verdict = await this.evaluate(signal.symbol, toSide(signal.direction), at);
    } catch (err) {
      this.logger.warn(`News gate read failed for signal ${signal.id}: ${(err as Error).message}`);
      verdict = { result: 'warn', reason: NEWS_UNAVAILABLE, itemIds: [], items: [], marketWideOnly: false, ruleVersion: 'news-gate-v1' };
    }
    const checkedAt = this.now().toISOString();
    const { data, error } = await db
      .from('signals')
      .update({ news_gate: verdict.result, news_gate_reason: verdict.reason, news_gate_items: verdict.items, news_gate_checked_at: checkedAt })
      .eq('id', signal.id)
      .or(`news_gate.is.null,news_gate_reason.eq.${NEWS_UNAVAILABLE}`)
      .select('id');
    if (error) {
      this.logger.warn(`News gate write failed for signal ${signal.id}: ${error.message}`);
      return verdict;
    }
    if (data?.length) {
      publish?.({
        type: 'signal:news-gate',
        data: { signalId: signal.id, kind: 'entry', gate: verdict.result, reason: verdict.reason, items: verdict.items, marketWideOnly: verdict.marketWideOnly, checkedAt },
      });
    }
    return verdict;
  }

  /**
   * AC-3: after a new HIGH or MEDIUM item is stored, every ACTIVE signal created today whose
   * symbol matches (every ACTIVE signal for a MARKET item) gets an after entry check, counting
   * only items published after the signal. Escalation is one atomic SQL update per verdict.
   */
  async recheckForItem(item: { symbol: string; impactLevel: string }, publish?: Publish): Promise<number> {
    const db = this.supabase.client;
    if (!db || (item.impactLevel !== 'HIGH' && item.impactLevel !== 'MEDIUM')) return 0;
    const now = this.now();
    try {
      let query = db
        .from('signals')
        .select('id, symbol, direction, created_at')
        .eq('status', 'ACTIVE')
        .gte('created_at', istMidnight(now).toISOString())
        .not('symbol', 'is', null);
      if (item.symbol !== MARKET_SYMBOL) query = query.eq('symbol', item.symbol);
      const { data: signals, error } = await query;
      if (error) throw new Error(error.message);
      if (!signals?.length) return 0;

      const symbols = [...new Set(signals.flatMap(s => this.symbolsFor(s.symbol as string)))];
      const items = await this.loadItems(symbols, now, now);
      let escalated = 0;
      for (const s of signals as GateSignal[]) {
        const verdict = evaluateNewsGate(
          // A recheck is triggered by fresh news, so staleness does not apply here.
          { symbol: s.symbol as string, side: toSide(s.direction), at: now, lastGoodFetchAt: now, after: new Date(s.created_at), ignoreStaleness: true },
          items,
        );
        if (verdict.result === 'pass') continue;
        const checkedAt = now.toISOString();
        const { data: moved, error: rpcError } = await db.rpc('news_gate_escalate', {
          p_ids: [s.id],
          p_gate: verdict.result,
          p_reason: verdict.reason,
          p_items: verdict.items,
          p_checked_at: checkedAt,
        });
        if (rpcError) {
          this.logger.warn(`News gate escalation failed for signal ${s.id}: ${rpcError.message}`);
          continue;
        }
        if ((moved as unknown[] | null)?.length) {
          escalated++;
          publish?.({
            type: 'signal:news-gate',
            data: { signalId: s.id, kind: 'after', gate: verdict.result, reason: verdict.reason, items: verdict.items, marketWideOnly: verdict.marketWideOnly, checkedAt },
          });
        }
      }
      return escalated;
    } catch (err) {
      this.logger.warn(`News gate recheck failed for ${item.symbol}: ${(err as Error).message}`);
      return 0;
    }
  }
}

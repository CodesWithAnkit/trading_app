import { Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { FnoStock } from './instrumentFile.js';

export type WatchedStock = FnoStock;

export type UniverseStatus = {
  stocks: number;
  source: 'file' | 'fallback' | 'none' | null;
  loadedAt: string | null;
  error: string | null;
};

type Deps = {
  client: SupabaseClient | null;
  /** Downloads and parses Angel One's public instrument file. */
  download: () => Promise<{ stocks: FnoStock[]; skipped: string[]; nse: string[] }>;
  /** Subscribes tokens on the live feed (the provider merges, never replaces). */
  subscribe: (tokens: string[]) => Promise<void>;
  /** Called with stocks that just joined the universe, after they are subscribed. */
  onAdded: (stocks: WatchedStock[]) => Promise<void>;
};

/**
 * Today's watched stocks: every NSE stock with a stock future, from Angel One's public
 * instrument file (spec 0009 AC-12, AC-13). Stocks are only ever added during a session.
 */
export class UniverseService {
  private readonly logger = new Logger(UniverseService.name);
  private readonly tokenToSymbol = new Map<string, string>();
  private loading: Promise<void> | null = null;
  private status: UniverseStatus = { stocks: 0, source: null, loadedAt: null, error: null };

  private nseList: string[] = [];

  constructor(private readonly deps: Deps) {}

  resolveSymbol(token: string): string | undefined {
    return this.tokenToSymbol.get(token);
  }

  watching(): WatchedStock[] {
    return [...this.tokenToSymbol.entries()].map(([token, symbol]) => ({ symbol, token }));
  }

  getNseCashSymbols(): string[] {
    return this.nseList;
  }

  getStatus(): UniverseStatus {
    return { ...this.status, stocks: this.tokenToSymbol.size };
  }

  /** Loads the F&O list for `date` (IST). Concurrent calls share one run (startup vs 08:45). */
  load(date: string): Promise<void> {
    if (!this.loading) {
      this.loading = this.doLoad(date).finally(() => {
        this.loading = null;
      });
    }
    return this.loading;
  }

  /** New day: forget the universe; the socket keeps yesterday's tokens until they are re-registered. */
  reset() {
    this.tokenToSymbol.clear();
    this.nseList = [];
    this.status = { stocks: 0, source: null, loadedAt: null, error: null };
  }

  private async doLoad(date: string) {
    let stocks: FnoStock[];
    try {
      const parsed = await this.deps.download();
      if (parsed.stocks.length === 0) throw new Error('Instrument file listed no F&O stocks');
      if (parsed.skipped.length > 0) this.logger.warn(`No single NSE -EQ row for: ${parsed.skipped.join(', ')}`);
      stocks = parsed.stocks;
      this.nseList = parsed.nse;
      await this.save(stocks, date);
      this.status.source = 'file';
      this.status.error = null;
    } catch (err: any) {
      this.status.error = err.message;
      stocks = await this.lastSavedList();
      this.nseList = [];
      this.status.source = stocks.length > 0 ? 'fallback' : 'none';
      this.logger.warn(`${err.message}; streaming ${stocks.length} stock(s) from the last saved list.`);
    }

    const added = await this.admit(stocks);
    this.status.loadedAt = new Date().toISOString();
    this.logger.log(`Universe: ${this.tokenToSymbol.size} F&O stock(s) watched (${added.length} new, source ${this.status.source}).`);
  }

  /** Registers symbols before subscribing, so no tick ever arrives unnamed. */
  private async admit(stocks: WatchedStock[]): Promise<WatchedStock[]> {
    const fresh = stocks.filter(s => !this.tokenToSymbol.has(s.token));
    if (fresh.length === 0) return [];
    for (const s of fresh) this.tokenToSymbol.set(s.token, s.symbol);
    await this.deps.subscribe(fresh.map(s => s.token));
    await this.deps.onAdded(fresh);
    return fresh;
  }

  private async save(stocks: FnoStock[], date: string) {
    if (!this.deps.client) return;
    const { error } = await this.deps.client.from('instruments').upsert(
      stocks.map(s => ({ symbol: s.symbol, exchange: 'NSE', instrument_token: s.token, status: 'ACTIVE', last_selected_on: date })),
      { onConflict: 'instrument_token' }
    );
    if (error) this.logger.error(`Failed to save the F&O list: ${error.message}`);
  }

  /** The rows saved on the most recent day a list was loaded. */
  private async lastSavedList(): Promise<FnoStock[]> {
    if (!this.deps.client) return [];
    const { data: latest } = await this.deps.client
      .from('instruments')
      .select('last_selected_on')
      .not('last_selected_on', 'is', null)
      .order('last_selected_on', { ascending: false })
      .limit(1);
    const day = latest?.[0]?.last_selected_on;
    if (!day) return [];
    const { data } = await this.deps.client
      .from('instruments')
      .select('symbol, instrument_token')
      .eq('last_selected_on', day);
    return (data || []).map(r => ({ symbol: r.symbol as string, token: r.instrument_token as string }));
  }
}

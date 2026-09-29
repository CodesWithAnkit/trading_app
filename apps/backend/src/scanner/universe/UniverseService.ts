import { Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MarketDataRestClient } from '../market-data/types.js';
import { extractGainerSymbols, pickEquityToken } from './gainers.js';

export type WatchedStock = { symbol: string; token: string };

export type UniverseStatus = {
  gainers: number;
  lastRefreshAt: string | null;
  lastRefreshError: string | null;
  nextRefreshAt: string | null;
};

type Deps = {
  client: SupabaseClient | null;
  rest: MarketDataRestClient;
  /** Subscribes tokens on the live feed (the provider merges, never replaces). */
  subscribe: (tokens: string[]) => Promise<void>;
  /** Called with stocks that just joined the universe, after they are subscribed. */
  onAdded: (stocks: WatchedStock[]) => Promise<void>;
};

/**
 * Today's watched stocks: Angel One F&O price gainers mapped to NSE cash stocks, top
 * gainers only (spec 0009 AC-1, AC-12, AC-13). Add only during a session; tokens are
 * cached in `instruments`.
 */
export class UniverseService {
  private readonly logger = new Logger(UniverseService.name);
  private readonly tokenToSymbol = new Map<string, string>();
  private readonly symbolToToken = new Map<string, string>();
  /** Symbols with no single exact `-EQ` match; not looked up again until the daily reset. */
  private readonly unresolved = new Set<string>();
  private refreshing = false;
  private status: UniverseStatus = { gainers: 0, lastRefreshAt: null, lastRefreshError: null, nextRefreshAt: null };

  constructor(private readonly deps: Deps) {}

  resolveSymbol(token: string): string | undefined {
    return this.tokenToSymbol.get(token);
  }

  watching(): WatchedStock[] {
    return [...this.tokenToSymbol.entries()].map(([token, symbol]) => ({ symbol, token }));
  }

  getStatus(): UniverseStatus {
    return { ...this.status, gainers: this.tokenToSymbol.size };
  }

  setNextRefreshAt(at: Date | null) {
    this.status.nextRefreshAt = at ? at.toISOString() : null;
  }

  /** Re-subscribes the stocks already selected today, after a restart mid session. */
  async restoreToday(date: string): Promise<WatchedStock[]> {
    if (!this.deps.client) return [];
    const { data, error } = await this.deps.client
      .from('instruments')
      .select('symbol, instrument_token')
      .eq('last_selected_on', date);
    if (error) throw new Error(`Failed to load today's universe: ${error.message}`);

    const stocks = (data || []).map(r => ({ symbol: r.symbol as string, token: r.instrument_token as string }));
    return this.admit(stocks);
  }

  /**
   * Pulls the gainers and adds any new stock. An empty or failed pull is an error:
   * nothing is stamped and nothing is dropped. Returns null if a refresh is already running.
   */
  async refresh(date: string): Promise<{ added: WatchedStock[] } | null> {
    if (this.refreshing) return null;
    this.refreshing = true;
    try {
      const rows = await this.deps.rest.fetchFnoPriceGainers();
      const { symbols, skipped } = extractGainerSymbols(rows);
      if (skipped.length > 0) this.logger.warn(`Skipped unparseable gainer rows: ${skipped.join(', ')}`);
      if (symbols.length === 0) throw new Error('Gainers list came back empty');

      const resolved: WatchedStock[] = [];
      for (const symbol of symbols) {
        const token = await this.resolveToken(symbol);
        if (token) resolved.push({ symbol, token });
      }
      await this.stamp(resolved, date);

      const added = await this.admit(resolved);
      this.status.lastRefreshAt = new Date().toISOString();
      this.status.lastRefreshError = null;
      this.logger.log(`Universe refresh: ${symbols.length} gainer(s), ${added.length} new, ${this.tokenToSymbol.size} watched.`);
      return { added };
    } catch (err: any) {
      this.status.lastRefreshError = err.message;
      this.logger.warn(`Universe refresh failed, keeping ${this.tokenToSymbol.size} watched stock(s): ${err.message}`);
      throw err;
    } finally {
      this.refreshing = false;
    }
  }

  /** New day: forget the universe and the skip list. Subscriptions on the socket stay until restart. */
  reset() {
    this.tokenToSymbol.clear();
    this.symbolToToken.clear();
    this.unresolved.clear();
    this.status = { gainers: 0, lastRefreshAt: null, lastRefreshError: null, nextRefreshAt: this.status.nextRefreshAt };
  }

  /** Registers symbols before subscribing, so no tick ever arrives unnamed. */
  private async admit(stocks: WatchedStock[]): Promise<WatchedStock[]> {
    const fresh = stocks.filter(s => !this.tokenToSymbol.has(s.token));
    if (fresh.length === 0) return [];
    for (const s of fresh) {
      this.tokenToSymbol.set(s.token, s.symbol);
      this.symbolToToken.set(s.symbol, s.token);
    }
    await this.deps.subscribe(fresh.map(s => s.token));
    await this.deps.onAdded(fresh);
    return fresh;
  }

  private async resolveToken(symbol: string): Promise<string | null> {
    const known = this.symbolToToken.get(symbol);
    if (known) return known;
    if (this.unresolved.has(symbol)) return null;

    if (this.deps.client) {
      const { data } = await this.deps.client
        .from('instruments')
        .select('instrument_token')
        .eq('symbol', symbol)
        .eq('exchange', 'NSE')
        .limit(1);
      if (data?.[0]?.instrument_token) return data[0].instrument_token as string;
    }

    try {
      const token = pickEquityToken(await this.deps.rest.searchScrip(symbol), symbol);
      if (token) return token;
      this.logger.warn(`No single exact ${symbol}-EQ match on NSE; skipping ${symbol} for today.`);
    } catch (err: any) {
      this.logger.warn(`searchScrip failed for ${symbol}: ${err.message}; skipping for today.`);
    }
    this.unresolved.add(symbol);
    return null;
  }

  /** Upserts every returned stock with today's date, including ones already known (spec 0009 invariant). */
  private async stamp(stocks: WatchedStock[], date: string) {
    if (!this.deps.client || stocks.length === 0) return;
    const { error } = await this.deps.client.from('instruments').upsert(
      stocks.map(s => ({ symbol: s.symbol, exchange: 'NSE', instrument_token: s.token, status: 'ACTIVE', last_selected_on: date })),
      { onConflict: 'instrument_token' }
    );
    if (error) throw new Error(`Failed to save universe: ${error.message}`);
  }
}

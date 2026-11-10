import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { NewsFilingItemContract, NewsFilingsResponseContract } from './contracts/intelligence.contract.js';
import { rowToNewsItem } from './news/news.mapping.js';
import { MARKET_SYMBOL } from './news/news.types.js';

/**
 * Reads stored real news (spec 0024 AC-7). Never invents items: with nothing stored it
 * returns an empty list. Ingestion lives in `news/news-ingestion.service.ts`.
 */
@Injectable()
export class OfficialFilingsAndNewsService {
  private readonly logger = new Logger(OfficialFilingsAndNewsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Newest first. A symbol view also includes market wide (`MARKET`) items. */
  async getNews(symbol?: string): Promise<NewsFilingsResponseContract> {
    const uppercaseSymbol = symbol ? symbol.toUpperCase() : undefined;
    let events: NewsFilingItemContract[] = [];

    if (this.supabase.client) {
      try {
        let query = this.supabase.client
          .from('news_and_events')
          .select('*')
          .eq('is_seed', false)
          .not('source_item_id', 'is', null)
          .order('published_at', { ascending: false })
          .limit(100);
        if (uppercaseSymbol && uppercaseSymbol !== MARKET_SYMBOL) {
          query = query.in('symbol', [uppercaseSymbol, MARKET_SYMBOL]);
        } else if (uppercaseSymbol) {
          query = query.eq('symbol', MARKET_SYMBOL);
        }
        const { data, error } = await query;
        if (error) throw error;
        events = (data ?? []).map(rowToNewsItem);
      } catch (err: any) {
        this.logger.warn(`Failed reading news from Supabase: ${err?.message || err}`);
      }
    }

    return {
      events,
      totalCount: events.length,
      officialCount: events.filter(e => e.isOfficialFiling).length,
      highImpactCount: events.filter(e => e.impactLevel === 'HIGH').length,
      lastIngestionAt: events.length ? events.reduce((a, e) => (e.ingestedAt > a ? e.ingestedAt : a), events[0].ingestedAt) : '',
    };
  }
}

// Spec 0024: real news ingestion. One fetch run at a time, triggered by the API button
// (AC-1) or the weekday schedule (AC-2). Each source runs on its own (AC-3), items map to
// the watched universe (AC-4), are stored once (AC-5), and classified (AC-6).
import { ConflictException, HttpException, Injectable, Logger, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { NewsGateService } from './news-gate.service.js';
import { Cron } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service.js';
import { ScannerService } from '../../scanner/scanner.service.js';
import {
  ExchangeKey,
  FeedReader,
  feedList,
  fetchAlphaVantage,
  parseExchangeRss,
  parseRss,
  readFeedSource,
  rssFeeds,
  rssPublisher,
  SKIP,
  SourceOutcome,
} from './news.adapters.js';
import { classify, createGeminiCall, GEMINI_DAILY_CAP, GeminiCall } from './news.classifier.js';
import { buildUniverse, CompanyNames, InstrumentDirectory, loadCompanyNames, loadDirectory, mapSymbol, WatchedUniverse } from './news.symbols.js';
import { istDate, istMinutes, truncate } from './news.text.js';
import {
  EXCERPT_LIMIT,
  FetchRunContract,
  NewsSourceKey,
  RAW_EXCERPT_LIMIT,
  RawNewsItem,
  RunStatus,
  SourceResult,
} from './news.types.js';
import { rowToNewsItem } from './news.mapping.js';

export const MANUAL_COOLDOWN_MS = 60_000;
export const STALE_RUN_MS = 10 * 60_000;
export const AV_MIN_INTERVAL_MS = 30 * 60_000;
export const PRUNE_AFTER_DAYS = 30;
const AV_ENDPOINT = 'https://www.alphavantage.co/query';
const DAY_MS = 24 * 60 * 60_000;
const SCHEDULE_START_MIN = 8 * 60 + 30;
/** How often a running fetch looks for a cancel request. */
const CANCEL_POLL_MS = 1_000;

export type ScheduleState = { paused: boolean; pausedAt: string | null };

type RunContext = { id: string; trigger: 'manual' | 'schedule'; startedAt: Date };

/** A source loader: returns its outcome, or throws to record an error for that source only. */
type Loader = () => Promise<Pick<SourceOutcome, 'items'> & Partial<SourceOutcome>>;

const EXCHANGE_FEED_ENV: Record<ExchangeKey, string> = { nse: 'NEWS_NSE_FEED_URLS', bse: 'NEWS_BSE_FEED_URLS' };

@Injectable()
export class NewsIngestionService {
  private readonly logger = new Logger(NewsIngestionService.name);
  private gemini: GeminiCall | null | undefined;
  /** Test seam: overrides the network bound pieces. */
  deps: {
    fetchImpl: typeof fetch;
    loadDirectory: (today: string) => Promise<InstrumentDirectory>;
    now: () => Date;
    companyNames: () => CompanyNames;
  } = {
    fetchImpl: fetch,
    loadDirectory: today => loadDirectory(today),
    now: () => new Date(),
    companyNames: () => loadCompanyNames(msg => this.logger.warn(msg)),
  };
  /** Keeps ETag / Last-Modified and the 6 hour block memory per feed, for the life of the process. */
  private readonly feeds = new FeedReader(() => this.deps.fetchImpl, () => this.deps.now());

  constructor(
    private readonly supabase: SupabaseService,
    private readonly scanner: ScannerService,
    @Optional() private readonly newsGate?: NewsGateService,
  ) {}

  setGemini(call: GeminiCall | null) {
    this.gemini = call;
  }

  private geminiCall(): GeminiCall | null {
    if (this.gemini === undefined) {
      const key = process.env.GEMINI_API_KEY;
      this.gemini = key ? createGeminiCall(key) : null;
    }
    return this.gemini;
  }

  private get db() {
    const client = this.supabase.client;
    if (!client) throw new ServiceUnavailableException('Database is not configured');
    return client;
  }

  // ---------- triggers ----------

  /** AC-1: manual fetch. 429 within the cooldown; an overlapping call returns the running run. */
  async requestManualFetch(userId: string | null): Promise<{ runId: string; status: RunStatus }> {
    const now = this.deps.now();
    const { data: lastManual } = await this.db
      .from('news_fetch_runs')
      .select('started_at')
      .eq('trigger', 'manual')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastManual) {
      const elapsed = now.getTime() - new Date(lastManual.started_at).getTime();
      if (elapsed < MANUAL_COOLDOWN_MS) {
        const retryAfter = Math.ceil((MANUAL_COOLDOWN_MS - elapsed) / 1000);
        throw new HttpException({ statusCode: 429, message: `Please wait ${retryAfter}s before fetching again`, retryAfter }, 429);
      }
    }
    const started = await this.startRun('manual', userId);
    return started;
  }

  /** AC-2: every 5 minutes, Monday to Friday, 08:30 to 16:00 IST. */
  @Cron('*/5 8-15 * * 1-5', { name: 'news-fetch', timeZone: 'Asia/Kolkata' })
  async scheduledFetch() {
    if (istMinutes(this.deps.now()) < SCHEDULE_START_MIN) return;
    await this.runScheduled();
  }

  @Cron('0 16 * * 1-5', { name: 'news-fetch-close', timeZone: 'Asia/Kolkata' })
  async closingFetch() {
    await this.runScheduled();
  }

  private async runScheduled() {
    if (!this.supabase.client) return;
    try {
      if ((await this.getSchedule()).paused) return;
      const run = await this.startRun('schedule', null);
      if (!run.started) this.logger.debug('News fetch tick skipped: a run is already going');
    } catch (err) {
      this.logger.warn(`Scheduled news fetch failed to start: ${(err as Error).message}`);
    }
  }

  // ---------- admin controls (0024 AC-10, AC-11) ----------

  /** AC-10: asks a running fetch to stop before its next item. */
  async cancelRun(runId: string): Promise<{ runId: string; status: RunStatus }> {
    const { data: run } = await this.db.from('news_fetch_runs').select('id, status').eq('id', runId).maybeSingle();
    if (!run) throw new NotFoundException('Fetch run not found');
    if (run.status !== 'running') throw new ConflictException(`Fetch run is ${run.status}, not running`);
    await this.db
      .from('news_fetch_runs')
      .update({ cancel_requested_at: this.deps.now().toISOString() })
      .eq('id', runId)
      .eq('status', 'running');
    return { runId, status: 'running' };
  }

  /** AC-11: the saved schedule pause (single settings row). */
  async getSchedule(): Promise<ScheduleState> {
    const { data } = await this.db.from('news_ingestion_settings').select('schedule_paused, paused_at').eq('id', 1).maybeSingle();
    return { paused: data?.schedule_paused ?? false, pausedAt: data?.paused_at ?? null };
  }

  async setSchedule(paused: boolean, userId: string | null): Promise<ScheduleState> {
    const pausedAt = paused ? this.deps.now().toISOString() : null;
    const { error } = await this.db
      .from('news_ingestion_settings')
      .upsert({ id: 1, schedule_paused: paused, paused_by: paused ? userId : null, paused_at: pausedAt });
    if (error) throw new ServiceUnavailableException(`Could not save the schedule: ${error.message}`);
    return { paused, pausedAt };
  }

  /** Deletes LOW and MEDIUM items older than 30 days, daily at 16:30 IST; HIGH items are kept for good (spec 0025). */
  @Cron('30 16 * * *', { name: 'news-prune', timeZone: 'Asia/Kolkata' })
  async prune() {
    if (!this.supabase.client) return;
    const cutoff = new Date(this.deps.now().getTime() - PRUNE_AFTER_DAYS * DAY_MS).toISOString();
    const { error } = await this.supabase.client.from('news_and_events').delete().lt('published_at', cutoff).neq('impact_level', 'HIGH');
    if (error) this.logger.warn(`News prune failed: ${error.message}`);
  }

  // ---------- runs ----------

  /**
   * Opens a run unless one is already going (the partial unique index enforces one).
   * A run still `running` after 10 minutes is marked failed first.
   */
  async startRun(trigger: 'manual' | 'schedule', userId: string | null): Promise<{ runId: string; status: RunStatus; started: boolean }> {
    const now = this.deps.now();
    await this.db
      .from('news_fetch_runs')
      .update({ status: 'failed', finished_at: now.toISOString() })
      .eq('status', 'running')
      .lt('started_at', new Date(now.getTime() - STALE_RUN_MS).toISOString());

    const { data, error } = await this.db
      .from('news_fetch_runs')
      .insert({ trigger, requested_by: userId, started_at: now.toISOString(), status: 'running' })
      .select('id')
      .single();
    if (error) {
      if (error.code === '23505') {
        const { data: running } = await this.db.from('news_fetch_runs').select('id').eq('status', 'running').maybeSingle();
        if (running) return { runId: running.id, status: 'running', started: false };
      }
      throw new ServiceUnavailableException(`Could not start a news fetch: ${error.message}`);
    }

    const ctx: RunContext = { id: data.id, trigger, startedAt: now };
    void this.execute(ctx).catch(err => this.logger.error(`News fetch ${ctx.id} crashed: ${(err as Error).message}`));
    return { runId: data.id, status: 'running', started: true };
  }

  /** Runs every source independently, then closes the run with its per source result. */
  async execute(ctx: RunContext): Promise<FetchRunContract['status']> {
    const now = this.deps.now();
    const toDate = istDate(now);
    const fetchImpl = this.deps.fetchImpl;
    const manual = { manual: ctx.trigger === 'manual' };

    let dirPromise: Promise<InstrumentDirectory> | null = null;
    const directory = () => (dirPromise ??= this.deps.loadDirectory(toDate));
    // Spec 0024 Source queries: feeds return their latest items, so the lookback filters on pubDate.
    const cutoff = now.getTime() - (ctx.trigger === 'manual' ? 2 : 1) * DAY_MS;
    let universe: WatchedUniverse;
    try {
      universe = await this.loadUniverse(directory);
    } catch (err) {
      // Close the run now instead of leaving it `running` until the 10 minute stale rule.
      this.logger.error(`News fetch ${ctx.id} could not start its sources: ${(err as Error).message}`);
      await this.db.from('news_fetch_runs').update({ status: 'failed', finished_at: this.deps.now().toISOString() }).eq('id', ctx.id);
      return 'failed';
    }
    let geminiCalls = 0;

    const exchange = (key: ExchangeKey): Loader => () =>
      readFeedSource(this.feeds, feedList(process.env[EXCHANGE_FEED_ENV[key]]), xml => parseExchangeRss(xml, key), manual);
    const loaders: Record<NewsSourceKey, Loader> = {
      nse: exchange('nse'),
      bse: exchange('bse'),
      rss: () => readFeedSource(this.feeds, rssFeeds(process.env.NEWS_RSS_FEEDS), (xml, url) => parseRss(xml, rssPublisher(url)), manual),
      alphavantage: async () => {
        if (process.env.NEWS_ALPHAVANTAGE_ENABLED !== 'true') return { items: [], status: 'skipped', skipped: SKIP.disabled };
        const avKey = process.env.ALPHA_VANTAGE_API_KEY;
        if (!avKey) return { items: [], status: 'skipped', skipped: SKIP.noKey };
        const last = await this.lastAlphaVantageCall();
        // Within 30 minutes of the last good call: nothing to do this run, not an error.
        if (last && now.getTime() - last.getTime() < AV_MIN_INTERVAL_MS) return { items: [], status: 'ok' };
        const res = await fetchAlphaVantage(avKey, [...universe.symbols].sort(), last, fetchImpl);
        const feeds = [{ url: AV_ENDPOINT, status: res.skipped ? ('skipped' as const) : ('ok' as const), reason: res.skipped ?? null }];
        return res.skipped ? { items: [], status: 'skipped', skipped: res.skipped, feeds } : { items: res.items, status: 'ok', feeds };
      },
    };

    // AC-10: a cancel request is read at most once per second, shared by all sources.
    let cancelled = false;
    let lastCancelCheck = 0;
    const isCancelled = async () => {
      if (cancelled) return true;
      const t = Date.now();
      if (t - lastCancelCheck < CANCEL_POLL_MS) return false;
      lastCancelCheck = t;
      const { data } = await this.db.from('news_fetch_runs').select('cancel_requested_at').eq('id', ctx.id).maybeSingle();
      cancelled = Boolean(data?.cancel_requested_at);
      return cancelled;
    };

    const perSource: Partial<Record<NewsSourceKey, SourceResult>> = {};
    await Promise.all(
      (Object.keys(loaders) as NewsSourceKey[]).map(async key => {
        const result: SourceResult = { status: 'ok', fetched: 0, kept: 0, new: 0, error: null, skipped: null, feeds: [] };
        perSource[key] = result;
        try {
          if (await isCancelled()) return;
          const loaded = await loaders[key]();
          result.status = loaded.status ?? 'ok';
          result.error = loaded.error ?? null;
          result.skipped = loaded.skipped ?? null;
          result.feeds = loaded.feeds ?? [];
          result.fetched = loaded.items.length;
          const dir = key === 'bse' ? await directory() : null;
          let stoppedEarly = false;
          for (const item of loaded.items) {
            if (await isCancelled()) {
              stoppedEarly = true;
              break;
            }
            if (new Date(item.publishedAt).getTime() < cutoff) continue;
            const symbol = mapSymbol(item, universe, dir ?? { bseToNse: {}, fno: [] });
            if (!symbol) continue;
            result.kept++;
            const stored = await this.storeItem(ctx, item, symbol, () => geminiCalls++);
            if (stored) result.new++;
          }
          // Only now is it safe to send If-None-Match next time: every item was stored.
          if (!stoppedEarly) loaded.commit?.();
        } catch (err) {
          result.status = 'error';
          result.error = (err as Error).message || String(err);
          this.logger.warn(`News source ${key} failed: ${result.error}`);
        }
      }),
    );

    // Skipped sources never count toward partial or failed (AC-12).
    const attempted = Object.values(perSource).filter(r => r && r.status !== 'skipped');
    const failed = attempted.filter(r => r?.status === 'error');
    const status: RunStatus = cancelled || (await isCancelled())
      ? 'cancelled'
      : failed.length === 0 ? 'done' : failed.length === attempted.length ? 'failed' : 'partial';
    await this.db
      .from('news_fetch_runs')
      .update({ status, finished_at: this.deps.now().toISOString(), per_source: perSource, gemini_calls: geminiCalls })
      .eq('id', ctx.id);
    return status;
  }

  /** Inserts once by (source, source_item_id); only a new row is classified and pushed. */
  private async storeItem(ctx: RunContext, item: RawNewsItem, symbol: string, countGemini: () => void): Promise<boolean> {
    const excerpt = truncate(item.text || item.headline, EXCERPT_LIMIT);
    const { data, error } = await this.db
      .from('news_and_events')
      .upsert(
        {
          symbol,
          headline: truncate(item.headline, 500),
          excerpt,
          raw_excerpt: truncate(item.text, RAW_EXCERPT_LIMIT),
          source: item.source,
          source_item_id: item.sourceItemId,
          source_url: item.url ?? null,
          published_at: item.publishedAt,
          event_type: item.isOfficialFiling ? 'OFFICIAL_FILING' : 'GENERAL_NEWS',
          impact_level: 'LOW',
          direction: 'NEUTRAL',
          confidence: 0.3,
          is_official_filing: item.isOfficialFiling,
          classified_by: 'default',
          fetch_run_id: ctx.id,
        },
        { onConflict: 'source,source_item_id', ignoreDuplicates: true },
      )
      .select('id');
    if (error) throw new Error(`store failed: ${error.message}`);
    const id = data?.[0]?.id as string | undefined;
    if (!id) return false;

    const verdict = await classify(
      { headline: item.headline, excerpt, symbol, category: item.category, isOfficialFiling: item.isOfficialFiling },
      this.geminiCall(),
      () => this.takeGeminiBudget(),
    );
    if (verdict.usedGemini) countGemini();
    const saveVerdict = () =>
      this.db
        .from('news_and_events')
        .update({
          event_type: verdict.eventType,
          impact_level: verdict.impactLevel,
          direction: verdict.direction,
          confidence: verdict.confidence,
          classified_by: verdict.classifiedBy,
          rules_version: verdict.rulesVersion,
        })
        .eq('id', id)
        .select('*')
        .single();
    // One retry: a transient network error here would otherwise leave the item
    // Unclassified and skip its live push, after a Gemini call was already spent.
    let { data: updated, error: updateError } = await saveVerdict();
    if (updateError) ({ data: updated, error: updateError } = await saveVerdict());
    if (updateError) this.logger.warn(`Classification update failed for ${id}: ${updateError.message}`);
    if (updated) this.scanner.events$.next({ type: 'intelligence:news', data: rowToNewsItem(updated) });
    // Spec 0025 AC-3: a new HIGH or MEDIUM item re-checks today's ACTIVE signals (after entry verdict).
    if (!updateError && (verdict.impactLevel === 'HIGH' || verdict.impactLevel === 'MEDIUM')) {
      void this.newsGate?.recheckForItem({ symbol, impactLevel: verdict.impactLevel }, e => this.scanner.events$.next(e));
    }
    return true;
  }

  /** Atomic daily cap: one call taken from the IST day's budget, false when reached. */
  private async takeGeminiBudget(): Promise<boolean> {
    const { data, error } = await this.db.rpc('news_gemini_take', { p_day: istDate(this.deps.now()), p_cap: GEMINI_DAILY_CAP });
    if (error) {
      this.logger.warn(`Gemini budget check failed: ${error.message}`);
      return false;
    }
    return data != null;
  }

  /**
   * Symbols from `instruments` for the latest selection day (selecting `symbol` only); on a
   * query error or an empty result, the instrument file F&O list. Names come from the
   * committed names file.
   */
  private async loadUniverse(directory: () => Promise<InstrumentDirectory>): Promise<WatchedUniverse> {
    const names = this.deps.companyNames();
    const withNames = (symbols: string[], from: string) => {
      const universe = buildUniverse(symbols, names);
      const named = new Set(universe.names.values());
      const missing = [...universe.symbols].filter(s => !named.has(s)).length;
      this.logger.log(`News universe: ${universe.symbols.size} symbols from ${from}, ${missing} with no company name`);
      return universe;
    };

    const { data: latest, error: latestError } = await this.db
      .from('instruments')
      .select('last_selected_on')
      .not('last_selected_on', 'is', null)
      .order('last_selected_on', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) this.logger.error(`Watched universe query failed: ${latestError.message}; using the F&O list`);
    else if (latest?.last_selected_on) {
      const { data, error } = await this.db.from('instruments').select('symbol').eq('last_selected_on', latest.last_selected_on);
      if (error) this.logger.error(`Watched universe query failed: ${error.message}; using the F&O list`);
      else if (data?.length) return withNames(data.map(r => r.symbol as string), 'instruments');
    }
    try {
      return withNames((await directory()).fno, 'the instrument file F&O list');
    } catch (err) {
      this.logger.warn(`No watched universe available: ${(err as Error).message}`);
      return buildUniverse([]);
    }
  }

  /** The start of the latest run whose Alpha Vantage call actually ran. */
  private async lastAlphaVantageCall(): Promise<Date | null> {
    const { data } = await this.db
      .from('news_fetch_runs')
      .select('started_at, per_source')
      .neq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(50);
    const hit = (data ?? []).find(r => {
      const av = (r.per_source as Record<string, SourceResult> | null)?.alphavantage;
      // A run that only waited out the 30 minutes records no feed, so it never counts.
      return av?.status === 'ok' && (av.feeds ?? []).length > 0;
    });
    return hit ? new Date(hit.started_at) : null;
  }

  async getLatestRun(): Promise<FetchRunContract | null> {
    // A run stuck in `running` (e.g. the process stopped mid fetch) is closed here too,
    // so the page never shows an endless spinner.
    const now = this.deps.now();
    await this.db
      .from('news_fetch_runs')
      .update({ status: 'failed', finished_at: now.toISOString() })
      .eq('status', 'running')
      .lt('started_at', new Date(now.getTime() - STALE_RUN_MS).toISOString());
    const { data } = await this.db.from('news_fetch_runs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      trigger: data.trigger,
      startedAt: data.started_at,
      finishedAt: data.finished_at,
      status: data.status,
      perSource: data.per_source ?? {},
      geminiCalls: data.gemini_calls ?? 0,
    };
  }
}


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HttpException } from '@nestjs/common';
import { Subject } from 'rxjs';
import { NewsIngestionService } from './news-ingestion.service.js';
import { buildDirectory } from './news.symbols.js';

/**
 * In memory stand in for the supabase-js query builder, covering only the calls the
 * ingestion service makes. Enforces the two unique indexes from the migration.
 */
function fakeDb(seed: Record<string, any[]> = {}) {
  const tables: Record<string, any[]> = { news_and_events: [], news_fetch_runs: [], instruments: [], news_ingestion_settings: [], ...seed };
  let seq = 0;
  let geminiCalls = 0;
  const geminiCap = { value: 200 };
  /** Fails the next N updates on news_and_events with a network style error. */
  const failUpdates = { n: 0 };

  function builder(table: string) {
    const st: any = { op: 'select', filters: [] as Array<(r: any) => boolean>, order: null, limit: null };
    const rows = () => tables[table];
    const match = () => rows().filter(r => st.filters.every((f: any) => f(r)));
    const run = (): { data: any; error: any } => {
      if (st.op === 'insert') {
        const row = { id: `id-${++seq}`, ...st.payload };
        if (table === 'news_fetch_runs' && row.status === 'running' && rows().some(r => r.status === 'running')) {
          return { data: null, error: { code: '23505', message: 'duplicate running' } };
        }
        rows().push(row);
        return { data: [row], error: null };
      }
      if (st.op === 'upsert' && table !== 'news_and_events') {
        tables[table] = rows().filter(r => r.id !== st.payload.id);
        tables[table].push({ ...st.payload });
        return { data: [st.payload], error: null };
      }
      if (st.op === 'upsert') {
        const p = st.payload;
        if (rows().some(r => r.source === p.source && r.source_item_id === p.source_item_id)) return { data: [], error: null };
        const row = { id: `id-${++seq}`, ingested_at: new Date().toISOString(), ...p };
        rows().push(row);
        return { data: [row], error: null };
      }
      if (st.op === 'update' && table === 'news_and_events' && failUpdates.n > 0) {
        failUpdates.n--;
        return { data: null, error: { message: 'TypeError: fetch failed' } };
      }
      let out = match();
      if (st.op === 'update') out.forEach(r => Object.assign(r, st.payload));
      if (st.op === 'delete') tables[table] = rows().filter(r => !out.includes(r));
      if (st.order) {
        const [col, asc] = st.order;
        out = [...out].sort((a, b) => (a[col] < b[col] ? -1 : a[col] > b[col] ? 1 : 0) * (asc ? 1 : -1));
      }
      if (st.limit != null) out = out.slice(0, st.limit);
      return { data: out, error: null };
    };
    const q: any = {
      select: () => q,
      insert: (p: any) => ((st.op = 'insert'), (st.payload = p), q),
      upsert: (p: any) => ((st.op = 'upsert'), (st.payload = p), q),
      update: (p: any) => ((st.op = 'update'), (st.payload = p), q),
      delete: () => ((st.op = 'delete'), q),
      eq: (c: string, v: any) => (st.filters.push((r: any) => r[c] === v), q),
      neq: (c: string, v: any) => (st.filters.push((r: any) => r[c] !== v), q),
      lt: (c: string, v: any) => (st.filters.push((r: any) => r[c] < v), q),
      not: (c: string) => (st.filters.push((r: any) => r[c] != null), q),
      order: (c: string, o: any) => ((st.order = [c, o?.ascending !== false]), q),
      limit: (n: number) => ((st.limit = n), q),
      single: async () => { const r = run(); return r.error ? r : { data: r.data[0] ?? null, error: null }; },
      maybeSingle: async () => { const r = run(); return r.error ? r : { data: r.data[0] ?? null, error: null }; },
      then: (resolve: any, reject: any) => Promise.resolve(run()).then(resolve, reject),
    };
    return q;
  }

  const client = {
    from: (t: string) => builder(t),
    rpc: async () => (geminiCalls < geminiCap.value ? { data: ++geminiCalls, error: null } : { data: null, error: null }),
  };
  return { client, tables, geminiCap, failUpdates, get geminiCalls() { return geminiCalls; } };
}

const NSE_FEED = 'https://nse.example/announcements.xml';
const BSE_FEED = 'https://bse.example/announcements.xml';
const NSE_XML = '<?xml version="1.0"?><rss version="2.0"><channel><item><title>TCS: Order received</title><link>https://n/1.pdf</link><guid>n1</guid><pubDate>Tue, 10 Nov 2026 10:00:00 +0530</pubDate></item></channel></rss>';
const BSE_XML = '<rss version="2.0"><channel><item><title>Reliance Industries Ltd (500325): Company opens new office</title><guid>b1</guid><pubDate>Tue, 10 Nov 2026 10:05:00 +0530</pubDate></item></channel></rss>';
const RSS_XML = '<rss><channel><item><title>RBI cuts repo rate</title><link>https://et/1</link><pubDate>Tue, 10 Nov 2026 08:30:00 +0530</pubDate></item></channel></rss>';

type Answer = { status?: number; body?: string; type?: string; throws?: string };
/** A fetch double that records every request; `answers` override a URL's response. */
function fakeFetch(answers: Record<string, Answer> = {}) {
  return vi.fn(async (url: string, _init?: RequestInit) => {
    const a = answers[url] ?? {};
    if (a.throws) throw new Error(a.throws);
    const body = a.body ?? (url === NSE_FEED ? NSE_XML : url === BSE_FEED ? BSE_XML : RSS_XML);
    const status = a.status ?? 200;
    const headers = new Map([['content-type', a.type ?? 'application/rss+xml']]);
    return { ok: status < 300, status, headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null }, text: async () => body, json: async () => JSON.parse(body) } as any;
  });
}

describe('NewsIngestionService (spec 0024)', () => {
  let db: ReturnType<typeof fakeDb>;
  let service: NewsIngestionService;
  let events: Subject<any>;
  let now: Date;

  beforeEach(() => {
    delete process.env.ALPHA_VANTAGE_API_KEY;
    delete process.env.NEWS_ALPHAVANTAGE_ENABLED;
    process.env.NEWS_NSE_FEED_URLS = NSE_FEED;
    process.env.NEWS_BSE_FEED_URLS = BSE_FEED;
    process.env.NEWS_RSS_FEEDS = 'https://economictimes.indiatimes.com/markets/rss';
    now = new Date('2026-11-10T06:00:00.000Z');
    db = fakeDb({ instruments: [{ symbol: 'TCS', name: null, last_selected_on: '2026-11-10' }, { symbol: 'RELIANCE', name: null, last_selected_on: '2026-11-10' }] });
    events = new Subject();
    service = new NewsIngestionService({ client: db.client } as any, { events$: events } as any);
    service.deps = {
      fetchImpl: fakeFetch() as any,
      loadDirectory: async () => buildDirectory([
        { exch_seg: 'NSE', symbol: 'RELIANCE-EQ', token: '1', name: 'RELIANCE' },
        { exch_seg: 'BSE', symbol: 'RELIANCE', token: '500325', name: 'RELIANCE' },
      ]),
      now: () => now,
      companyNames: () => ({}),
    };
    service.setGemini(async () => ({ impact: 'MEDIUM', direction: 'BULLISH', eventType: 'GENERAL_NEWS', confidence: 0.6 }));
  });

  const runOnce = async (trigger: 'manual' | 'schedule' = 'schedule') => {
    const { data } = await db.client.from('news_fetch_runs').insert({ trigger, started_at: now.toISOString(), status: 'running' }).select('id').single();
    const status = await service.execute({ id: data.id, trigger, startedAt: now });
    return { id: data.id, status };
  };

  // covers: 0024 AC-3, AC-4, AC-6, AC-9
  it('stores real items from every source with their classification and pushes each over SSE', async () => {
    const pushed: any[] = [];
    events.subscribe(e => pushed.push(e));
    const { status } = await runOnce();
    expect(status).toBe('done');
    const rows = db.tables.news_and_events;
    expect(rows.map(r => [r.source, r.symbol, r.classified_by]).sort()).toEqual([
      ['BSE', 'RELIANCE', 'gemini'],
      ['ET Markets', 'MARKET', 'gemini'],
      ['NSE', 'TCS', 'rules'],
    ]);
    expect(rows.find(r => r.source === 'NSE')).toMatchObject({ is_official_filing: true, source_url: 'https://n/1.pdf', source_item_id: 'n1', direction: 'BULLISH' });
    expect(pushed).toHaveLength(3);
    expect(pushed[0].type).toBe('intelligence:news');
    expect(pushed.map(p => p.data.classifiedBy).sort()).toEqual(['gemini', 'gemini', 'rules']);
  });

  // covers: 0024 AC-5
  it('creates no duplicates and calls Gemini only for new rows on a re-fetch', async () => {
    await runOnce();
    const calls = db.geminiCalls;
    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    now = new Date(now.getTime() + 5 * 60_000);
    await runOnce();
    expect(db.tables.news_and_events).toHaveLength(3);
    expect(db.geminiCalls).toBe(calls);
    const latest = await service.getLatestRun();
    expect(latest?.perSource.nse).toMatchObject({ fetched: 1, kept: 1, new: 0 });
  });

  // covers: 0024 AC-3
  it('keeps storing from other sources when one fails, marking the run partial with the error', async () => {
    service.deps.fetchImpl = fakeFetch({ [BSE_FEED]: { throws: 'BSE down' } }) as any;
    const { id, status } = await runOnce();
    expect(status).toBe('partial');
    const run = db.tables.news_fetch_runs.find(r => r.id === id);
    expect(run.per_source.bse).toMatchObject({ status: 'error', skipped: null });
    expect(run.per_source.bse.error).toContain('BSE down');
    expect(run.per_source.nse.new).toBe(1);
    expect(db.tables.news_and_events.some(r => r.source === 'NSE')).toBe(true);
  });

  // covers: 0024 AC-6
  it('defaults to Low / Neutral when the daily Gemini cap is reached', async () => {
    db.geminiCap.value = 0;
    await runOnce();
    const bse = db.tables.news_and_events.find(r => r.source === 'BSE');
    expect(bse).toMatchObject({ classified_by: 'default', impact_level: 'LOW', direction: 'NEUTRAL' });
  });

  // covers: 0024 AC-1
  it('returns 429 within 60 s of the last manual fetch, and the running run when one overlaps', async () => {
    const first = await service.requestManualFetch('u1');
    expect(first.status).toBe('running');
    now = new Date(now.getTime() + 20_000);
    const err = await service.requestManualFetch('u1').catch(e => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(429);
    expect((err as any).getResponse().retryAfter).toBe(40);

    db.tables.news_fetch_runs.forEach(r => (r.status = 'running'));
    const overlap = await service.startRun('schedule', null);
    expect(overlap).toEqual({ runId: first.runId, status: 'running', started: false });
  });

  // covers: 0024 AC-2
  it('marks a run stuck for over 10 minutes as failed before starting a new one', async () => {
    db.tables.news_fetch_runs.push({ id: 'old', trigger: 'schedule', status: 'running', started_at: new Date(now.getTime() - 11 * 60_000).toISOString() });
    const started = await service.startRun('schedule', null);
    expect(started.started).toBe(true);
    expect(db.tables.news_fetch_runs.find(r => r.id === 'old').status).toBe('failed');
  });

  // covers: 0024 AC-2
  it('skips schedule ticks before 08:30 IST', async () => {
    now = new Date('2026-11-10T02:55:00.000Z'); // 08:25 IST
    await service.scheduledFetch();
    expect(db.tables.news_fetch_runs).toHaveLength(0);
  });

  // covers: 0024 AC-3
  it('calls Alpha Vantage at most once per 30 minutes, counting only real calls', async () => {
    process.env.NEWS_ALPHAVANTAGE_ENABLED = 'true';
    process.env.ALPHA_VANTAGE_API_KEY = 'k';
    const fetchImpl = fakeFetch();
    service.deps.fetchImpl = fetchImpl as any;
    db.tables.news_fetch_runs.push({ id: 'p', status: 'done', started_at: new Date(now.getTime() - 10 * 60_000).toISOString(), per_source: { alphavantage: { status: 'ok', fetched: 3, feeds: [{ url: 'av', status: 'ok', reason: null }] } } });
    const { id } = await runOnce();
    expect(db.tables.news_fetch_runs.find(r => r.id === id).per_source.alphavantage).toMatchObject({ status: 'ok', skipped: null, feeds: [] });
    expect(fetchImpl.mock.calls.some(([u]) => String(u).includes('alphavantage'))).toBe(false);
  });

  // covers: 0024 AC-3, AC-12
  it('with no exchange feeds and Alpha Vantage off, ends done with NSE, BSE and Alpha Vantage skipped', async () => {
    process.env.NEWS_NSE_FEED_URLS = '';
    delete process.env.NEWS_BSE_FEED_URLS;
    const { id, status } = await runOnce();
    expect(status).toBe('done');
    const ps = db.tables.news_fetch_runs.find(r => r.id === id).per_source;
    expect(ps.nse).toMatchObject({ status: 'skipped', skipped: 'no official feed configured', error: null });
    expect(ps.bse).toMatchObject({ status: 'skipped', skipped: 'no official feed configured', error: null });
    expect(ps.alphavantage).toMatchObject({ status: 'skipped', skipped: 'disabled until premium', error: null });
    expect(ps.rss.status).toBe('ok');
  });

  // covers: 0024 AC-12
  it('Alpha Vantage enabled without a key is skipped "no key"; a premium answer is skipped "premium required"', async () => {
    process.env.NEWS_ALPHAVANTAGE_ENABLED = 'true';
    const first = await runOnce();
    expect(db.tables.news_fetch_runs.find(r => r.id === first.id).per_source.alphavantage.skipped).toBe('no key');
    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    process.env.ALPHA_VANTAGE_API_KEY = 'k';
    service.deps.fetchImpl = vi.fn(async (url: string) =>
      String(url).includes('alphavantage')
        ? ({ ok: true, status: 200, json: async () => ({ Information: 'This is a premium endpoint.' }) } as any)
        : (fakeFetch() as any)(url),
    ) as any;
    const second = await runOnce();
    expect(second.status).toBe('done');
    expect(db.tables.news_fetch_runs.find(r => r.id === second.id).per_source.alphavantage).toMatchObject({ status: 'skipped', skipped: 'premium required', error: null });
  });

  // covers: 0024 AC-12
  it('a 403 or an HTML block page is skipped "blocked by exchange", remembered for 6 hours, and not counted as a failure', async () => {
    const fetchImpl = fakeFetch({ [BSE_FEED]: { status: 403 }, [NSE_FEED]: { body: '<html>Access Denied</html>', type: 'text/html' } });
    service.deps.fetchImpl = fetchImpl as any;
    const { id, status } = await runOnce();
    expect(status).toBe('done');
    const ps = db.tables.news_fetch_runs.find(r => r.id === id).per_source;
    expect(ps.bse).toMatchObject({ status: 'skipped', skipped: 'blocked by exchange', error: null });
    expect(ps.nse).toMatchObject({ status: 'skipped', skipped: 'blocked by exchange' });

    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    now = new Date(now.getTime() + 5 * 60_000);
    const calls = fetchImpl.mock.calls.length;
    const again = await runOnce();
    expect(fetchImpl.mock.calls.length).toBe(calls + 1); // only the market RSS feed
    expect(db.tables.news_fetch_runs.find(r => r.id === again.id).per_source.bse.skipped).toMatch(/^blocked by exchange, retry after \d\d:\d\d IST$/);

    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    await runOnce('manual'); // a manual Fetch tries a blocked feed again once
    expect(fetchImpl.mock.calls.length).toBe(calls + 4);
  });

  // covers: 0024 AC-3
  it('sends only an honest User-Agent and an XML Accept: no cookies or browser headers', async () => {
    process.env.NEWS_USER_AGENT = 'TestReader/2.0';
    const fetchImpl = fakeFetch();
    service.deps.fetchImpl = fetchImpl as any;
    await runOnce();
    delete process.env.NEWS_USER_AGENT;
    expect(fetchImpl.mock.calls).toHaveLength(3);
    for (const [, init] of fetchImpl.mock.calls) {
      const headers = init?.headers as Record<string, string>;
      expect(Object.keys(headers).sort()).toEqual(['Accept', 'User-Agent']);
      expect(headers['User-Agent']).toBe('TestReader/2.0');
      expect(init?.redirect).toBe('manual');
    }
  });

  // covers: 0024 AC-3
  it('a 5xx feed is an error, and a 304 is ok with no items', async () => {
    service.deps.fetchImpl = fakeFetch({ [NSE_FEED]: { status: 503 }, [BSE_FEED]: { status: 304 } }) as any;
    const { id, status } = await runOnce();
    expect(status).toBe('partial');
    const ps = db.tables.news_fetch_runs.find(r => r.id === id).per_source;
    expect(ps.nse).toMatchObject({ status: 'error', error: expect.stringContaining('HTTP 503') });
    expect(ps.bse).toMatchObject({ status: 'ok', fetched: 0 });
  });

  // covers: 0024 AC-3 (an invalid feed URL)
  it('a non https feed URL is skipped "invalid feed URL" without a request', async () => {
    process.env.NEWS_NSE_FEED_URLS = 'http://nse.example/a.xml';
    const fetchImpl = fakeFetch();
    service.deps.fetchImpl = fetchImpl as any;
    const { id } = await runOnce();
    expect(db.tables.news_fetch_runs.find(r => r.id === id).per_source.nse).toMatchObject({ status: 'skipped', skipped: 'invalid feed URL' });
    expect(fetchImpl.mock.calls.some(([u]) => String(u).startsWith('http:'))).toBe(false);
  });

  // covers: 0024 AC-4
  it('the watched universe query selects only symbol and uses today\'s instruments list', async () => {
    const selects: string[] = [];
    const from = db.client.from.bind(db.client);
    db.client.from = (t: string) => {
      const q = from(t);
      if (t !== 'instruments') return q;
      const select = q.select.bind(q);
      q.select = (cols: string) => (selects.push(cols), select(cols));
      return q;
    };
    db.tables.instruments.push({ symbol: 'INFY', last_selected_on: '2026-11-09' });
    await runOnce();
    expect(selects).toEqual(['last_selected_on', 'symbol']);
    expect(db.tables.news_and_events.some(r => r.symbol === 'INFY')).toBe(false);
  });

  // covers: 0024 Source queries (lookback 1 day on schedule, 2 days on manual, by pubDate)
  it('drops feed items older than the lookback: 1 day on schedule, 2 days on manual', async () => {
    const old = (h: number) => `<item><title>RBI cuts repo rate ${h}h</title><guid>g${h}</guid><pubDate>${new Date(now.getTime() - h * 3600_000).toUTCString()}</pubDate></item>`;
    const xml = `<rss><channel>${old(2)}${old(30)}${old(60)}</channel></rss>`;
    service.deps.fetchImpl = fakeFetch({ 'https://economictimes.indiatimes.com/markets/rss': { body: xml } }) as any;
    await runOnce('schedule');
    expect(db.tables.news_and_events.filter(r => r.source === 'ET Markets').map(r => r.source_item_id)).toEqual(['g2']);
    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    await runOnce('manual');
    expect(db.tables.news_and_events.filter(r => r.source === 'ET Markets').map(r => r.source_item_id).sort()).toEqual(['g2', 'g30']);
  });

  // covers: review minor (validators saved only after items are stored)
  it('does not send If-None-Match after a run whose items failed to store', async () => {
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      const r = await (fakeFetch() as any)(url, init);
      return { ...r, headers: { get: (k: string) => (k.toLowerCase() === 'etag' ? '"v1"' : r.headers.get(k)) } };
    });
    service.deps.fetchImpl = fetchImpl as any;
    const upsert = db.client.from;
    db.client.from = (t: string) => {
      const q = upsert(t);
      if (t === 'news_and_events') q.upsert = () => { throw new Error('db down'); };
      return q;
    };
    await runOnce();
    db.client.from = upsert;
    db.tables.news_fetch_runs.forEach(r => (r.status = 'done'));
    const before = fetchImpl.mock.calls.length;
    await runOnce();
    const second = fetchImpl.mock.calls.slice(before).map(([, init]) => (init?.headers as Record<string, string>)['If-None-Match']);
    expect(second.every(v => v === undefined)).toBe(true);
    await runOnce();
    expect(fetchImpl.mock.calls.slice(-3).every(([, init]) => (init?.headers as Record<string, string>)['If-None-Match'] === '"v1"')).toBe(true);
  });

  // covers: review minor (a crash before the sources run closes the run)
  it('marks the run failed when loading the watched universe throws', async () => {
    service.deps.companyNames = () => { throw new Error('boom'); };
    const { id, status } = await runOnce();
    expect(status).toBe('failed');
    expect(db.tables.news_fetch_runs.find(r => r.id === id)).toMatchObject({ status: 'failed' });
    expect(db.tables.news_fetch_runs.find(r => r.id === id).finished_at).toBeTruthy();
  });

  // covers: 0024 AC-10
  it('stops a cancelled run before its next item, keeping what was stored', async () => {
    const { data } = await db.client.from('news_fetch_runs').insert({ trigger: 'manual', started_at: now.toISOString(), status: 'running' }).select('id').single();
    await service.cancelRun(data.id);
    const status = await service.execute({ id: data.id, trigger: 'manual', startedAt: now });
    expect(status).toBe('cancelled');
    expect(db.tables.news_and_events).toHaveLength(0);
    db.tables.news_fetch_runs.find(r => r.id === data.id).status = 'cancelled';
    await expect(service.cancelRun(data.id)).rejects.toMatchObject({ status: 409 });
    await expect(service.cancelRun('nope')).rejects.toMatchObject({ status: 404 });
  });

  // covers: 0024 AC-11
  it('starts no scheduled run while paused, while a manual fetch still works', async () => {
    expect(await service.getSchedule()).toEqual({ paused: false, pausedAt: null });
    const state = await service.setSchedule(true, 'admin-1');
    expect(state).toEqual({ paused: true, pausedAt: now.toISOString() });
    await service.closingFetch();
    expect(db.tables.news_fetch_runs).toHaveLength(0);
    const manual = await service.requestManualFetch('admin-1');
    expect(manual.status).toBe('running');
    expect(db.tables.news_fetch_runs).toHaveLength(1);
    await service.setSchedule(false, 'admin-1');
    expect((await service.getSchedule()).paused).toBe(false);
  });

  // covers: 0024 retention update (spec 0025)
  it('prunes old LOW and MEDIUM items but keeps HIGH items for good', async () => {
    const old = new Date(now.getTime() - 40 * 86_400_000).toISOString();
    db.tables.news_and_events.push(
      { id: 'h', impact_level: 'HIGH', published_at: old },
      { id: 'l', impact_level: 'LOW', published_at: old },
      { id: 'm', impact_level: 'MEDIUM', published_at: now.toISOString() },
    );
    await service.prune();
    expect(db.tables.news_and_events.map(r => r.id).sort()).toEqual(['h', 'm']);
  });

  // covers: 0024 AC-1 (stale run never shows as running)
  it('closes a run stuck for over 10 minutes when the latest run is read', async () => {
    db.tables.news_fetch_runs.push({ id: 'stuck', trigger: 'manual', status: 'running', started_at: new Date(now.getTime() - 35 * 60_000).toISOString(), per_source: {} });
    const latest = await service.getLatestRun();
    expect(latest?.status).toBe('failed');
  });

  // covers: 0024 AC-6, AC-8 (a transient save error must not drop the classification)
  it('retries a failed classification update once, keeping the verdict and the live push', async () => {
    const pushed: any[] = [];
    events.subscribe(e => pushed.push(e));
    db.failUpdates.n = 1;
    await runOnce();
    expect(db.tables.news_and_events.find(r => r.source === 'NSE')?.classified_by).toBe('rules');
    expect(pushed).toHaveLength(db.tables.news_and_events.length);
  });
});

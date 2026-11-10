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

const NSE_JSON = [{ seq_id: '1', symbol: 'TCS', desc: 'Order received', attchmntFile: 'https://n/1.pdf', an_dt: '10-Nov-2026 10:00:00' }];
const BSE_JSON = { Table: [{ NEWSID: 'b1', SCRIP_CD: 500325, NEWSSUB: 'Reliance - Company opens new office', NEWS_DT: '2026-11-10T10:05:00' }] };
const RSS_XML = '<rss><channel><item><title>RBI cuts repo rate</title><link>https://et/1</link><pubDate>Tue, 10 Nov 2026 08:30:00 +0530</pubDate></item></channel></rss>';

function fakeFetch(fail: Partial<Record<'nse' | 'bse' | 'rss', boolean>> = {}) {
  return vi.fn(async (url: string) => {
    const ok = (body: any, text = false) =>
      ({ ok: true, status: 200, headers: { getSetCookie: () => ['nsit=abc; Path=/'], get: () => null }, json: async () => body, text: async () => (text ? body : '') }) as any;
    if (url === 'https://www.nseindia.com') return ok('');
    if (url.includes('nseindia.com/api')) { if (fail.nse) throw new Error('NSE blocked'); return ok(NSE_JSON); }
    if (url.includes('bseindia')) { if (fail.bse) throw new Error('BSE down'); return ok(JSON.stringify(BSE_JSON), true); }
    if (fail.rss) throw new Error('feed down');
    return ok(RSS_XML, true);
  });
}

describe('NewsIngestionService (spec 0024)', () => {
  let db: ReturnType<typeof fakeDb>;
  let service: NewsIngestionService;
  let events: Subject<any>;
  let now: Date;

  beforeEach(() => {
    delete process.env.ALPHA_VANTAGE_API_KEY;
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
    expect(rows.find(r => r.source === 'NSE')).toMatchObject({ is_official_filing: true, source_url: 'https://n/1.pdf', direction: 'BULLISH' });
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
    service.deps.fetchImpl = fakeFetch({ bse: true }) as any;
    const { id, status } = await runOnce();
    expect(status).toBe('partial');
    const run = db.tables.news_fetch_runs.find(r => r.id === id);
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
  it('calls Alpha Vantage at most once per 30 minutes', async () => {
    process.env.ALPHA_VANTAGE_API_KEY = 'k';
    db.tables.news_fetch_runs.push({ id: 'p', status: 'done', started_at: new Date(now.getTime() - 10 * 60_000).toISOString(), per_source: { alphavantage: { fetched: 3, kept: 0, new: 0, error: null } } });
    const { id } = await runOnce();
    expect(db.tables.news_fetch_runs.find(r => r.id === id).per_source.alphavantage.skipped).toContain('30 min');
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

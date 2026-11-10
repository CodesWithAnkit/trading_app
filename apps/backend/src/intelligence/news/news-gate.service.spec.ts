import { beforeEach, describe, expect, it } from 'vitest';
import { NEWS_UNAVAILABLE, NewsGateEvent, NewsGateService } from './news-gate.service.js';

/** A tiny in memory Supabase double: just the filters the gate service uses. */
function fakeDb(tables: Record<string, any[]>, opts: { failRead?: boolean } = {}) {
  const rank = (g: string | null) => (g === 'block' ? 2 : g === 'warn' ? 1 : 0);
  const client = {
    from(table: string) {
      const filters: Array<(r: any) => boolean> = [];
      let patch: any = null;
      let order: { col: string; asc: boolean } | null = null;
      let limit = Infinity;
      const rows = () => {
        let out = (tables[table] ?? []).filter(r => filters.every(f => f(r)));
        if (order) out = [...out].sort((a, b) => (a[order!.col] < b[order!.col] ? -1 : 1) * (order!.asc ? 1 : -1));
        return out.slice(0, limit);
      };
      const run = () => {
        if (opts.failRead && table === 'news_and_events') return { data: null, error: { message: 'db down' } };
        const hit = rows();
        if (patch) hit.forEach(r => Object.assign(r, patch));
        return { data: hit, error: null };
      };
      const q: any = {
        select: () => q,
        update: (p: any) => ((patch = p), q),
        eq: (c: string, v: any) => (filters.push(r => r[c] === v), q),
        in: (c: string, v: any[]) => (filters.push(r => v.includes(r[c])), q),
        gte: (c: string, v: string) => (filters.push(r => r[c] >= v), q),
        lte: (c: string, v: string) => (filters.push(r => r[c] <= v), q),
        not: (c: string) => (filters.push(r => r[c] != null), q),
        or: (expr: string) => {
          // `news_gate.is.null,news_gate_reason.eq.News unavailable`
          filters.push(r => r.news_gate == null || r.news_gate_reason === expr.split('news_gate_reason.eq.')[1]);
          return q;
        },
        order: (col: string, o: { ascending: boolean }) => ((order = { col, asc: o.ascending }), q),
        limit: (n: number) => ((limit = n), q),
        maybeSingle: async () => {
          const r = run();
          return { data: r.data?.[0] ?? null, error: r.error };
        },
        then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
      };
      return q;
    },
    async rpc(name: string, a: any) {
      if (name !== 'news_gate_escalate') throw new Error(name);
      const moved = tables.signals.filter(s => a.p_ids.includes(s.id) && rank(s.news_after_gate) < rank(a.p_gate));
      moved.forEach(s => Object.assign(s, { news_after_gate: a.p_gate, news_after_reason: a.p_reason, news_after_items: a.p_items }));
      return { data: moved.map(s => s.id), error: null };
    },
  };
  return client;
}

// 11:00 IST.
const NOW = new Date('2026-11-10T05:30:00.000Z');
const iso = (m: number) => new Date(NOW.getTime() + m * 60_000).toISOString();
const newsRow = (over: any) => ({
  id: 'n1', symbol: 'TCS', headline: 'SEBI order on TCS', source_url: 'https://x', published_at: iso(-20),
  impact_level: 'HIGH', direction: 'BEARISH', classified_by: 'rules', event_type: 'OFFICIAL_FILING', is_seed: false, ...over,
});

describe('NewsGateService (spec 0025 live news gate)', () => {
  let tables: Record<string, any[]>;
  let service: NewsGateService;
  let events: NewsGateEvent[];

  beforeEach(() => {
    tables = {
      news_and_events: [],
      news_fetch_runs: [{ status: 'done', finished_at: iso(-5) }],
      signals: [{ id: 's1', symbol: 'TCS', direction: 'LONG', status: 'ACTIVE', created_at: iso(0), news_gate: null, news_after_gate: null }],
    };
    service = new NewsGateService({ client: fakeDb(tables) } as any);
    service.now = () => NOW;
    events = [];
  });

  // covers: 0025 live AC-1, AC-4
  it('stores the entry verdict on a new signal and pushes signal:news-gate (entry)', async () => {
    tables.news_and_events.push(newsRow({}));
    const v = await service.checkNewSignal(tables.signals[0], e => events.push(e));
    expect(v?.result).toBe('block');
    expect(tables.signals[0]).toMatchObject({ news_gate: 'block', news_gate_reason: expect.stringContaining('SEBI order on TCS') });
    expect(tables.signals[0].news_gate_items[0]).toMatchObject({ id: 'n1', headline: 'SEBI order on TCS', sourceUrl: 'https://x' });
    expect(events[0]).toMatchObject({ type: 'signal:news-gate', data: { signalId: 's1', kind: 'entry', gate: 'block' } });
  });

  // covers: 0025 live AC-1 (the entry verdict never changes afterwards)
  it('never overwrites a real entry verdict', async () => {
    tables.signals[0].news_gate = 'pass';
    tables.signals[0].news_gate_reason = 'No relevant news';
    tables.news_and_events.push(newsRow({}));
    await service.checkNewSignal(tables.signals[0], e => events.push(e));
    expect(tables.signals[0].news_gate).toBe('pass');
    expect(events).toHaveLength(0);
  });

  // covers: 0025 live AC-7
  it('a news read failure stores warn "News unavailable", later replaced by the first real result', async () => {
    const failing = new NewsGateService({ client: fakeDb(tables, { failRead: true }) } as any);
    failing.now = () => NOW;
    const v = await failing.checkNewSignal(tables.signals[0]);
    expect(v).toMatchObject({ result: 'warn', reason: NEWS_UNAVAILABLE });
    expect(tables.signals[0]).toMatchObject({ news_gate: 'warn', news_gate_reason: NEWS_UNAVAILABLE });
    await service.checkNewSignal(tables.signals[0]);
    expect(tables.signals[0]).toMatchObject({ news_gate: 'pass' });
  });

  // covers: 0025 live AC-3, AC-4
  it('a late HIGH Bearish item escalates an active LONG to block after entry; a later warn changes nothing; the entry verdict stays', async () => {
    tables.signals[0].news_gate = 'pass';
    tables.signals[0].created_at = iso(-30);
    tables.news_and_events.push(newsRow({ published_at: iso(-2) }));
    expect(await service.recheckForItem({ symbol: 'TCS', impactLevel: 'HIGH' }, e => events.push(e))).toBe(1);
    expect(tables.signals[0]).toMatchObject({ news_gate: 'pass', news_after_gate: 'block' });
    expect(events[0].data).toMatchObject({ kind: 'after', gate: 'block' });

    tables.news_and_events.length = 0;
    tables.news_and_events.push(newsRow({ id: 'n2', impact_level: 'MEDIUM', published_at: iso(-1) }));
    expect(await service.recheckForItem({ symbol: 'TCS', impactLevel: 'MEDIUM' }, e => events.push(e))).toBe(0);
    expect(tables.signals[0].news_after_gate).toBe('block');
    expect(events).toHaveLength(1);
  });

  // covers: 0025 live AC-3 (two concurrent rechecks)
  it('two concurrent rechecks leave block and push once', async () => {
    tables.signals[0].created_at = iso(-30);
    tables.news_and_events.push(newsRow({ published_at: iso(-2) }));
    await Promise.all([1, 2].map(() => service.recheckForItem({ symbol: 'TCS', impactLevel: 'HIGH' }, e => events.push(e))));
    expect(tables.signals[0].news_after_gate).toBe('block');
    expect(events).toHaveLength(1);
  });

  // covers: 0025 live AC-3 (MARKET items reach every active signal; items before the signal are ignored)
  it('a MARKET item rechecks every active signal; items published before a signal do not count', async () => {
    tables.signals.push({ id: 's2', symbol: 'NIFTY', direction: 'LONG', status: 'ACTIVE', created_at: iso(-30), news_after_gate: null });
    tables.signals[0].created_at = iso(-30);
    tables.news_and_events.push(newsRow({ id: 'm1', symbol: 'MARKET', headline: 'RBI hikes repo rate', published_at: iso(-40) }));
    expect(await service.recheckForItem({ symbol: 'MARKET', impactLevel: 'HIGH' })).toBe(0);
    tables.news_and_events.push(newsRow({ id: 'm2', symbol: 'MARKET', headline: 'RBI hikes repo rate again', published_at: iso(-3) }));
    expect(await service.recheckForItem({ symbol: 'MARKET', impactLevel: 'HIGH' })).toBe(2);
    expect(tables.signals.map(s => s.news_after_gate)).toEqual(['block', 'block']);
  });

  // covers: 0025 live AC-3 (LOW items never trigger a recheck)
  it('ignores LOW items', async () => {
    expect(await service.recheckForItem({ symbol: 'TCS', impactLevel: 'LOW' })).toBe(0);
  });
});

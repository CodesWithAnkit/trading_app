import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { downloadIndexInstruments, IndexInstrument } from '../scanner/universe/instrumentFile.js';
import { backfill, BackfillEvent, createHistoryFetcher, HistoryProviderName, resolveProvider } from './history/backfill.js';
import { executeRun, Lots, queueRuns, recoverRuns, RunRequest, httpError } from './runner.js';

export type BackfillState = {
  status: 'idle' | 'running' | 'done' | 'failed';
  provider: HistoryProviderName | null;
  startedAt: string | null;
  finishedAt: string | null;
  rows: number;
  retries: number;
  series: Record<string, { chunk: number; chunks: number; rows: number; from?: string; to?: string; done: boolean; unavailable?: boolean }>;
  log: { at: string; type: BackfillEvent['type']; message: string }[];
  error: string | null;
};

/**
 * spec 0020 AC-8, AC-12: runs backtests in the background, one at a time, inside the API process.
 * On boot, runs left `running` are failed and `queued` ones are picked up again.
 */
@Injectable()
export class BacktestService implements OnModuleInit {
  private readonly logger = new Logger(BacktestService.name);
  private readonly queue: string[] = [];
  private working = false;
  private instruments: IndexInstrument[] | null = null;
  readonly backfillState: BackfillState = { status: 'idle', provider: null, startedAt: null, finishedAt: null, rows: 0, retries: 0, series: {}, log: [], error: null };

  constructor(private readonly supabase: SupabaseService) {}

  db(): SupabaseClient {
    const c = this.supabase.client;
    if (!c) throw httpError(503, 'Database not configured');
    return c;
  }

  async onModuleInit() {
    if (!this.supabase.client) return;
    try {
      const leftover = await recoverRuns(this.supabase.client);
      if (leftover.length) this.logger.log(`Resuming ${leftover.length} queued backtest run(s)`);
      this.enqueue(leftover);
    } catch (err) {
      this.logger.warn(`Backtest recovery skipped: ${(err as Error).message}`);
    }
  }

  async startRuns(req: RunRequest, userId?: string): Promise<string[]> {
    const ids = await queueRuns(this.db(), req, userId);
    this.enqueue(ids);
    return ids;
  }

  private enqueue(ids: string[]) {
    this.queue.push(...ids);
    void this.drain();
  }

  private async drain() {
    if (this.working) return;
    this.working = true;
    try {
      while (this.queue.length) {
        const id = this.queue.shift()!;
        await executeRun(this.db(), id, await this.lots());
      }
    } catch (err) {
      this.logger.error(`Backtest worker stopped: ${(err as Error).message}`);
    } finally {
      this.working = false;
    }
  }

  private async indexInstruments(): Promise<IndexInstrument[]> {
    if (!this.instruments) this.instruments = await downloadIndexInstruments();
    return this.instruments;
  }

  private async lots(): Promise<Lots> {
    const inst = await this.indexInstruments();
    return Object.fromEntries(inst.map((i) => [i.symbol, i.lot])) as Lots;
  }

  /** Starts a backfill in the background. 409 if one is running (DB lock is the source of truth). */
  async startBackfill(symbols: string[], providerInput?: string): Promise<BackfillState> {
    const provider = resolveProvider(providerInput);
    if (this.backfillState.status === 'running') throw httpError(409, `Backfill already running since ${this.backfillState.startedAt}`);
    const db = this.db();
    const { data: lock } = await db.from('backtest_locks').select('acquired_at').eq('name', 'backfill').maybeSingle();
    if (lock && Date.now() - new Date(lock.acquired_at).getTime() < 2 * 60 * 60 * 1000) {
      throw httpError(409, `Backfill already running since ${lock.acquired_at}`);
    }
    let instruments: IndexInstrument[];
    let fetcher;
    try {
      instruments = (await this.indexInstruments()).filter((i) => symbols.includes(i.symbol));
      fetcher = await createHistoryFetcher(provider);
    } catch (err) {
      if ((err as { status?: number }).status) throw err;
      throw httpError(502, `Broker error: ${(err as Error).message}`);
    }
    const s = this.backfillState;
    Object.assign(s, { status: 'running', provider, startedAt: new Date().toISOString(), finishedAt: null, rows: 0, retries: 0, series: {}, log: [], error: null });
    const push = (type: BackfillEvent['type'], message: string) => {
      s.log.unshift({ at: new Date().toISOString(), type, message });
      s.log.length = Math.min(s.log.length, 200);
    };
    void backfill({
      db,
      fetcher,
      instruments,
      provider,
      onEvent: (e) => {
        const key = `${e.symbol} · ${e.timeframe}`;
        const ser = (s.series[key] ??= { chunk: 0, chunks: 0, rows: 0, done: false });
        if (e.type === 'chunk') {
          Object.assign(ser, { chunk: e.chunk, chunks: e.chunks, from: e.from, to: e.to });
          ser.rows += e.rows;
          s.rows += e.rows;
          push('chunk', `${e.symbol} ${e.timeframe} ${e.from} → ${e.to} · ${e.rows} rows`);
        } else if (e.type === 'retry') {
          s.retries++;
          push('retry', `${e.symbol} ${e.timeframe} ${e.from} · retry ${e.attempt} of 3 · ${e.error}`);
        } else if (e.type === 'unavailable') {
          ser.done = true;
          ser.unavailable = true;
          push('unavailable', `${e.symbol} ${e.timeframe}: no history from ${e.provider}`);
        } else if (e.type === 'resume') {
          push('resume', `Resumed ${e.symbol} ${e.timeframe} from ${e.from}`);
        } else {
          ser.done = true;
          push('done', `${e.symbol} ${e.timeframe} complete · ${e.rows} rows`);
        }
      },
    })
      .then(() => Object.assign(s, { status: 'done', finishedAt: new Date().toISOString() }))
      .catch((err) => Object.assign(s, { status: 'failed', finishedAt: new Date().toISOString(), error: (err as Error).message }));
    return s;
  }
}

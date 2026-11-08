import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/decorators.js';
import { DEFINITIONS_VERSION } from '../scanner/strategy/guru/index.js';
import { COST_MODEL_V1 } from './engine/costModel.js';
import { GATE_V1 } from './engine/gate.js';
import { BacktestService } from './backtest.service.js';
import { latestDoneRuns, RULE_IDS, SYMBOLS } from './runner.js';
import { RULE_DEFINITIONS_V1 } from './definitions.js';

const MAX_PAGE = 200;

/** spec 0020: the whole backtest API is admin only (spec 0021 AdminGuard). */
@Controller('api/v1/backtest')
@UseGuards(AdminGuard)
export class BacktestController {
  constructor(private readonly svc: BacktestService) {}

  @Post('runs')
  @HttpCode(202)
  async startRuns(@Body() body: { ruleIds?: string[]; symbols?: string[] }, @CurrentUser() user: AuthUser) {
    if (!Array.isArray(body?.ruleIds) || !body.ruleIds.length || !Array.isArray(body?.symbols) || !body.symbols.length) {
      throw new HttpException('ruleIds and symbols are required arrays', 422);
    }
    const runIds = await this.wrap(() => this.svc.startRuns({ ruleIds: body.ruleIds!, symbols: body.symbols! }, user.id));
    return { runIds, status: 'queued' };
  }

  @Get('runs')
  async listRuns(@Query('limit') limitRaw?: string, @Query('cursor') cursor?: string) {
    const limit = clamp(Number(limitRaw) || 50, 1, MAX_PAGE);
    let q = this.svc.db().from('backtest_runs').select('*').order('created_at', { ascending: false }).limit(limit + 1);
    if (cursor) q = q.lt('created_at', cursor);
    const { data, error } = await q;
    if (error) throw new HttpException(error.message, 500);
    const rows = data ?? [];
    const page = rows.slice(0, limit);
    return { data: page, nextCursor: rows.length > limit ? page[page.length - 1].created_at : null };
  }

  /** The latest done run per rule and symbol (baselines included), plus any active ones for status badges. */
  @Get('leaderboard')
  async leaderboard() {
    const db = this.svc.db();
    const latest = await latestDoneRuns(db);
    const { data: active } = await db
      .from('backtest_runs')
      .select('id,rule_id,symbol,status,progress,created_at')
      .in('status', ['queued', 'running']);
    const { data: failed } = await db
      .from('backtest_runs')
      .select('id,rule_id,symbol,status,error,created_at,finished_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(20);
    return { done: [...latest.values()], active: active ?? [], recentFailures: failed ?? [] };
  }

  @Get('runs/:id/trades')
  async trades(@Param('id') id: string, @Query('limit') limitRaw?: string, @Query('cursor') cursor?: string, @Query('oos') oos?: string) {
    const limit = clamp(Number(limitRaw) || 200, 1, MAX_PAGE);
    const db = this.svc.db();
    const { data: run } = await db.from('backtest_runs').select('id').eq('id', id).maybeSingle();
    if (!run) throw new HttpException('Run not found', 404);
    let q = db.from('backtest_trades').select('*').eq('run_id', id).order('entry_time', { ascending: false }).limit(limit + 1);
    if (cursor) q = q.lt('entry_time', cursor);
    if (oos === 'true') q = q.eq('is_oos', true);
    if (oos === 'false') q = q.eq('is_oos', false);
    const { data, error } = await q;
    if (error) throw new HttpException(error.message, 500);
    const rows = data ?? [];
    const page = rows.slice(0, limit);
    // Exit reason counts for the drawer chips.
    const counts = { target: 0, stop: 0, time: 0 };
    let cq = db.from('backtest_trades').select('exit_reason').eq('run_id', id);
    if (oos === 'true') cq = cq.eq('is_oos', true);
    if (oos === 'false') cq = cq.eq('is_oos', false);
    const { data: reasons } = await cq;
    for (const r of reasons ?? []) counts[r.exit_reason as keyof typeof counts]++;
    return { data: page, nextCursor: rows.length > limit ? page[page.length - 1].entry_time : null, counts, total: reasons?.length ?? 0 };
  }

  @Post('backfill')
  @HttpCode(202)
  async startBackfill(@Body() body: { symbols?: string[]; provider?: string }) {
    const symbols = (body?.symbols ?? [...SYMBOLS]).map((s) => String(s).toUpperCase());
    if (symbols.some((s) => !(SYMBOLS as readonly string[]).includes(s))) throw new HttpException('Unknown symbol', 422);
    return this.wrap(() => this.svc.startBackfill(symbols, body?.provider));
  }

  /** Live state of the background backfill (progress screen). */
  @Get('backfill')
  backfillStatus() {
    return this.svc.backfillState;
  }

  /** How much history is stored, so the page can show its empty state. */
  @Get('history')
  async history() {
    const db = this.svc.db();
    const out: Record<string, { count: number; first: string | null; last: string | null }> = {};
    for (const s of SYMBOLS) {
      for (const tf of ['5m', '1d']) {
        const { count } = await db.from('candles').select('id', { count: 'exact', head: true }).eq('symbol', s).eq('timeframe', tf);
        const first = await db.from('candles').select('start_time').eq('symbol', s).eq('timeframe', tf).order('start_time').limit(1);
        const last = await db.from('candles').select('start_time').eq('symbol', s).eq('timeframe', tf).order('start_time', { ascending: false }).limit(1);
        out[`${s}|${tf}`] = { count: count ?? 0, first: first.data?.[0]?.start_time ?? null, last: last.data?.[0]?.start_time ?? null };
      }
    }
    return out;
  }

  @Get('definitions')
  definitions() {
    return { version: DEFINITIONS_VERSION, rules: RULE_DEFINITIONS_V1, ruleIds: RULE_IDS, costModel: COST_MODEL_V1, gate: GATE_V1 };
  }

  private async wrap<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.status) throw new HttpException(err.message, err.status);
      throw err;
    }
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

import { Body, Controller, Get, HttpException, HttpStatus, MessageEvent, Param, Post, Query, Sse } from '@nestjs/common';
import { interval, map, merge, Observable, of } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';
import { toApiSignal } from '../scanner/signalMapper.js';
import { reconcileOutcomes } from '../scanner/outcomes/reconcileOutcomes.js';
import { istDateString, istDayRange, isValidDateString } from '../scanner/time/ist.js';

const SSE_HEARTBEAT_MS = 25_000;

@Controller('api/v1/scanner')
export class ScannerController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly scanner: ScannerService,
  ) {}

  @Get('top-setups')
  async getTopSetups(@Query('include') include?: string) {
    const client = this.requireClient();
    const { dayStart } = istDayRange(istDateString());

    let { data, error } = await client
      .from('signals')
      .select('*')
      .gte('created_at', dayStart.toISOString());

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (data) {
      // Every open plan first (by confidence), then today's closed plans, newest exit first (spec 0010 AC-8).
      const open = data.filter(s => (s.status || 'ACTIVE') === 'ACTIVE')
        .sort((a, b) => (b.snapshot_json?.confidence || 0) - (a.snapshot_json?.confidence || 0));
      const closed = data.filter(s => s.status && s.status !== 'ACTIVE')
        .sort((a, b) => String(b.exit_at ?? '').localeCompare(String(a.exit_at ?? '')));
      data = [...open, ...closed].slice(0, 200);
    }

    const signals = (data || []).map(toApiSignal);
    if (include === 'approaching') {
      return { data: signals, approaching: this.scanner.getApproachingSetups() };
    }
    return { data: signals };
  }

  @Get('approaching')
  getApproaching() {
    return { data: this.scanner.getApproachingSetups() };
  }

  @Get('momentum')
  getMomentum() {
    return { watching: this.scanner.latestTicks.size, data: this.scanner.getMomentumRanking() };
  }

  /** Pushes `signal:new`, `approaching:update` and `momentum:update`; Nest unsubscribes on client disconnect. */
  @Sse('stream')
  stream(): Observable<MessageEvent> {
    const snapshot: Observable<MessageEvent> = of(
      { type: 'approaching:update', data: this.scanner.getApproachingSetups() },
      { type: 'momentum:update', data: { watching: this.scanner.latestTicks.size, stocks: this.scanner.getMomentumRanking() } },
    );
    const live = this.scanner.events$.pipe(map((event): MessageEvent => ({ type: event.type, data: event.data })));
    const heartbeat = interval(SSE_HEARTBEAT_MS).pipe(map((): MessageEvent => ({ type: 'heartbeat', data: '' })));
    return merge(snapshot, live, heartbeat);
  }

  @Get('analysis/:symbol')
  async getAnalysis(@Param('symbol') rawSymbol: string) {
    const client = this.requireClient();
    const symbol = rawSymbol.toUpperCase();
    const { dayStart } = istDayRange(istDateString());

    const { data, error } = await client
      .from('signals')
      .select('*')
      .eq('snapshot_json->>symbol', symbol)
      .gte('created_at', dayStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const signal = data?.[0] ? toApiSignal(data[0]) : undefined;
    const approaching = this.scanner.getApproachingSetup(symbol);
    if (!signal && !approaching) {
      throw new HttpException(`No signal or approaching setup for ${symbol} today`, HttpStatus.NOT_FOUND);
    }
    return { signal, approaching };
  }

  @Get('outcomes')
  async getOutcomes(@Query('date') date?: string) {
    const client = this.requireClient();
    const day = this.parseDate(date);
    const { dayStart, dayEnd } = istDayRange(day);

    const { data, error } = await client
      .from('signals')
      .select('*')
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!data || data.length === 0) {
      throw new HttpException(`No signals fired on ${day}`, HttpStatus.NOT_FOUND);
    }

    const outcomes = data.map(row => ({
      ...toApiSignal(row),
      actualHigh: numberOrNull(row.actual_high),
      actualLow: numberOrNull(row.actual_low),
      actualClose: numberOrNull(row.actual_close),
      outcomeStatus: row.outcome_status ?? null,
      outcomePnlPct: numberOrNull(row.outcome_pnl_pct),
    }));

    return {
      date: day,
      data: outcomes,
      summary: {
        total: outcomes.length,
        winners: outcomes.filter(o => o.outcomeStatus === 'WON').length,
        losers: outcomes.filter(o => o.outcomeStatus === 'LOST').length,
        neutral: outcomes.filter(o => o.outcomeStatus === 'NEUTRAL').length,
        pending: outcomes.filter(o => o.outcomeStatus === null).length,
      },
    };
  }

  @Post('reconcile')
  async reconcile(@Body() body: { date?: string } = {}) {
    const client = this.requireClient();
    const day = this.parseDate(body?.date);
    try {
      const { reconciled } = await reconcileOutcomes(client, day);
      return { date: day, reconciled };
    } catch (err: any) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private requireClient() {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.supabase.client;
  }

  private parseDate(date?: string): string {
    if (!date) return istDateString();
    if (!isValidDateString(date)) {
      throw new HttpException('date must be YYYY-MM-DD', HttpStatus.BAD_REQUEST);
    }
    return date;
  }
}

function numberOrNull(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

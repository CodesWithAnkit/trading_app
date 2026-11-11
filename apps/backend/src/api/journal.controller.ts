import { BadRequestException, Body, ConflictException, Controller, Get, HttpException, HttpStatus, NotFoundException, Param, Patch, Post } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/decorators.js';
import { RiskService } from '../risk/risk.service.js';
import { realizedPnl } from '../risk/sizing.js';

const CLOSE_STATUSES = ['WON', 'LOST', 'CANCELLED'] as const;
type CloseStatus = (typeof CLOSE_STATUSES)[number];

/**
 * Trade journal (spec 0028). The backend uses the service role client, which bypasses RLS,
 * so every query filters by the JWT user in code (AC-12). `realized_pnl` is only ever
 * computed here, never accepted from the client.
 */
@Controller('api/v1/journal')
export class JournalController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly risk: RiskService,
  ) {}

  private client() {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return this.supabase.client;
  }

  @Get()
  async getJournalEntries(@CurrentUser() user: AuthUser) {
    const { data, error } = await this.client()
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // AC-11: legacy rows are flagged, never guessed.
    const rows = (data ?? []).map(r => ({
      ...r,
      flags: [...(r.quantity == null ? ['NO_QUANTITY'] : []), ...(r.direction == null ? ['CHECK_DIRECTION'] : [])],
    }));
    return { data: rows };
  }

  @Post()
  async createJournalEntry(@CurrentUser() user: AuthUser, @Body() body: any) {
    const entry = parseNewEntry(body);
    const { data, error } = await this.client()
      .from('journal_entries')
      .insert({ ...entry, user_id: user.id, status: 'PENDING' })
      .select()
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.risk.notify(user.id);
    return data;
  }

  /** AC-9: close a PENDING entry once. A second close gets 409; someone else's entry gets 404. */
  @Patch(':id')
  async closeJournalEntry(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: any) {
    const db = this.client();
    const status = body?.status as CloseStatus;
    if (!CLOSE_STATUSES.includes(status)) throw new BadRequestException('status must be WON, LOST or CANCELLED.');

    const { data: row, error: readError } = await db
      .from('journal_entries')
      .select('id,status,direction,quantity,entry_price')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (readError) throw new HttpException(readError.message, HttpStatus.INTERNAL_SERVER_ERROR);
    if (!row) throw new NotFoundException('Journal entry not found.');
    if (row.status !== 'PENDING') throw new ConflictException('This entry is already closed.');

    const quantity = body?.quantity === undefined ? row.quantity : body.quantity;
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
      throw new BadRequestException('quantity must be a whole number of 1 or more.');
    }

    const now = new Date().toISOString();
    let update: Record<string, unknown>;
    if (status === 'CANCELLED') {
      update = { status, quantity, exit_price: null, exit_at: now, realized_pnl: 0 };
    } else {
      const exit = body?.exit_price;
      if (typeof exit !== 'number' || !Number.isFinite(exit) || exit <= 0) {
        throw new BadRequestException('exit_price is required to mark a trade WON or LOST.');
      }
      if (!row.direction) throw new BadRequestException('Set the direction before closing this entry.');
      if (quantity === null) throw new BadRequestException('Set the quantity before closing this entry.');
      update = {
        status,
        quantity,
        exit_price: exit,
        exit_at: now,
        realized_pnl: realizedPnl(row.direction, Number(row.entry_price), exit, quantity),
      };
    }

    // One conditional update: only a still PENDING row moves, so two quick closes can't both win.
    const { data, error } = await db
      .from('journal_entries')
      .update(update)
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .select()
      .maybeSingle();
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    if (!data) throw new ConflictException('This entry is already closed.');

    this.risk.notify(user.id);
    return data;
  }
}

/** POST body: the existing snake_case fields plus direction and quantity (AC-9). */
export function parseNewEntry(body: any) {
  const b = body ?? {};
  const str = (k: string) => (typeof b[k] === 'string' && b[k].trim() ? b[k].trim() : null);
  const pos = (k: string) => (typeof b[k] === 'number' && Number.isFinite(b[k]) && b[k] > 0 ? b[k] : null);
  const symbol = str('symbol');
  const strategy_name = str('strategy_name');
  const entry_price = pos('entry_price');
  const stop_price = pos('stop_price');
  const target_price = pos('target_price');
  const direction = b.direction === 'LONG' || b.direction === 'SHORT' ? b.direction : null;
  const quantity = Number.isInteger(b.quantity) && b.quantity >= 1 ? b.quantity : null;
  const missing = Object.entries({ symbol, strategy_name, entry_price, stop_price, target_price, direction, quantity })
    .filter(([, v]) => v === null)
    .map(([k]) => k);
  if (missing.length) throw new BadRequestException(`Missing or invalid: ${missing.join(', ')}.`);
  return {
    symbol,
    strategy_name,
    entry_price,
    stop_price,
    target_price,
    direction,
    quantity,
    signal_id: typeof b.signal_id === 'string' ? b.signal_id : null,
    notes: typeof b.notes === 'string' ? b.notes : null,
  };
}

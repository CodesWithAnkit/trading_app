import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/decorators.js';
import { RiskService } from '../risk/risk.service.js';
import { sizeSignal } from '../risk/sizing.js';

@Controller('api/v1/signals')
export class SignalsController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly risk: RiskService,
  ) {}

  @Get()
  async getSignals(@CurrentUser() user: AuthUser, @Query('status') status?: string) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    let query = this.supabase.client.from('signals').select('*');
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    // spec 0028 AC-6: each row carries the caller's verdict.
    const ctx = await this.risk.contextFor(user.id);
    const rows = (data || []).map(row => ({ ...row, risk: sizeSignal(row, ctx) }));
    return { data: rows, meta: { total: rows.length } };
  }

  @Get(':id')
  async getSignalById(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data, error } = await this.supabase.client.from('signals').select('*').eq('id', id).single();
    if (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
    return { ...data, risk: sizeSignal(data, await this.risk.contextFor(user.id)) };
  }
}


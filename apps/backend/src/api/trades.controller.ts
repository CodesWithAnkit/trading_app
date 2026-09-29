import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { mockTrades } from './mock-trades.data.js';

@Controller('api/v1/trades')
export class TradesController {
  constructor(private readonly supabase: SupabaseService) {}
  
  @Get()
  async getTrades() {
    return { data: mockTrades, meta: { total: mockTrades.length } };
  }

  @Post()
  async createTrade(@Body() createTradeDto: any) {
    return { id: 'new-trade-id', ...createTradeDto };
  }

  @Post('validate-entry')
  async validateEntry(@Body() validateDto: any) {
    return { valid: true, risk: { total: 0 } };
  }

  @Post(':id/exits')
  async exitTrade(@Param('id') id: string, @Body() exitDto: any) {
    return { tradeId: id, status: 'exited' };
  }
}

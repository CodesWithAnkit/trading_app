import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('api/v1/candles')
export class CandlesController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('timeframe') timeframe: string,
    @Query('limit') limit = '50'
  ) {
    if (!symbol) {
      throw new BadRequestException('symbol is required');
    }
    if (!timeframe || (timeframe !== '1m' && timeframe !== '5m')) {
      throw new BadRequestException('timeframe must be 1m or 5m');
    }

    if (!this.supabase.client) {
      throw new BadRequestException('Database not available');
    }

    const { data, error, count } = await this.supabase.client
      .from('candles')
      .select('*', { count: 'exact' })
      .eq('symbol', symbol)
      .eq('timeframe', timeframe)
      .order('start_time', { ascending: false })
      .limit(parseInt(limit, 10));

    if (error) {
      throw new BadRequestException(`Failed to fetch candles: ${error.message}`);
    }

    // Return in ascending chronological order for charts
    const sortedData = (data || []).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return {
      data: sortedData,
      meta: { total: count || 0 }
    };
  }
}

import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('api/v1/trades')
export class TradesController {
  constructor(private readonly supabase: SupabaseService) {}
  
  @Get()
  async getTrades() {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data, error } = await this.supabase.client.from('trades').select('*');
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return { data: data || [], meta: { total: data?.length || 0 } };
  }

  @Post()
  async createTrade(@Body() createTradeDto: any) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data, error } = await this.supabase.client
      .from('trades')
      .insert([createTradeDto])
      .select()
      .single();
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return data;
  }

  @Post('validate-entry')
  async validateEntry(@Body() validateDto: any) {
    return { valid: true, risk: { total: 0 } };
  }

  @Post(':id/exits')
  async exitTrade(@Param('id') id: string, @Body() exitDto: any) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data, error } = await this.supabase.client
      .from('trades')
      .update({ status: 'CLOSED', ...exitDto })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
    return data;
  }
}

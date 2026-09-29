import { Controller, Get, Param, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('api/v1/signals')
export class SignalsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async getSignals(@Query('status') status?: string) {
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
    return { data: data || [], meta: { total: data?.length || 0 } };
  }

  @Get(':id')
  async getSignalById(@Param('id') id: string) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    const { data, error } = await this.supabase.client.from('signals').select('*').eq('id', id).single();
    if (error) {
      throw new HttpException(error.message, HttpStatus.NOT_FOUND);
    }
    return data;
  }
}


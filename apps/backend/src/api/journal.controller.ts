import { Controller, Get, Post, Body, HttpException, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('api/v1/journal')
export class JournalController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async getJournalEntries() {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    const { data, error } = await this.supabase.client
      .from('journal_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return { data };
  }

  @Post()
  async createJournalEntry(@Body() body: any) {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // Usually we would extract auth.uid() from JWT, but assuming RLS is handled or passed.
    // For now, we will just insert.
    const {
      symbol,
      strategy_name,
      entry_price,
      stop_price,
      target_price,
      notes
    } = body;

    const { data, error } = await this.supabase.client
      .from('journal_entries')
      .insert({
        // user_id will be derived by RLS if jwt is passed in headers, but for backend calls we might need service key
        symbol,
        strategy_name,
        entry_price,
        stop_price,
        target_price,
        notes,
        status: 'PENDING'
      })
      .select()
      .single();

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data;
  }
}

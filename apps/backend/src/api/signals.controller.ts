import { Controller, Get, Param, Query } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';
import { mockSignals } from './mock-signals.data.js';

@Controller('api/v1/signals')
export class SignalsController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get()
  async getSignals(@Query('status') status?: string) {
    let data = mockSignals;
    if (status) {
      data = data.filter((s: any) => s.status === status);
    }
    return { data, meta: { total: data.length } };
  }

  @Get(':id')
  async getSignalById(@Param('id') id: string) {
    return mockSignals.find((s: any) => s.id === id) || { id, status: 'mock' };
  }
}


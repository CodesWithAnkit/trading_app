import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  public readonly client: SupabaseClient | null = null;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      this.logger.warn('⚠️ Missing Supabase credentials. Database operations will fail.');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}

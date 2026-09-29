import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ScannerModule } from './scanner/scanner.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { ApiModule } from './api/api.module.js';

@Module({
  imports: [SupabaseModule, ScannerModule, ApiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

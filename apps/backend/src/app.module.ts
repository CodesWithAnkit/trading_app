import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ScannerModule } from './scanner/scanner.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { ApiModule } from './api/api.module.js';
import { IntelligenceModule } from './intelligence/intelligence.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule, ScannerModule, ApiModule, IntelligenceModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

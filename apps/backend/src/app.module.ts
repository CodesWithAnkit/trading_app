import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ScannerModule } from './scanner/scanner.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';
import { ApiModule } from './api/api.module.js';
import { IntelligenceModule } from './intelligence/intelligence.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BacktestModule } from './backtest/backtest.module.js';
import { ScorecardModule } from './scorecard/scorecard.module.js';

@Module({
  imports: [ScheduleModule.forRoot(), SupabaseModule, AuthModule, ScannerModule, ApiModule, IntelligenceModule, BacktestModule, ScorecardModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

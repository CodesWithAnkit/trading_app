import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service.js';
import { GuruLiveService } from './guru-live/guruLive.service.js';
import { BacktestModule } from '../backtest/backtest.module.js';
import { NewsGateModule } from '../intelligence/news/news-gate.module.js';

@Module({
  imports: [BacktestModule, NewsGateModule],
  providers: [ScannerService, GuruLiveService],
  exports: [ScannerService],
})
export class ScannerModule {}

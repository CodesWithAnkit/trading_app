import { Module } from '@nestjs/common';
import { ScannerService } from './scanner.service.js';
import { GuruLiveService } from './guru-live/guruLive.service.js';
import { BacktestModule } from '../backtest/backtest.module.js';

@Module({
  imports: [BacktestModule],
  providers: [ScannerService, GuruLiveService],
  exports: [ScannerService],
})
export class ScannerModule {}

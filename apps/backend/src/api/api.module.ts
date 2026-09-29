import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller.js';
import { TradesController } from './trades.controller.js';
import { MarketController } from './market.controller.js';
import { ScannerDiagnosticsController } from './scanner-diagnostics.controller.js';
import { CandlesController } from './candles.controller.js';
import { ScannerModule } from '../scanner/scanner.module.js';

@Module({
  imports: [ScannerModule],
  controllers: [SignalsController, TradesController, MarketController, ScannerDiagnosticsController, CandlesController],
})
export class ApiModule {}

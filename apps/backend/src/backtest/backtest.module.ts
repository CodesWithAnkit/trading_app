import { Module } from '@nestjs/common';
import { BacktestController } from './backtest.controller.js';
import { BacktestService } from './backtest.service.js';
import { LiveStatusRegistry } from './live/liveToggles.js';

@Module({
  controllers: [BacktestController],
  providers: [BacktestService, { provide: LiveStatusRegistry, useValue: new LiveStatusRegistry() }],
  exports: [LiveStatusRegistry],
})
export class BacktestModule {}

import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller.js';
import { TradesController } from './trades.controller.js';

@Module({
  controllers: [SignalsController, TradesController],
})
export class ApiModule {}

import { Module } from '@nestjs/common';
import { RiskController } from './risk.controller.js';
import { RiskService } from './risk.service.js';

/** Spec 0028: position sizing and risk limits. Exported so signal and journal routes attach verdicts and notify. */
@Module({
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}

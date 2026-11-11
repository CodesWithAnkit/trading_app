import { Module } from '@nestjs/common';
import { ScorecardController } from './scorecard.controller.js';
import { ScorecardService } from './scorecard.service.js';

/** Spec 0027: Signal Scorecard (read only aggregation over reconciled signals). */
@Module({
  controllers: [ScorecardController],
  providers: [ScorecardService],
})
export class ScorecardModule {}

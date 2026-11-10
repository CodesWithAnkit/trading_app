import { Module } from '@nestjs/common';
import { NewsGateService } from './news-gate.service.js';

/** Spec 0025: the live news gate, shared by the scanner and the intelligence module. */
@Module({
  providers: [NewsGateService],
  exports: [NewsGateService],
})
export class NewsGateModule {}

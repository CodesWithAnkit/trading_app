import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ScannerModule } from '../scanner/scanner.module.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { InstitutionalContextService } from './institutional-context.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import { IntelligenceController } from './intelligence.controller.js';

@Module({
  imports: [SupabaseModule, ScannerModule],
  controllers: [IntelligenceController],
  providers: [
    MarketBreadthService,
    OfficialFilingsAndNewsService,
    InstitutionalContextService,
    ExplainableAnalysisService,
  ],
  exports: [
    MarketBreadthService,
    OfficialFilingsAndNewsService,
    InstitutionalContextService,
    ExplainableAnalysisService,
  ],
})
export class IntelligenceModule {}

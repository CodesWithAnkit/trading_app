import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { ScannerModule } from '../scanner/scanner.module.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { InstitutionalContextService } from './institutional-context.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import { NewsIngestionService } from './news/news-ingestion.service.js';
import { IntelligenceController } from './intelligence.controller.js';
import { NewsGateModule } from './news/news-gate.module.js';

@Module({
  imports: [SupabaseModule, ScannerModule, NewsGateModule],
  controllers: [IntelligenceController],
  providers: [
    MarketBreadthService,
    OfficialFilingsAndNewsService,
    InstitutionalContextService,
    ExplainableAnalysisService,
    NewsIngestionService,
  ],
  exports: [
    MarketBreadthService,
    OfficialFilingsAndNewsService,
    InstitutionalContextService,
    ExplainableAnalysisService,
  ],
})
export class IntelligenceModule {}

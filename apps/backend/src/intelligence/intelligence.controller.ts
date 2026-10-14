import { Controller, Get, Param, Query } from '@nestjs/common';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { InstitutionalContextService } from './institutional-context.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import type {
  ExplainableAnalysisContract,
  InstitutionalContextContract,
  MarketContextContract,
  NewsFilingsResponseContract,
} from './contracts/intelligence.contract.js';

@Controller('api/v1/intelligence')
export class IntelligenceController {
  constructor(
    private readonly marketBreadth: MarketBreadthService,
    private readonly newsService: OfficialFilingsAndNewsService,
    private readonly institutionalService: InstitutionalContextService,
    private readonly explainableAnalysis: ExplainableAnalysisService,
  ) {}

  @Get('context')
  getContext(): MarketContextContract {
    return this.marketBreadth.getMarketContext();
  }

  @Get('news')
  async getNews(@Query('symbol') symbol?: string): Promise<NewsFilingsResponseContract> {
    return this.newsService.getNews(symbol);
  }

  @Get('institutional')
  async getInstitutional(): Promise<InstitutionalContextContract> {
    return this.institutionalService.getInstitutionalContext();
  }

  @Get('analysis/:symbol')
  async getAnalysis(@Param('symbol') symbol: string): Promise<ExplainableAnalysisContract> {
    return this.explainableAnalysis.getAnalysis(symbol);
  }
}

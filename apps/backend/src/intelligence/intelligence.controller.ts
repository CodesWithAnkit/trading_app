import { Body, Controller, Get, HttpCode, HttpException, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard.js';
import { CurrentUser, type AuthUser } from '../auth/decorators.js';
import { NewsIngestionService, type ScheduleState } from './news/news-ingestion.service.js';
import type { FetchRunContract, RunStatus } from './news/news.types.js';
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
    private readonly newsIngestion: NewsIngestionService,
  ) {}

  @Get('context')
  getContext(): MarketContextContract {
    return this.marketBreadth.getMarketContext();
  }

  @Get('news')
  async getNews(@Query('symbol') symbol?: string): Promise<NewsFilingsResponseContract> {
    return this.newsService.getNews(symbol);
  }

  /** Spec 0024 AC-1: run a fetch now (admin only, 60 s cooldown, one run at a time). */
  @Post('news/fetch')
  @UseGuards(AdminGuard)
  @HttpCode(202)
  async fetchNews(@CurrentUser() user: AuthUser): Promise<{ runId: string; status: RunStatus }> {
    const { runId, status } = await this.newsIngestion.requestManualFetch(user?.id ?? null);
    return { runId, status };
  }

  /** Spec 0024 AC-8: the latest fetch run with its per source result. */
  @Get('news/fetch-runs/latest')
  async latestFetchRun(): Promise<FetchRunContract | null> {
    return this.newsIngestion.getLatestRun();
  }

  /** Spec 0024 AC-10: cancel the running fetch (admin only). */
  @Post('news/fetch-runs/:id/cancel')
  @UseGuards(AdminGuard)
  async cancelFetch(@Param('id') id: string): Promise<{ runId: string; status: RunStatus }> {
    return this.newsIngestion.cancelRun(id);
  }

  /** Spec 0024 AC-11: whether the scheduled fetch is paused (any signed in user). */
  @Get('news/schedule')
  async getNewsSchedule(): Promise<ScheduleState> {
    return this.newsIngestion.getSchedule();
  }

  /** Spec 0024 AC-11: pause or resume the scheduled fetch (admin only). */
  @Put('news/schedule')
  @UseGuards(AdminGuard)
  async setNewsSchedule(@Body() body: { paused?: unknown }, @CurrentUser() user: AuthUser): Promise<ScheduleState> {
    if (typeof body?.paused !== 'boolean') throw new HttpException('paused must be a boolean', 422);
    return this.newsIngestion.setSchedule(body.paused, user?.id ?? null);
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

import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IntelligenceController } from './intelligence.controller.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { InstitutionalContextService } from './institutional-context.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import { NewsIngestionService } from './news/news-ingestion.service.js';
import { AdminGuard } from '../auth/admin.guard.js';

describe('IntelligenceController', () => {
  let controller: IntelligenceController;
  let mockMarketBreadth: any;
  let mockNewsService: any;
  let mockInstitutional: any;
  let mockExplainable: any;

  beforeEach(async () => {
    mockMarketBreadth = {
      getMarketContext: vi.fn().mockReturnValue({
        regime: 'BULLISH_TREND_DAY',
        regimeLabel: 'REGIME 01',
        advanceCount: 150,
        declineCount: 40,
      }),
    };

    mockNewsService = {
      getNews: vi.fn().mockResolvedValue({
        events: [],
        totalCount: 0,
        officialCount: 0,
        highImpactCount: 0,
        lastIngestionAt: new Date().toISOString(),
      }),
    };

    mockInstitutional = {
      getInstitutionalContext: vi.fn().mockResolvedValue({
        flows: { fiiNetCr: 1200, diiNetCr: 800 },
        recentDeals: [],
        disclaimer: 'Delayed EOD',
      }),
    };

    mockExplainable = {
      getAnalysis: vi.fn().mockResolvedValue({
        symbol: 'TATASTEEL',
        qualificationStatus: 'QUALIFIED',
        riskGates: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        { provide: MarketBreadthService, useValue: mockMarketBreadth },
        { provide: OfficialFilingsAndNewsService, useValue: mockNewsService },
        { provide: InstitutionalContextService, useValue: mockInstitutional },
        { provide: ExplainableAnalysisService, useValue: mockExplainable },
        { provide: NewsIngestionService, useValue: { requestManualFetch: vi.fn().mockResolvedValue({ runId: 'r1', status: 'running', started: true }), getLatestRun: vi.fn().mockResolvedValue(null) } },
      ],
    })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntelligenceController>(IntelligenceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // covers: 0017 AC-15, 0018 AC-2
  it('getContext delegates to marketBreadth service', () => {
    const result = controller.getContext();
    expect(mockMarketBreadth.getMarketContext).toHaveBeenCalled();
    expect(result.regime).toBe('BULLISH_TREND_DAY');
  });

  // covers: 0017 AC-15, 0018 AC-2
  it('getNews delegates to news service with query symbol', async () => {
    const result = await controller.getNews('TATASTEEL');
    expect(mockNewsService.getNews).toHaveBeenCalledWith('TATASTEEL');
    expect(result.totalCount).toBe(0);
  });

  // covers: 0024 AC-1, AC-10, AC-11
  it('guards fetch, cancel and schedule changes with AdminGuard, not the schedule read', () => {
    const guards = (name: keyof IntelligenceController) => Reflect.getMetadata('__guards__', IntelligenceController.prototype[name]) ?? [];
    for (const name of ['fetchNews', 'cancelFetch', 'setNewsSchedule'] as const) expect(guards(name)).toContain(AdminGuard);
    expect(guards('getNewsSchedule')).toEqual([]);
    expect(guards('latestFetchRun')).toEqual([]);
  });

  // covers: 0024 AC-1
  it('fetchNews returns only the run id and status', async () => {
    const result = await controller.fetchNews({ id: 'u1', email: null, exp: 0 });
    expect(result).toEqual({ runId: 'r1', status: 'running' });
  });

  // covers: 0017 AC-15, 0018 AC-2
  it('getInstitutional delegates to institutional service', async () => {
    const result = await controller.getInstitutional();
    expect(mockInstitutional.getInstitutionalContext).toHaveBeenCalled();
    expect(result.flows.fiiNetCr).toBe(1200);
  });

  // covers: 0017 AC-15, 0018 AC-2
  it('getAnalysis delegates to explainable analysis service with param symbol', async () => {
    const result = await controller.getAnalysis('TATASTEEL');
    expect(mockExplainable.getAnalysis).toHaveBeenCalledWith('TATASTEEL');
    expect(result.symbol).toBe('TATASTEEL');
    expect(result.qualificationStatus).toBe('QUALIFIED');
  });
});

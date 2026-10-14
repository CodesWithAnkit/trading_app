import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { IntelligenceController } from './intelligence.controller.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { InstitutionalContextService } from './institutional-context.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';

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
      ],
    }).compile();

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

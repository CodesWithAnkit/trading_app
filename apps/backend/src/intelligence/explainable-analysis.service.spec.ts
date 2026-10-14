import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';

describe('ExplainableAnalysisService', () => {
  let service: ExplainableAnalysisService;

  beforeEach(async () => {
    const mockSupabase = {
      client: null,
    };

    const mockMarketBreadth = {
      getMarketContext: vi.fn().mockReturnValue({
        regime: 'BULLISH_TREND_DAY',
        regimeLabel: 'REGIME 01 // BULLISH TREND DAY',
        regimeDescription: 'High conviction directional expansion.',
        regimeConfidence: 88,
        niftyLtp: 24845.6,
        niftyChangePct: 0.85,
        vixLtp: 13.4,
        vixChangePct: -3.5,
        vixStatus: 'LOW_NORMAL',
        advanceCount: 140,
        declineCount: 50,
        unchangedCount: 40,
        advanceDeclineRatio: 2.8,
        pctAboveVwap: 68,
        medianDayChange: 0.85,
        sectors: [
          {
            name: 'NIFTY METAL',
            ltp: 158.4,
            changePct: 2.45,
            alphaVsNifty: 1.6,
            leaderSymbol: 'TATASTEEL',
            leaderChangePct: 2.45,
            advances: 6,
            declines: 1,
            bias: 'LONG',
          },
        ],
        snapshotTime: new Date().toISOString(),
        feedLatencyMs: 45,
        feedHealth: 'HEALTHY',
      }),
    };

    const mockNewsService = {
      getNews: vi.fn().mockResolvedValue({
        events: [
          {
            id: 'news-001',
            symbol: 'TATASTEEL',
            headline: 'Tata Steel Commissions 5 MTPA Blast Furnace Expansion',
            excerpt: 'Commercial production commenced.',
            source: 'NSE NEAPS Regulatory Filing',
            publishedAt: new Date().toISOString(),
            ingestedAt: new Date().toISOString(),
            clockSkewMs: 250,
            eventType: 'OFFICIAL_FILING',
            impactLevel: 'HIGH',
            direction: 'BULLISH',
            confidence: 1.0,
            isOfficialFiling: true,
          },
        ],
        totalCount: 1,
        officialCount: 1,
        highImpactCount: 1,
        lastIngestionAt: new Date().toISOString(),
      }),
    };

    const mockScanner = {
      latestTicks: new Map<string, any>(),
      getApproachingSetup: vi.fn().mockReturnValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExplainableAnalysisService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: MarketBreadthService, useValue: mockMarketBreadth },
        { provide: OfficialFilingsAndNewsService, useValue: mockNewsService },
        { provide: ScannerService, useValue: mockScanner },
      ],
    }).compile();

    service = module.get<ExplainableAnalysisService>(ExplainableAnalysisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('generates complete explainable analysis snapshot with 6 deterministic risk gates', async () => {
    const analysis = await service.getAnalysis('TATASTEEL');
    expect(analysis).toBeDefined();
    expect(analysis.symbol).toBe('TATASTEEL');
    expect(analysis.riskGates.length).toBe(6);
    expect(analysis.riskGates.every(g => ['PASS', 'FAIL', 'WARNING'].includes(g.status))).toBe(true);
    expect(analysis.qualificationStatus).toBe('QUALIFIED');
  });

  it('includes positive evidence categories and contradictory friction factors', async () => {
    const analysis = await service.getAnalysis('TATASTEEL');
    expect(analysis.positiveEvidence.categoryA.length).toBeGreaterThan(0);
    expect(analysis.positiveEvidence.categoryB.length).toBeGreaterThan(0);
    expect(analysis.positiveEvidence.categoryC.length).toBeGreaterThan(0);
    expect(analysis.positiveEvidence.categoryD.length).toBeGreaterThan(0);
    expect(analysis.contradictoryFactors.length).toBeGreaterThan(0);
  });

  it('computes net reward to risk factoring transaction friction', async () => {
    const analysis = await service.getAnalysis('TATASTEEL');
    expect(analysis.tradePlan.estimatedCharges).toBe(40.0);
    expect(analysis.tradePlan.netRewardRisk).toBeGreaterThanOrEqual(1.5);
  });
});

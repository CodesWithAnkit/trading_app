import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NewsGateService } from './news/news-gate.service.js';
import { ExplainableAnalysisService } from './explainable-analysis.service.js';
import { MarketBreadthService } from './market-breadth.service.js';
import { OfficialFilingsAndNewsService } from './official-filings-news.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';

const passVerdict = { result: 'pass', reason: 'No relevant news', itemIds: [], items: [], marketWideOnly: false, ruleVersion: 'news-gate-v1' };
const mockNewsGate = {
  now: () => new Date('2026-11-10T05:30:00.000Z'),
  latestActiveSide: async () => 'LONG',
  evaluate: async (): Promise<any> => passVerdict,
};

/** A gentle 5m uptrend with a small range: price stays near its 20 EMA. */
const trend = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const c = 150 + i * 0.05 + (i % 2 ? 0.1 : -0.1);
    return { open: c, high: c + 0.4, low: c - 0.4, close: c, volume: 1000 };
  });
let candles = trend(60);

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
      getHistory5m: vi.fn(() => candles),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExplainableAnalysisService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: MarketBreadthService, useValue: mockMarketBreadth },
        { provide: OfficialFilingsAndNewsService, useValue: mockNewsService },
        { provide: ScannerService, useValue: mockScanner },
        { provide: NewsGateService, useValue: mockNewsGate },
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

  // covers: 0025 live AC-6
  it('Gate 06 maps news-gate-v1: block to FAIL with the reason, warn to WARNING', async () => {
    const original = mockNewsGate.evaluate;
    mockNewsGate.evaluate = async () => ({ ...passVerdict, result: 'block', reason: 'HIGH Bearish (Rule): SEBI order, 10:40', items: [{ id: 'n1' }] });
    let g = (await service.getAnalysis('TATASTEEL')).riskGates.find(r => r.id === 'GATE-06')!;
    expect(g).toMatchObject({ status: 'FAIL', description: 'HIGH Bearish (Rule): SEBI order, 10:40' });
    mockNewsGate.evaluate = async () => ({ ...passVerdict, result: 'warn', reason: 'News stale' });
    g = (await service.getAnalysis('TATASTEEL')).riskGates.find(r => r.id === 'GATE-06')!;
    expect(g.status).toBe('WARNING');
    mockNewsGate.evaluate = original;
  });

  // covers: 0026 AC-9
  it('Gate 03 is computed from real 5m candles, and reads WARNING "Insufficient candles" under 20', async () => {
    let g = (await service.getAnalysis('TATASTEEL')).riskGates.find(r => r.id === 'GATE-03')!;
    expect(g.status).toBe('PASS');
    expect(g.measuredValue).toMatch(/^-?\d+\.\d\d ATR Distance$/);
    candles = trend(10);
    g = (await service.getAnalysis('TATASTEEL')).riskGates.find(r => r.id === 'GATE-03')!;
    expect(g).toMatchObject({ status: 'WARNING', measuredValue: 'Insufficient candles' });
    candles = trend(60);
  });

  // covers: 0026 AC-10
  it('evidence uses real sector and EMA values only; sourceless lines and the 1.45 fallback are gone', async () => {
    const analysis = await service.getAnalysis('TATASTEEL');
    expect(analysis.sectorRelativeStrength).toBe(1.6);
    expect(analysis.positiveEvidence.categoryB[0].detail).toContain('alpha +1.6%');
    expect(analysis.positiveEvidence.categoryD[0].title).toBe('20 EMA above 50 EMA (5m)');
    expect(analysis.positiveEvidence.categoryA).toEqual([]);
    expect(analysis.positiveEvidence.categoryC).toEqual([]);
    expect(analysis.contradictoryFactors).toEqual([]);
    expect(JSON.stringify(analysis)).not.toMatch(/CVD|R2\)|2\.4x|2\.85x/);
    // A stock outside every sector definition gets no sector line and no alpha.
    const other = await service.getAnalysis('ZOMATO');
    expect(other.sectorRelativeStrength).toBeNull();
    expect(other.positiveEvidence.categoryB).toEqual([]);
  });


  it('computes net reward to risk factoring transaction friction', async () => {
    const analysis = await service.getAnalysis('TATASTEEL');
    expect(analysis.tradePlan.estimatedCharges).toBe(40.0);
    expect(analysis.tradePlan.netRewardRisk).toBeGreaterThanOrEqual(1.5);
  });
});

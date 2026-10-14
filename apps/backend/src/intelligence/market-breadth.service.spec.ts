import { Test, TestingModule } from '@nestjs/testing';
import { MarketBreadthService } from './market-breadth.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { ScannerService } from '../scanner/scanner.service.js';

describe('MarketBreadthService', () => {
  let service: MarketBreadthService;
  let mockSupabase: Partial<SupabaseService>;
  let mockScanner: Partial<ScannerService>;

  beforeEach(async () => {
    mockSupabase = {
      client: null,
    };

    const latestTicks = new Map<string, any>();
    latestTicks.set('TATASTEEL', {
      symbol: 'TATASTEEL',
      ltp: 158.4,
      timestamp: new Date(),
      dayOpen: 155.0,
      volume: 15000000,
      change1dPct: 2.19,
      prevClose: 155.0,
    });
    latestTicks.set('RELIANCE', {
      symbol: 'RELIANCE',
      ltp: 2940.0,
      timestamp: new Date(),
      dayOpen: 2920.0,
      volume: 4500000,
      change1dPct: 0.68,
      prevClose: 2920.0,
    });
    latestTicks.set('TCS', {
      symbol: 'TCS',
      ltp: 4120.0,
      timestamp: new Date(),
      dayOpen: 4150.0,
      volume: 1200000,
      change1dPct: -0.72,
      prevClose: 4150.0,
    });

    mockScanner = {
      latestTicks,
      scannerMetrics: {
        ticksReceived: 100,
        candlesCompleted1m: 50,
        candlesCompleted5m: 10,
        strategyEvaluations: 20,
        eligibleSetups: 5,
        activeSignals: 2,
        lastTickAt: new Date(),
        lastCandleAt: new Date(),
        providerType: 'mock',
        sessionState: 'OPEN',
        uptimeStart: new Date(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketBreadthService,
        { provide: SupabaseService, useValue: mockSupabase },
        { provide: ScannerService, useValue: mockScanner },
      ],
    }).compile();

    service = module.get<MarketBreadthService>(MarketBreadthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calculates market context from ticks', () => {
    const context = service.getMarketContext();
    expect(context).toBeDefined();
    expect(context.advanceCount).toBeGreaterThanOrEqual(1);
    expect(context.declineCount).toBeGreaterThanOrEqual(1);
    expect(context.sectors.length).toBeGreaterThan(0);
    expect(context.feedHealth).toBe('HEALTHY');
  });

  it('calculates sector relative strength with alpha versus Nifty', () => {
    const context = service.getMarketContext();
    const metalSector = context.sectors.find(s => s.name === 'NIFTY METAL');
    expect(metalSector).toBeDefined();
    expect(metalSector?.leaderSymbol).toBeDefined();
    expect(typeof metalSector?.leaderSymbol).toBe('string');
  });
});

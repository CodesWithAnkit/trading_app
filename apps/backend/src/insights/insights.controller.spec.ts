import { Test, TestingModule } from '@nestjs/testing';
import { InsightsController } from './insights.controller.js';
import { NewsService } from './news.service.js';
import { AIPredictionService } from './ai-prediction.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    selectMock: vi.fn().mockReturnThis(),
    insertMock: vi.fn(),
    eqMock: vi.fn().mockReturnThis(),
    gtMock: vi.fn().mockReturnThis(),
    singleMock: vi.fn(),
  };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: mocks.selectMock,
      insert: mocks.insertMock,
      eq: mocks.eqMock,
      gt: mocks.gtMock,
      single: mocks.singleMock,
    }),
  }),
}));

describe('InsightsController', () => {
  let controller: InsightsController;
  let newsService: any;
  let aiService: any;

  beforeEach(async () => {
    newsService = { fetchRecentNews: vi.fn() };
    aiService = { generatePrediction: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InsightsController],
      providers: [
        { provide: NewsService, useValue: newsService },
        { provide: AIPredictionService, useValue: aiService },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    controller = module.get<InsightsController>(InsightsController);
  });

  it('should return cached data if available (covers: AC-3)', async () => {
    mocks.singleMock.mockResolvedValue({ data: { direction: 'Bullish' } });
    const result = await controller.getInsights('RELIANCE');
    expect(result.direction).toBe('Bullish');
    expect(newsService.fetchRecentNews).not.toHaveBeenCalled();
  });

  it('should fetch fresh data and cache it if not found', async () => {
    mocks.singleMock.mockResolvedValue({ data: null });
    newsService.fetchRecentNews.mockResolvedValue([]);
    aiService.generatePrediction.mockResolvedValue({ direction: 'Bearish', confidence_score: 50 });

    const result = await controller.getInsights('RELIANCE');
    expect(result.direction).toBe('Bearish');
    expect(newsService.fetchRecentNews).toHaveBeenCalled();
    expect(mocks.insertMock).toHaveBeenCalled();
  });
});

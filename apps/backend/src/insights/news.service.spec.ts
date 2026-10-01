import { Test, TestingModule } from '@nestjs/testing';
import { NewsService } from './news.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('NewsService', () => {
  let service: NewsService;
  let fetchMock: any;

  beforeEach(async () => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewsService,
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('test-key') },
        },
      ],
    }).compile();

    service = module.get<NewsService>(NewsService);
  });

  it('should fetch news and parse sentiment (covers: AC-1)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        feed: [
          {
            title: 'Test News',
            url: 'http://example.com',
            overall_sentiment_score: '0.8',
            time_published: '20261001T000000',
          },
        ],
      }),
    });

    const result = await service.fetchRecentNews('RELIANCE');
    expect(result).toHaveLength(1);
    expect(result[0].sentiment_score).toBe(0.8);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('RELIANCE'));
  });

  it('should return empty array on failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, statusText: 'Error' });
    const result = await service.fetchRecentNews('RELIANCE');
    expect(result).toEqual([]);
  });
});

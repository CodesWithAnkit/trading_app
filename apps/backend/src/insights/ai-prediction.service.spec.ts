import { Test, TestingModule } from '@nestjs/testing';
import { AIPredictionService } from './ai-prediction.service.js';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateContentMock: vi.fn()
}));

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel() {
        return { generateContent: mocks.generateContentMock };
      }
    }
  };
});

describe('AIPredictionService', () => {
  let service: AIPredictionService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIPredictionService,
        {
          provide: ConfigService,
          useValue: { get: vi.fn().mockReturnValue('fake-key') },
        },
      ],
    }).compile();

    service = module.get<AIPredictionService>(AIPredictionService);
  });

  it('should generate prediction using Gemini (covers: AC-2)', async () => {
    mocks.generateContentMock.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ direction: 'Bullish', confidence_score: 80, summary_text: 'Good' })
      }
    });

    const result = await service.generatePrediction('RELIANCE', []);
    expect(result.direction).toBe('Bullish');
    expect(result.confidence_score).toBe(80);
  });
});

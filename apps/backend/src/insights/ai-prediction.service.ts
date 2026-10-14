import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StockNews } from './news.service.js';

export interface AIPredictionResult {
  direction: 'Bullish' | 'Bearish' | 'Neutral';
  confidence_score: number;
  summary_text: string;
}

@Injectable()
export class AIPredictionService {
  private readonly logger = new Logger(AIPredictionService.name);
  private readonly geminiApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.geminiApiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
  }

  async generatePrediction(symbol: string, news: StockNews[]): Promise<AIPredictionResult> {
    this.logger.log(`Generating AI prediction using Gemini for ${symbol}...`);
    
    if (!this.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    
    const newsContext = news.length > 0 
      ? news.map(n => `- ${n.title} (Sentiment: ${n.sentiment_score})`).join('\n')
      : 'No recent news available.';
    
    const genAI = new GoogleGenerativeAI(this.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const prompt = `You are a financial analyst AI. Analyze the following recent news and sentiment scores for the stock symbol ${symbol}.
Determine the short-term market movement prediction. 

News:
${newsContext}

Return ONLY a valid JSON object matching this TypeScript interface (no markdown tags, no extra text):
{
  "direction": "Bullish" | "Bearish" | "Neutral",
  "confidence_score": number (0 to 100),
  "summary_text": "A brief 2-3 sentence summary of your reasoning."
}`;

    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean up markdown if the model wrapped it in ```json ... ```
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(cleanedText) as AIPredictionResult;
    } catch (error) {
      this.logger.error(`Failed to generate AI prediction for ${symbol}: ${error}`);
      return {
        direction: 'Neutral',
        confidence_score: 50,
        summary_text: 'Failed to generate prediction due to an error.'
      };
    }
  }
}

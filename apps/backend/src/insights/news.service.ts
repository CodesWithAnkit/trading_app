import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface StockNews {
  title: string;
  url: string;
  sentiment_score: number;
  published_at: string;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly alphaVantageApiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.alphaVantageApiKey = this.configService.get<string>('ALPHA_VANTAGE_API_KEY') || 'demo';
  }

  async fetchRecentNews(symbol: string): Promise<StockNews[]> {
    this.logger.log(`Fetching Alpha Vantage news for ${symbol}...`);
    
    try {
      const response = await fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.alphaVantageApiKey}`);
      
      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.feed) {
        this.logger.warn(`No news feed found for ${symbol}. Returning empty array.`);
        return [];
      }
      
      return data.feed.slice(0, 10).map((item: any) => ({
        title: item.title,
        url: item.url,
        sentiment_score: parseFloat(item.overall_sentiment_score) || 0,
        published_at: item.time_published
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch news for ${symbol}: ${error}`);
      return [];
    }
  }
}

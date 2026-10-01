import { Controller, Get, Param, Logger } from '@nestjs/common';
import { NewsService } from './news.service.js';
import { AIPredictionService } from './ai-prediction.service.js';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

@Controller('api/insights')
export class InsightsController {
  private readonly logger = new Logger(InsightsController.name);
  private supabase;

  constructor(
    private readonly newsService: NewsService,
    private readonly aiPredictionService: AIPredictionService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL') || '';
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || '';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  @Get(':symbol')
  async getInsights(@Param('symbol') symbol: string) {
    this.logger.log(`Fetching insights for ${symbol}`);
    
    // 1. Check Supabase Cache
    const { data: cached } = await this.supabase
      .from('ai_predictions')
      .select('*')
      .eq('symbol', symbol)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      this.logger.log(`Cache hit for ${symbol}`);
      return cached;
    }

    this.logger.log(`Cache miss for ${symbol}, fetching fresh data...`);
    
    // 2. Fetch fresh news
    const news = await this.newsService.fetchRecentNews(symbol);
    
    // 3. Generate AI prediction
    const prediction = await this.aiPredictionService.generatePrediction(symbol, news);
    
    // 4. Save to cache (TTL: 2 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 2);
    
    const dbRecord = {
      symbol,
      direction: prediction.direction,
      confidence_score: prediction.confidence_score,
      summary_text: prediction.summary_text,
      expires_at: expiresAt.toISOString(),
    };

    await this.supabase.from('ai_predictions').insert(dbRecord);

    return dbRecord;
  }
}

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('api/v1/scanner')
export class ScannerController {
  constructor(private readonly supabase: SupabaseService) {}

  @Get('top-setups')
  async getTopSetups() {
    if (!this.supabase.client) {
      throw new HttpException('Database not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    
    // Fetch signals generated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let { data, error } = await this.supabase.client
      .from('signals')
      .select('*')
      .gte('created_at', today.toISOString());

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (data) {
      data.sort((a, b) => (b.snapshot_json?.confidence || 0) - (a.snapshot_json?.confidence || 0));
      data = data.slice(0, 10);
    }

    return {
      data: (data || []).map(signal => {
        const snap = signal.snapshot_json || {};
        const referenceEntry = snap.reference_entry || signal.entry_low || 0;
        
        let entryZone = { low: signal.entry_low || referenceEntry * 0.9995, high: signal.entry_high || referenceEntry * 1.0005 };
        
        let stop = snap.stop?.level || referenceEntry * 0.99;
        
        let targets = snap.targets || { t1: signal.target_1 };
        
        let metrics = snap.metrics || { relativeVolume: "1x", trendAlignment: "Neutral", volatility: "Normal", liquidity: "High", riskReward: "1:2" };

        return {
          id: signal.id,
          symbol: snap.symbol,
          exchange: snap.exchange || "NSE",
          direction: signal.direction,
          setup: signal.setup_family,
          status: signal.status || "ACTIVE",
          price: snap.price || referenceEntry,
          entryZone,
          referenceEntry,
          stop,
          targets,
          confidence: snap.confidence,
          confidenceBand: snap.confidence_band || "MEDIUM",
          createdAt: signal.created_at,
          expiresAt: snap.expires_at || new Date(Date.now() + 1800000).toISOString(),
          rationale: snap.rationale || "Automated Strategy",
          metrics
        }
      })
    };
  }
}

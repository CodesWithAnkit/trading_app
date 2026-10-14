import { Controller, Get } from '@nestjs/common';
import { ScannerService } from '../scanner/scanner.service.js';

@Controller('api/v1/market')
export class MarketController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('status')
  getStatus() {
    const metrics = this.scannerService.scannerMetrics;
    
    let status = 'SIMULATED';
    if (metrics.providerType !== 'mock') {
      if (metrics.sessionState === 'CLOSED') {
        status = 'MARKET_CLOSED';
      } else {
        const now = Date.now();
        const lastTickTime = metrics.lastTickAt ? metrics.lastTickAt.getTime() : 0;
        
        if (lastTickTime === 0) {
          status = 'DISCONNECTED'; // Or CONNECTING, but DISCONNECTED implies no ticks yet
        } else if (now - lastTickTime < 60000) {
          status = 'LIVE';
        } else if (now - lastTickTime < 300000) {
          status = 'DELAYED';
        } else {
          status = 'STALE';
        }
      }
    }

    return {
      status,
      lastTickAt: metrics.lastTickAt,
      subscribedCount: this.scannerService.latestTicks.size, // Approximation of active subs with data
      sessionState: metrics.sessionState,
      providerType: metrics.providerType,
      serverTime: new Date().toISOString()
    };
  }

  @Get('watch')
  getWatch() {
    const instruments = Array.from(this.scannerService.latestTicks.values()).map(tick => {
      const now = Date.now();
      const lastTickTime = tick.timestamp.getTime();
      let status = 'UNAVAILABLE';
      
      if (lastTickTime > 0) {
        if (now - lastTickTime < 60000) status = 'LIVE';
        else status = 'STALE';
      }

      return {
        symbol: tick.symbol,
        ltp: tick.ltp,
        dayOpen: tick.dayOpen,
        change1dPct: tick.change1dPct,
        volume: tick.volume,
        lastTickAt: tick.timestamp,
        status
      };
    });

    return { instruments };
  }
}

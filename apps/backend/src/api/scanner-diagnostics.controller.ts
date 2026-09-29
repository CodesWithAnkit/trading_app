import { Controller, Get, ForbiddenException } from '@nestjs/common';
import { ScannerService } from '../scanner/scanner.service.js';

@Controller('api/v1/scanner')
export class ScannerDiagnosticsController {
  constructor(private readonly scannerService: ScannerService) {}

  @Get('diagnostics')
  getDiagnostics() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Diagnostics are not available in production');
    }

    const metrics = this.scannerService.scannerMetrics;
    const uptimeSeconds = Math.floor((Date.now() - metrics.uptimeStart.getTime()) / 1000);
    const ticksPerMinute = uptimeSeconds > 0 ? (metrics.ticksReceived / uptimeSeconds) * 60 : 0;

    return {
      ticksPerMinute: Math.round(ticksPerMinute),
      candles1m: metrics.candlesCompleted1m,
      candles5m: metrics.candlesCompleted5m,
      strategyEvaluations: metrics.strategyEvaluations,
      eligibleSetups: metrics.eligibleSetups,
      activeSignals: metrics.activeSignals,
      lastTickAt: metrics.lastTickAt,
      lastCandleAt: metrics.lastCandleAt,
      sessionState: metrics.sessionState,
      providerType: metrics.providerType,
      uptime: uptimeSeconds,
      universe: this.scannerService.getUniverseStatus()
    };
  }
}

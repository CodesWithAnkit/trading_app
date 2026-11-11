import { BadRequestException, Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/decorators.js';
import { nextIstMidnight, RiskService } from './risk.service.js';
import type { RiskLimits } from './sizing.js';

const FIELDS: (keyof RiskLimits)[] = ['riskPerTrade', 'dailyLossLimit', 'maxOpenTrades', 'maxCapitalPerTrade'];

/** Spec 0028: risk limits (Settings) and today's risk context. Behind the global JWT guard. */
@Controller('api/v1')
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Get('settings/risk')
  getLimits(@CurrentUser() user: AuthUser) {
    return this.risk.limitsFor(user.id);
  }

  @Patch('settings/risk')
  updateLimits(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.risk.updateLimits(user.id, parseLimitsPatch(body));
  }

  @Get('risk/context')
  async context(@CurrentUser() user: AuthUser) {
    const ctx = await this.risk.contextFor(user.id);
    return { ...ctx, resetsAt: nextIstMidnight() };
  }
}

/** Only known numeric fields pass; anything else is a 400, never silently written. */
export function parseLimitsPatch(body: Record<string, unknown> | null | undefined): Partial<RiskLimits> {
  if (!body || typeof body !== 'object') throw new BadRequestException('Send at least one limit.');
  const patch: Partial<RiskLimits> = {};
  for (const [k, v] of Object.entries(body)) {
    if (!FIELDS.includes(k as keyof RiskLimits)) throw new BadRequestException(`Unknown field: ${k}`);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new BadRequestException(`${k} must be a number.`);
    patch[k as keyof RiskLimits] = v;
  }
  if (Object.keys(patch).length === 0) throw new BadRequestException('Send at least one limit.');
  return patch;
}

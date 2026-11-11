import { BadRequestException, Body, Controller, Get, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/decorators.js';
import { isValidDateString } from '../scanner/time/ist.js';
import { defaultRange, ScorecardService } from './scorecard.service.js';
import type { ScorecardQuery } from './scorecard.service.js';

/** Spec 0027: the Signal Scorecard. Every route sits behind the global JWT guard. */
@Controller('api/v1')
export class ScorecardController {
  constructor(private readonly scorecard: ScorecardService) {}

  @Get('scorecard')
  get(@CurrentUser() user: AuthUser, @Query() raw: Record<string, string | undefined>) {
    return this.scorecard.scorecard(user.id, parseScorecardQuery(raw));
  }

  @Get('settings/scorecard')
  async getSettings(@CurrentUser() user: AuthUser) {
    const { minSample } = await this.scorecard.settingsFor(user.id);
    return { minSample };
  }

  @Patch('settings/scorecard')
  updateSettings(@CurrentUser() user: AuthUser, @Body() body: { minSample?: unknown }) {
    const v = body?.minSample;
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 5) {
      throw new BadRequestException('minSample must be a whole number of 5 or more');
    }
    return this.scorecard.updateMinSample(user.id, v);
  }
}

/** AC-9: validates the filter query; 400 on a bad date or from after to. */
export function parseScorecardQuery(raw: Record<string, string | undefined>, now = new Date()): ScorecardQuery {
  const def = defaultRange(now);
  const all = raw.range === 'all';
  if (raw.range !== undefined && !all) throw new BadRequestException('range must be "all" when given');
  const from = raw.from ?? def.from;
  const to = raw.to ?? def.to;
  if (!all) {
    if (!isValidDateString(from) || !isValidDateString(to)) throw new BadRequestException('from and to must be YYYY-MM-DD');
    if (from > to) throw new BadRequestException('from must not be after to');
  }
  const direction = raw.direction ?? null;
  if (direction !== null && direction !== 'LONG' && direction !== 'SHORT') {
    throw new BadRequestException('direction must be LONG or SHORT');
  }
  return {
    all,
    from,
    to,
    direction,
    strategyIds: list(raw.strategyId),
    strategyVersions: list(raw.strategyVersion),
  };
}

/** Comma separated filter values; blanks dropped, duplicates removed. */
function list(v: string | undefined): string[] {
  return [...new Set((v ?? '').split(',').map(s => s.trim()).filter(Boolean))];
}

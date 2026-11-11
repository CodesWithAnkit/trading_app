import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { parseScorecardQuery } from './scorecard.controller.js';

const now = new Date('2026-11-11T06:00:00.000Z');

describe('parseScorecardQuery (spec 0027 AC-9)', () => {
  it('defaults to the last 30 IST days', () => {
    expect(parseScorecardQuery({}, now)).toMatchObject({ all: false, from: '2026-10-12', to: '2026-11-11', direction: null });
  });

  it('accepts range=all and the optional filters, several values comma separated', () => {
    expect(parseScorecardQuery({ range: 'all', direction: 'SHORT', strategyId: 'guru:orb, scalping,,scalping', strategyVersion: 'v1' }, now))
      .toMatchObject({ all: true, direction: 'SHORT', strategyIds: ['guru:orb', 'scalping'], strategyVersions: ['v1'] });
    expect(parseScorecardQuery({}, now)).toMatchObject({ strategyIds: [], strategyVersions: [] });
  });

  it('rejects from after to, bad dates, bad direction and bad range', () => {
    expect(() => parseScorecardQuery({ from: '2026-11-10', to: '2026-11-01' }, now)).toThrow(BadRequestException);
    expect(() => parseScorecardQuery({ from: '11/10/2026' }, now)).toThrow(BadRequestException);
    expect(() => parseScorecardQuery({ direction: 'UP' }, now)).toThrow(BadRequestException);
    expect(() => parseScorecardQuery({ range: 'week' }, now)).toThrow(BadRequestException);
  });
});

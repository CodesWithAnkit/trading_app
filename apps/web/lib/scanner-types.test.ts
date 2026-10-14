import { describe, it, expect } from 'vitest'
import { formatVolume, isAfterMarketHours, isBeforeMarketOpen, strategyLabel } from './scanner-types'

const ist = (hh: number, mm: number) => new Date(Date.UTC(2026, 8, 30, hh, mm) - 330 * 60_000)

describe('scanner-types helpers', () => {
  it('knows the market is not open yet before 09:15 IST (spec 0009 AC-1)', () => {
    expect(isBeforeMarketOpen(ist(9, 14))).toBe(true)
    expect(isBeforeMarketOpen(ist(9, 15))).toBe(false)
    expect(isBeforeMarketOpen(ist(14, 0))).toBe(false)
  })

  it('treats 15:30 IST onwards as after hours (spec 0009 AC-9)', () => {
    expect(isAfterMarketHours(ist(15, 29))).toBe(false)
    expect(isAfterMarketHours(ist(15, 30))).toBe(true)
  })

  it('formats volume in Indian units', () => {
    expect(formatVolume(950)).toBe('950')
    expect(formatVolume(12_500)).toBe('12.5 K')
    expect(formatVolume(4_830_000)).toBe('48.30 L')
    expect(formatVolume(25_000_000)).toBe('2.50 Cr')
  })

  it('names known strategies and falls back for unknown ones', () => {
    expect(strategyLabel('VWAP_TREND')).toBe('VWAP Breakout')
    expect(strategyLabel('GAP_AND_GO')).toBe('GAP AND GO')
  })
})

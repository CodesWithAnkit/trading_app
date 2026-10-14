import { describe, it, expect } from 'vitest'
import { matchSymbols, searchTarget, MAX_RESULTS } from './symbolSearch'

const LIST = { fno: ['AXISBANK', 'BANKBARODA', 'BANDHANBNK', 'HDFCBANK', 'IDEA', 'M&M', 'RELIANCE', 'BAJAJ-AUTO', '360ONE'], nse: ['TCS'] }

describe('matchSymbols (spec 0012 AC-2, AC-3)', () => {
  it('puts symbols that start with the text first, then ones that contain it, alphabetically', () => {
    expect(matchSymbols(LIST, 'bank')).toEqual({ fno: ['BANKBARODA', 'AXISBANK', 'HDFCBANK'], nse: [] })
  })

  it('is case insensitive and ignores surrounding spaces', () => {
    expect(matchSymbols(LIST, '  rel ')).toEqual({ fno: ['RELIANCE'], nse: [] })
    expect(matchSymbols(LIST, '  tcs ')).toEqual({ fno: [], nse: ['TCS'] })
  })

  it('returns nothing for an empty or blank box', () => {
    expect(matchSymbols(LIST, '')).toEqual({ fno: [], nse: [] })
    expect(matchSymbols(LIST, '   ')).toEqual({ fno: [], nse: [] })
  })

  it('returns nothing when no symbol matches', () => {
    expect(matchSymbols(LIST, 'zzzz')).toEqual({ fno: [], nse: [] })
  })

  it('handles symbols with special characters and leading digits', () => {
    expect(matchSymbols(LIST, 'm&')).toEqual({ fno: ['M&M'], nse: [] })
    expect(matchSymbols(LIST, 'bajaj-')).toEqual({ fno: ['BAJAJ-AUTO'], nse: [] })
    expect(matchSymbols(LIST, '360')).toEqual({ fno: ['360ONE'], nse: [] })
  })

  it('caps the list at 8 results', () => {
    const many = { fno: Array.from({ length: 20 }, (_, i) => `STOCK${String(i).padStart(2, '0')}`), nse: [] }
    expect(matchSymbols(many, 'stock').fno).toHaveLength(MAX_RESULTS)
    expect(MAX_RESULTS).toBe(8)
  })

  it('never lists a symbol twice', () => {
    expect(matchSymbols({ fno: ['IDEA', 'IDEA'], nse: [] }, 'ide')).toEqual({ fno: ['IDEA'], nse: [] })
  })
})

describe('searchTarget (spec 0012 AC-5)', () => {
  it('opens the analysis page for a stock with an open plan', () => {
    expect(searchTarget('RELIANCE', new Set(['RELIANCE']))).toBe('/dashboard/analysis/RELIANCE')
  })

  it('opens the market page otherwise, URL encoding the symbol', () => {
    expect(searchTarget('M&M', new Set())).toBe('/dashboard/markets/M%26M')
  })
})

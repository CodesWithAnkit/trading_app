import { describe, it, expect } from 'vitest'
import { matchSymbols, searchTarget, MAX_RESULTS } from './symbolSearch'

const LIST = ['AXISBANK', 'BANKBARODA', 'BANDHANBNK', 'HDFCBANK', 'IDEA', 'M&M', 'RELIANCE', 'BAJAJ-AUTO', '360ONE']

describe('matchSymbols (spec 0012 AC-2, AC-3)', () => {
  it('puts symbols that start with the text first, then ones that contain it, alphabetically', () => {
    expect(matchSymbols(LIST, 'bank')).toEqual(['BANKBARODA', 'AXISBANK', 'HDFCBANK'])
  })

  it('is case insensitive and ignores surrounding spaces', () => {
    expect(matchSymbols(LIST, '  rel ')).toEqual(['RELIANCE'])
  })

  it('returns nothing for an empty or blank box', () => {
    expect(matchSymbols(LIST, '')).toEqual([])
    expect(matchSymbols(LIST, '   ')).toEqual([])
  })

  it('returns nothing when no symbol matches', () => {
    expect(matchSymbols(LIST, 'zzzz')).toEqual([])
  })

  it('handles symbols with special characters and leading digits', () => {
    expect(matchSymbols(LIST, 'm&')).toEqual(['M&M'])
    expect(matchSymbols(LIST, 'bajaj-')).toEqual(['BAJAJ-AUTO'])
    expect(matchSymbols(LIST, '360')).toEqual(['360ONE'])
  })

  it('caps the list at 8 results', () => {
    const many = Array.from({ length: 20 }, (_, i) => `STOCK${String(i).padStart(2, '0')}`)
    expect(matchSymbols(many, 'stock')).toHaveLength(MAX_RESULTS)
    expect(MAX_RESULTS).toBe(8)
  })

  it('never lists a symbol twice', () => {
    expect(matchSymbols(['IDEA', 'IDEA'], 'ide')).toEqual(['IDEA'])
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

import { describe, expect, it } from 'vitest'
import { maslulCodeFromKod, mofidFromKidodAchid, normalizeClientId, parseDate } from './xmlUtils'

describe('normalizeClientId', () => {
  it('treats every zero-padding of the same ID as one person', () => {
    expect(normalizeClientId('0000000027864610')).toBe('027864610')
    expect(normalizeClientId('027864610')).toBe('027864610')
    expect(normalizeClientId('27864610')).toBe('027864610')
  })

  it('keeps distinct IDs distinct', () => {
    expect(normalizeClientId('123456789')).not.toBe(normalizeClientId('123456780'))
  })

  it('handles empty and non-digit input', () => {
    expect(normalizeClientId(null)).toBe('')
    expect(normalizeClientId('000')).toBe('')
  })
})

describe('parseDate', () => {
  it('converts yyyymmdd to ISO', () => {
    expect(parseDate('20240930')).toBe('2024-09-30')
  })
  it('tolerates trailing time and bad input', () => {
    expect(parseDate('20241026153009')).toBe('2024-10-26')
    expect(parseDate('bad')).toBeNull()
    expect(parseDate(null)).toBeNull()
  })
})

describe('mofidFromKidodAchid', () => {
  it('extracts the fund code verified against real files', () => {
    // Altshuler hishtalmut → 1093, Phoenix pension → 209
    expect(mofidFromKidodAchid('513173393000000000010930000000')).toBe('1093')
    expect(mofidFromKidodAchid('513026484000000000002090000000')).toBe('209')
  })
  it('returns null for short input', () => {
    expect(mofidFromKidodAchid('123')).toBeNull()
  })
})

describe('maslulCodeFromKod', () => {
  it('extracts the maslul/track code used by treasury returns files', () => {
    // Phoenix pension track → maslul 2187 (fund is 209)
    expect(maslulCodeFromKod('513026484000000000002090002187')).toBe('2187')
  })
  it('returns null for short input', () => {
    expect(maslulCodeFromKod('123')).toBeNull()
  })
})

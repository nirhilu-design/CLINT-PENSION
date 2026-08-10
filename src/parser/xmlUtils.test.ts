import { describe, expect, it } from 'vitest'
import { fundCandidatesFromCodes, mofidFromKidodAchid, normalizeClientId, parseDate } from './xmlUtils'

describe('normalizeClientId', () => {
  it('treats every zero-padding of the same ID as one person', () => {
    expect(normalizeClientId('0000000012345674')).toBe('012345674')
    expect(normalizeClientId('012345674')).toBe('012345674')
    expect(normalizeClientId('12345674')).toBe('012345674')
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
  it('extracts the fund code from the KIDOD-ACHID (positions 19-23)', () => {
    // Synthetic codes: the middle segment holds the fund number (מספר אוצר)
    expect(mofidFromKidodAchid('000000000000000000070010000000')).toBe('7001')
    expect(mofidFromKidodAchid('000000000000000000077770000000')).toBe('7777')
  })
  it('returns null for short input', () => {
    expect(mofidFromKidodAchid('123')).toBeNull()
  })
})

describe('fundCandidatesFromCodes', () => {
  it('gemel lehashkaa: adds each track (מסלול) code alongside the product code', () => {
    // Product code = 8207 (not in treasury); tracks 13254 / 8211 are the gemel-net keys.
    const kidod = '000000000000000000082071325400'
    const tracks = ['000000000000000000082070013254', '000000000000000000082070008211']
    expect(fundCandidatesFromCodes(kidod, tracks).sort()).toEqual(['13254', '8207', '8211'].sort())
  })

  it('pension: product code plus any track codes', () => {
    const kidod = '000000000000000000002090000000' // → 209
    const tracks = ['000000000000000000002090002187'] // → 2187
    expect(fundCandidatesFromCodes(kidod, tracks).sort()).toEqual(['209', '2187'].sort())
  })
})

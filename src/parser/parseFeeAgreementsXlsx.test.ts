import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { parseFeeAgreementsXlsx } from './parseFeeAgreementsXlsx'

function xlsxBuffer(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return out
}

describe('parseFeeAgreementsXlsx', async () => {
  it('reads policy number and both fee columns by Hebrew headers', async () => {
    const buf = xlsxBuffer([
      ['מספר פוליסה', 'דמי ניהול מהפקדה', 'דמי ניהול מצבירה'],
      ['12345', '2.5', '0.3'],
      ['67890', '', '0.5'],
    ])
    const res = await parseFeeAgreementsXlsx(buf, new Set(['12345', '67890']))
    expect(res.error).toBeUndefined()
    expect(res.agreements).toHaveLength(2)
    expect(res.agreements[0]).toEqual({
      policyNumber: '12345',
      agreedFeeFromDeposit: 2.5,
      agreedFeeFromAccumulation: 0.3,
    })
    expect(res.agreements[1].agreedFeeFromDeposit).toBeNull()
    expect(res.matched).toEqual(['12345', '67890'])
    expect(res.unmatched).toEqual([])
  })

  it('flags policies that are not in the portfolio', async () => {
    const buf = xlsxBuffer([
      ['מספר פוליסה', 'מצבירה'],
      ['999', '0.4'],
    ])
    const res = await parseFeeAgreementsXlsx(buf, new Set(['12345']))
    expect(res.matched).toEqual([])
    expect(res.unmatched).toEqual(['999'])
  })

  it('strips percent signs and handles comma decimals', async () => {
    const buf = xlsxBuffer([
      ['policy', 'deposit', 'accumulation'],
      ['A1', '3%', '0,25%'],
    ])
    const res = await parseFeeAgreementsXlsx(buf, new Set(['A1']))
    expect(res.agreements[0]).toEqual({
      policyNumber: 'A1',
      agreedFeeFromDeposit: 3,
      agreedFeeFromAccumulation: 0.25,
    })
  })

  it('errors clearly when no policy column exists', async () => {
    const buf = xlsxBuffer([
      ['שם', 'סכום'],
      ['דני', '100'],
    ])
    const res = await parseFeeAgreementsXlsx(buf, new Set())
    expect(res.error).toContain('מספר פוליסה')
    expect(res.agreements).toHaveLength(0)
  })

  it('skips rows with no fee data', async () => {
    const buf = xlsxBuffer([
      ['מספר פוליסה', 'מהפקדה', 'מצבירה'],
      ['A1', '', ''],
      ['A2', '1.0', ''],
    ])
    const res = await parseFeeAgreementsXlsx(buf, new Set(['A1', 'A2']))
    expect(res.agreements).toHaveLength(1)
    expect(res.agreements[0].policyNumber).toBe('A2')
  })
})

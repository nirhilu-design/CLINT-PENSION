import { describe, expect, it } from 'vitest'
import type { InvestmentTrack, Policy } from '../models/types'
import { policyDisplayReturn } from './returnsService'

function policy(over: Partial<Policy>): Policy {
  return {
    id: 'p', policyNumber: 'P', productType: 'gemel', productName: null, managingCompany: null,
    mofid: null, openDate: null, status: 'active', statusCode: '1', temporaryRisk: false,
    savingsAllocationPercent: null, capitalBalance: null, currentValue: 0, coveredSalary: null,
    expectedPensionWithDeposits: null, expectedPensionWithoutDeposits: null,
    expectedAccumulationWithDeposits: null, expectedAccumulationWithoutDeposits: null,
    retirementAge: null, fees: { fromDeposit: null, fromAccumulation: null }, netReturn: null,
    investmentTracks: [], coverages: [], contributions: [], beneficiaries: [],
    managersGeneration: null, hasGuaranteedFactor: false, survivorsWaiver: null, reportDate: null,
    lastDepositMonth: null, lastDepositTotal: null, monthlyDeposits: [], sourceFileName: 'f',
    ...over,
  }
}

const track = (over: Partial<InvestmentTrack>): InvestmentTrack => ({
  name: null, value: null, depositPercent: null, returnNet: null, feeFromDeposit: null, feeFromAccumulation: null, ...over,
})

describe('policyDisplayReturn', () => {
  it('returns the reported net return for a savings product', () => {
    expect(policyDisplayReturn(policy({ productType: 'gemelInvestment', netReturn: 12.1 }))).toEqual({ value: 12.1, suspiciousZero: false })
  })

  it('excludes products with no savings (life / income protection)', () => {
    expect(policyDisplayReturn(policy({ productType: 'life', netReturn: 0 })).value).toBeNull()
    expect(policyDisplayReturn(policy({ productType: 'incomeProtection', netReturn: 5 })).value).toBeNull()
  })

  it('discards an implausible figure (|v| >= 100) and falls back to the tracks', () => {
    const p = policy({
      productType: 'managers',
      netReturn: -100,
      investmentTracks: [track({ value: 100000, returnNet: 6 }), track({ value: 100000, returnNet: 4 })],
    })
    expect(policyDisplayReturn(p).value).toBe(5) // value-weighted average of the tracks
  })

  it('treats a 0% as missing data (not charted) except pre-1992 managers', () => {
    expect(policyDisplayReturn(policy({ productType: 'pension', netReturn: 0 }))).toEqual({ value: null, suspiciousZero: true })
    const old = policy({ productType: 'managers', netReturn: 0, openDate: '1988-05-01' })
    expect(policyDisplayReturn(old)).toEqual({ value: 0, suspiciousZero: false })
  })
})

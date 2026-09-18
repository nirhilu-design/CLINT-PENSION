import { describe, expect, it } from 'vitest'
import type { InvestmentTrack, Policy, TreasuryFundData } from '../models/types'
import { policyDisplayReturn, policyChartReturn, availableRanges } from './returnsService'

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

const fund = (over: Partial<TreasuryFundData>): TreasuryFundData => ({
  mofid: '1190', name: null, managingCompany: null, avgFeeFromAccumulation: null,
  avgFeeFromDeposit: null, return12m: null, return3yAnnualized: null, return5yAnnualized: null,
  stdDev36m: null, sharpe: null, liquidityRatio: null, periodTo: null, ...over,
})

describe('policyChartReturn / availableRanges', () => {
  const p = policy({ productType: 'gemel', mofid: '1190', netReturn: 3.2 })
  const funds = [fund({ mofid: '1190', return12m: 8.5, return3yAnnualized: 6.1, return5yAnnualized: 5.4 })]

  it('YTD uses the XML net return (not the treasury)', () => {
    expect(policyChartReturn(p, funds, 'ytd')).toEqual({ value: 3.2, gross: false })
  })

  it('12m/3y/5y use the treasury gross return by מספר אוצר', () => {
    expect(policyChartReturn(p, funds, '12m')).toEqual({ value: 8.5, gross: true })
    expect(policyChartReturn(p, funds, '3y')).toEqual({ value: 6.1, gross: true })
    expect(policyChartReturn(p, funds, '5y')).toEqual({ value: 5.4, gross: true })
  })

  it('gross ranges are null when no matching treasury fund is loaded', () => {
    expect(policyChartReturn(p, [], '12m').value).toBeNull()
    expect(availableRanges([p], [])).toEqual(['ytd'])
    expect(availableRanges([p], funds)).toEqual(['ytd', '12m', '3y', '5y'])
  })
})

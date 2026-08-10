import { describe, expect, it } from 'vitest'
import { computeExposure } from './exposureService'
import type { Policy, TreasuryAllocation } from '../models/types'

function policy(over: Partial<Policy>): Policy {
  return {
    policyNumber: 'P',
    productType: 'gemel',
    productName: null,
    managingCompany: 'חברה א',
    mofid: null,
    mofidCandidates: [],
    openDate: null,
    status: 'active',
    statusCode: '1',
    temporaryRisk: false,
    savingsAllocationPercent: null,
    capitalBalance: null,
    currentValue: 0,
    coveredSalary: null,
    expectedPensionWithDeposits: null,
    expectedPensionWithoutDeposits: null,
    expectedAccumulationWithDeposits: null,
    expectedAccumulationWithoutDeposits: null,
    retirementAge: null,
    fees: { fromDeposit: null, fromAccumulation: null },
    netReturn: null,
    investmentTracks: [],
    coverages: [],
    contributions: [],
    beneficiaries: [],
    managersGeneration: null,
    hasGuaranteedFactor: false,
    survivorsWaiver: null,
    reportDate: null,
    lastDepositMonth: null,
    lastDepositTotal: null,
    monthlyDeposits: [],
    sourceFileName: 'f',
    ...over,
  }
}

describe('computeExposure', () => {
  const policies = [
    policy({ productType: 'gemel', managingCompany: 'חברה א', mofid: '1', currentValue: 60000 }),
    policy({ productType: 'gemelInvestment', managingCompany: 'חברה ב', mofid: '2', currentValue: 40000 }),
    policy({ productType: 'pension', managingCompany: 'חברה א', mofid: '3', currentValue: 100000 }),
  ]
  const allocations: TreasuryAllocation[] = [
    { mofid: '1', period: null, groups: [{ name: 'מניות', percent: 50 }] },
    { mofid: '2', period: null, groups: [{ name: 'מניות', percent: 25 }] },
  ]

  it('computes gemel total and share of portfolio', () => {
    const e = computeExposure(policies, allocations)
    expect(e.portfolio.total).toBe(200000)
    expect(e.gemelTotal).toBe(100000)
    expect(e.gemelShare).toBe(50)
  })

  it('breaks exposure down by managing company', () => {
    const e = computeExposure(policies, allocations)
    // portfolio: חברה א = 60k + 100k = 160k (80%), חברה ב = 40k (20%)
    expect(e.portfolio.byCompany[0]).toMatchObject({ company: 'חברה א', percent: 80 })
    expect(e.portfolio.byCompany[1]).toMatchObject({ company: 'חברה ב', percent: 20 })
  })

  it('weights equity exposure by policy value', () => {
    const e = computeExposure(policies, allocations)
    // gemel equity: (60k*50% + 40k*25%) / 100k = (30k + 10k)/100k = 40%
    expect(e.gemel.equity.equityPercent).toBe(40)
  })

  it('returns null equity when no allocation data', () => {
    const e = computeExposure(policies, [])
    expect(e.portfolio.equity.equityPercent).toBeNull()
  })

  it('matches allocation via a track-level candidate code, not only the primary mofid', () => {
    // gemel lehashkaa: product code 8207 has no treasury data; the track code 13254 does.
    const p = policy({ productType: 'gemelInvestment', mofid: '8207', mofidCandidates: ['8207', '13254'], currentValue: 50000 })
    const allocs: TreasuryAllocation[] = [{ mofid: '13254', period: null, groups: [{ name: 'מניות', percent: 60 }] }]
    const e = computeExposure([p], allocs)
    expect(e.gemel.equity.equityPercent).toBe(60)
  })

  it('sums the capital-status (הון) balances for the gemel scope', () => {
    const withCapital = [
      policy({ productType: 'gemel', mofid: '1', currentValue: 60000, capitalBalance: 60000 }),
      policy({ productType: 'gemelInvestment', mofid: '2', currentValue: 40000, capitalBalance: 0 }),
    ]
    const e = computeExposure(withCapital, [])
    expect(e.gemel.capitalTotal).toBe(60000)
  })
})

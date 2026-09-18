import { describe, expect, it } from 'vitest'
import type { Coverage, Policy } from '../models/types'
import { computeDeathBenefit, pensionLacksSurvivorCoverage, policyDeathAmount } from './deathBenefitService'

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

const cover = (over: Partial<Coverage>): Coverage => ({
  type: 'death', name: null, amount: null, percent: null, coveredSalary: null, cost: null,
  status: 'active', endDate: null, policyNumber: 'P', ...over,
})

describe('policyDeathAmount', () => {
  it('life insurance → the death insured sum', () => {
    expect(policyDeathAmount(policy({ productType: 'life', coverages: [cover({ amount: 500000 })] }))).toBe(500000)
  })

  it('managers → death sum, or accumulation when no death cover', () => {
    expect(policyDeathAmount(policy({ productType: 'managers', coverages: [cover({ amount: 300000 })], currentValue: 90000 }))).toBe(300000)
    expect(policyDeathAmount(policy({ productType: 'managers', currentValue: 90000 }))).toBe(90000)
  })

  it('savings products → the accumulation passes to beneficiaries', () => {
    expect(policyDeathAmount(policy({ productType: 'gemel', currentValue: 60000 }))).toBe(60000)
    expect(policyDeathAmount(policy({ productType: 'gemelInvestment', currentValue: 40000 }))).toBe(40000)
    expect(policyDeathAmount(policy({ productType: 'education', currentValue: 25000 }))).toBe(25000)
  })

  it('pension WITH survivor coverage is excluded (paid as a monthly pension)', () => {
    const p = policy({ productType: 'pension', currentValue: 800000, coverages: [cover({ type: 'survivors', amount: 6000 })] })
    expect(pensionLacksSurvivorCoverage(p)).toBe(false)
    expect(policyDeathAmount(p)).toBe(0)
  })

  it('pension WITHOUT survivor coverage folds in the accumulation', () => {
    const p = policy({ productType: 'pension', currentValue: 800000 })
    expect(pensionLacksSurvivorCoverage(p)).toBe(true)
    expect(policyDeathAmount(p)).toBe(800000)
  })
})

describe('computeDeathBenefit', () => {
  it('sums across products and flags an included survivor-less pension', () => {
    const out = computeDeathBenefit([
      policy({ productType: 'life', coverages: [cover({ amount: 500000 })] }),
      policy({ productType: 'gemel', currentValue: 60000 }),
      policy({ productType: 'pension', currentValue: 800000 }), // no survivors → included
      policy({ productType: 'pension', currentValue: 500000, coverages: [cover({ type: 'survivors', amount: 5000 })] }), // excluded
    ])
    expect(out.total).toBe(500000 + 60000 + 800000)
    expect(out.contributingCount).toBe(3)
    expect(out.includesPensionWithoutSurvivors).toBe(true)
  })
})

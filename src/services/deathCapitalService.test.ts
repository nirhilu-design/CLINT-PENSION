import { describe, expect, it } from 'vitest'
import type { Policy } from '../models/types'
import { computeDeathCapital } from './deathCapitalService'

function policy(over: Partial<Policy>): Policy {
  return {
    policyNumber: 'P',
    productType: 'managers',
    productName: null,
    managingCompany: null,
    mofid: null,
    openDate: null,
    status: 'active',
    statusCode: '1',
    temporaryRisk: false,
    savingsAllocationPercent: null,
    capitalBalance: null,
    currentValue: 0,
    deathSumInsured: null,
    deathSumIncludesSavings: null,
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
    sourceFileName: 't.xml',
    ...over,
  }
}

describe('computeDeathCapital', () => {
  it('adds full accumulation for capital products (gemel/education), excludes pension', () => {
    const r = computeDeathCapital([
      policy({ productType: 'gemel', currentValue: 60000 }),
      policy({ productType: 'education', currentValue: 40000 }),
      policy({ productType: 'pension', currentValue: 500000 }),
    ])
    expect(r.savings).toBe(100000)
    expect(r.risk).toBe(0)
    expect(r.total).toBe(100000) // pension accumulation is NOT capital-at-death
  })

  it('pure risk policy contributes only the death sum insured', () => {
    const r = computeDeathCapital([
      policy({ productType: 'life', currentValue: 0, deathSumInsured: 500000 }),
    ])
    expect(r).toEqual({ total: 500000, savings: 0, risk: 500000 })
  })

  it('mixed policy with flag=false (does not include savings) is additive', () => {
    const r = computeDeathCapital([
      policy({ productType: 'managers', currentValue: 300000, deathSumInsured: 200000, deathSumIncludesSavings: false }),
    ])
    expect(r.total).toBe(500000)
    expect(r.savings).toBe(300000)
    expect(r.risk).toBe(200000)
  })

  it('mixed policy with flag=true (sum insured embeds savings) takes the higher-of', () => {
    const r = computeDeathCapital([
      policy({ productType: 'managers', currentValue: 300000, deathSumInsured: 800000, deathSumIncludesSavings: true }),
    ])
    expect(r.total).toBe(800000) // not 1,100,000 — no double count
  })

  it('mixed policy with unknown flag defaults to higher-of', () => {
    const r = computeDeathCapital([
      policy({ productType: 'managers', currentValue: 300000, deathSumInsured: 200000, deathSumIncludesSavings: null }),
    ])
    expect(r.total).toBe(300000) // max(300k, 200k)
  })

  it('falls back to summing death-typed coverages when deathSumInsured is absent', () => {
    const r = computeDeathCapital([
      policy({
        productType: 'life',
        currentValue: 0,
        coverages: [
          { type: 'death', name: null, amount: 250000, percent: null, coveredSalary: null, cost: null, status: 'active', policyNumber: 'P' },
        ],
      }),
    ])
    expect(r.total).toBe(250000)
  })

  it('excludes inactive policies', () => {
    const r = computeDeathCapital([
      policy({ productType: 'gemel', currentValue: 60000, status: 'inactive' }),
    ])
    expect(r.total).toBe(0)
  })
})

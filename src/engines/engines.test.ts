import { describe, expect, it } from 'vitest'
import type { Policy, SupplementaryInfo } from '../models/types'
import { emptySupplementary } from '../services/analysisService'
import { depositsEngine } from './depositsEngine'
import { costEngine } from './costEngine'
import { incomeProtectionEngine } from './incomeProtectionEngine'
import { dataQualityEngine } from './dataQualityEngine'
import { sortFindings } from './findingPriority'
import { makeFinding } from './engineTypes'

const client = {
  id: '027864610',
  firstName: 'א',
  lastName: 'ב',
  fullName: 'א ב',
  birthDate: null,
  gender: null,
  email: null,
  phone: null,
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    policyNumber: 'P1',
    productType: 'pension',
    productName: 'קרן בדיקה',
    managingCompany: 'יצרן',
    mofid: '209',
    treasuryKeys: ['209'],
    openDate: '2019-12-22',
    status: 'active',
    currentValue: 100000,
    coveredSalary: 14442,
    expectedPension: 4444,
    expectedPensionNoDeposits: null,
    expectedAccumulationAtRetirement: null,
    expectedAccumulationNoDeposits: null,
    retirementAge: 67,
    fees: { fromDeposit: 1.2, fromAccumulation: 0.14 },
    netReturn: 9.5,
    investmentTracks: [],
    coverages: [],
    contributions: [],
    beneficiaries: [],
    managersGeneration: null,
    hasGuaranteedFactor: false,
    survivorsWaiver: null,
    reportDate: '2024-09-30',
    lastDepositMonth: '2024-09',
    lastDepositTotal: 3000,
    monthlyDeposits: [],
    sourceFileName: 'test.xml',
    ...overrides,
  }
}

function input(policies: Policy[], supp: Partial<SupplementaryInfo> = {}) {
  return { client, policies, supplementary: { ...emptySupplementary(), ...supp } }
}

describe('depositsEngine', () => {
  it('is silent for continuous, recent deposits', () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `2024-${String(i + 1).padStart(2, '0')}`,
      total: 1500,
    }))
    const out = depositsEngine(input([makePolicy({ monthlyDeposits: months })]))
    expect(out.filter((f) => f.severity !== 'info')).toHaveLength(0)
  })

  it('flags stale last deposit relative to the file date (not today)', () => {
    const out = depositsEngine(input([makePolicy({ lastDepositMonth: '2024-04' })]))
    expect(out.some((f) => f.title.includes('אינה עדכנית'))).toBe(true)
  })

  it('flags missing months inside the reported window', () => {
    const out = depositsEngine(
      input([
        makePolicy({
          monthlyDeposits: [
            { month: '2023-10', total: 1500 },
            { month: '2024-04', total: 1500 },
          ],
        }),
      ]),
    )
    expect(out.some((f) => f.title.includes('ללא הפקדה'))).toBe(true)
  })

  it('skips inactive and risk-only products', () => {
    const out = depositsEngine(
      input([
        makePolicy({ status: 'inactive', lastDepositMonth: '2020-01' }),
        makePolicy({ policyNumber: 'P9', productType: 'life', lastDepositMonth: '2020-01' }),
      ]),
    )
    expect(out).toHaveLength(0)
  })
})

describe('costEngine', () => {
  it('flags fees above the market threshold', () => {
    const out = costEngine(input([makePolicy({ fees: { fromDeposit: 5, fromAccumulation: 0.4 } })]))
    expect(out.some((f) => f.title.includes('מהמקובל בשוק'))).toBe(true)
  })

  it('stays silent below thresholds and without agreements', () => {
    const out = costEngine(input([makePolicy()]))
    expect(out).toHaveLength(0)
  })

  it('compares against a fee agreement only when one exists', () => {
    const out = costEngine(
      input([makePolicy()], {
        feeAgreements: [
          { policyNumber: 'P1', agreedFeeFromDeposit: 1.0, agreedFeeFromAccumulation: 0.1 },
        ],
      }),
    )
    expect(out.some((f) => f.title.includes('מול ההסכם'))).toBe(true)
  })

  it('compares against the fund average from treasury data', () => {
    const out = costEngine(
      input([makePolicy({ fees: { fromDeposit: null, fromAccumulation: 0.6 } })], {
        treasuryFunds: [
          {
            mofid: '209',
            name: 'קרן',
            managingCompany: null,
            avgFeeFromAccumulation: 0.2,
            avgFeeFromDeposit: null,
            return12m: null,
            return3yAnnualized: null,
            return5yAnnualized: null,
            stdDev36m: null,
            sharpe: null,
            liquidityRatio: null,
            periodTo: null,
          },
        ],
      }),
    )
    expect(out.some((f) => f.title.includes('מהממוצע בקופה'))).toBe(true)
  })
})

describe('incomeProtectionEngine', () => {
  const disabilityCover = {
    type: 'disability' as const,
    name: null,
    amount: 9000,
    percent: 60,
    coveredSalary: 14442,
    cost: 60,
    status: 'active' as const,
    policyNumber: 'P1',
  }

  it('flags coverage percent below the 73% target', () => {
    const out = incomeProtectionEngine(input([makePolicy({ coverages: [disabilityCover] })]))
    const f = out.find((x) => x.title.includes('נמוך מהיעד'))
    expect(f?.severity).toBe('attention')
  })

  it('escalates to gap when the family relies on the income', () => {
    const out = incomeProtectionEngine(
      input([makePolicy({ coverages: [disabilityCover] })], { familyReliesOnIncome: true }),
    )
    const f = out.find((x) => x.title.includes('נמוך מהיעד'))
    expect(f?.severity).toBe('gap')
  })
})

describe('dataQualityEngine salary cross-check', () => {
  it('flags >15% difference in either direction', () => {
    const high = dataQualityEngine(input([makePolicy()], { currentGrossSalary: 25000 }))
    expect(high.some((f) => f.title.includes('שוני בין השכר'))).toBe(true)
    const low = dataQualityEngine(input([makePolicy()], { currentGrossSalary: 10000 }))
    expect(low.some((f) => f.title.includes('שוני בין השכר'))).toBe(true)
  })

  it('stays silent within tolerance', () => {
    const out = dataQualityEngine(input([makePolicy()], { currentGrossSalary: 15000 }))
    expect(out.some((f) => f.title.includes('שוני בין השכר'))).toBe(false)
  })
})

describe('findingPriority', () => {
  it('orders: blocking, fees, coverages, investment, deposits, retirement', () => {
    const mk = (category: Parameters<typeof makeFinding>[0]['category']) =>
      makeFinding({ category, level: 'client', severity: 'attention', title: category, description: '' })
    const sorted = sortFindings([
      mk('retirement'),
      mk('deposits'),
      mk('investment'),
      mk('insurance'),
      mk('cost'),
      mk('limitation'),
    ])
    expect(sorted.map((f) => f.category)).toEqual([
      'limitation',
      'cost',
      'insurance',
      'investment',
      'deposits',
      'retirement',
    ])
  })
})

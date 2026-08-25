import { describe, expect, it } from 'vitest'
import type { Policy, SupplementaryInfo } from '../models/types'
import { emptySupplementary } from '../services/analysisService'
import { depositsEngine } from './depositsEngine'
import { costEngine } from './costEngine'
import { incomeProtectionEngine } from './incomeProtectionEngine'
import { dataQualityEngine } from './dataQualityEngine'
import { deathPictureEngine } from './deathPictureEngine'
import { stopIssueEngine, isBlockedByStopIssue } from './stopIssueEngine'
import { sortFindings } from './findingPriority'
import { makeFinding, salaryFromPolicies, fullSalaryReference } from './engineTypes'

const client = {
  id: '012345674',
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
    mofid: '7777',
    openDate: '2019-12-22',
    status: 'active',
    statusCode: '1',
    temporaryRisk: false,
    savingsAllocationPercent: null,
    capitalBalance: null,
    currentValue: 100000,
    deathSumInsured: null,
    deathSumIncludesSavings: null,
    coveredSalary: 14000,
    expectedPensionWithDeposits: 9000,
    expectedPensionWithoutDeposits: null,
    expectedAccumulationWithDeposits: null,
    expectedAccumulationWithoutDeposits: null,
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

  it('surfaces a temporary-risk (ריסק זמני) policy on its own', () => {
    const out = depositsEngine(
      input([makePolicy({ status: 'inactive', temporaryRisk: true, statusCode: '4' })]),
    )
    expect(out.some((f) => f.title.includes('ריסק זמני'))).toBe(true)
  })
})

describe('costEngine', () => {
  it('stays silent without an employer fee agreement (no market comparison)', () => {
    // High fees but no agreement → nothing, since fees are judged only vs the employer file
    const out = costEngine(input([makePolicy({ fees: { fromDeposit: 5, fromAccumulation: 0.4 } })]))
    expect(out).toHaveLength(0)
  })

  it('flags a gap only against the employer fee agreement', () => {
    const out = costEngine(
      input([makePolicy({ fees: { fromDeposit: 2, fromAccumulation: 0.3 } })], {
        feeAgreements: [
          { policyNumber: 'P1', agreedFeeFromDeposit: 1.0, agreedFeeFromAccumulation: 0.1 },
        ],
      }),
    )
    expect(out.some((f) => f.title.includes('מול הסכם המעסיק'))).toBe(true)
  })
})

describe('deathPictureEngine liabilities', () => {
  const lifeCover = (amount: number) =>
    makePolicy({
      policyNumber: 'L1',
      productType: 'life',
      coverages: [
        { type: 'death', name: null, amount, percent: null, coveredSalary: null, cost: null, status: 'active', policyNumber: 'L1' },
      ],
    })

  it('flags when death coverage is below the liabilities', () => {
    const out = deathPictureEngine(
      input([lifeCover(200000)], { mortgageBalance: 500000, otherDebts: 50000, hasLiabilities: true }),
    )
    expect(out.some((f) => f.title.includes('נמוך מההתחייבויות'))).toBe(true)
  })

  it('confirms when coverage covers the liabilities', () => {
    const out = deathPictureEngine(
      input([lifeCover(800000)], { mortgageBalance: 500000, hasLiabilities: true }),
    )
    expect(out.some((f) => f.title.includes('מכסה את ההתחייבויות'))).toBe(true)
  })
})

describe('managers generation engine (stopIssueEngine)', () => {
  const managers = (gen: Policy['managersGeneration'], extra: Partial<Policy> = {}) =>
    makePolicy({ policyNumber: 'MG', productType: 'managers', managersGeneration: gen, ...extra })
  const pension = makePolicy({ policyNumber: 'PEN', productType: 'pension' })
  const sev = (out: ReturnType<typeof stopIssueEngine>) =>
    out.find((x) => x.title.includes('דור ביטוח המנהלים'))?.severity

  it('examines every generation including pre-2001 (nothing blocked)', () => {
    const old = managers('before-2001-06', { hasGuaranteedFactor: true })
    expect(isBlockedByStopIssue(old)).toBe(false)
    expect(sev(stopIssueEngine(input([old])))).toBeDefined()
  })

  it('pre-2001 split with a pension and no dependents → attention', () => {
    const out = stopIssueEngine(
      input([managers('before-2001-06', { hasGuaranteedFactor: true }), pension], {
        hasSpouse: false,
        hasChildrenUnder21: false,
      }),
    )
    expect(sev(out)).toBe('attention')
  })

  it('pre-2001 notes the savings allocation (100% vs 90%) and the riders', () => {
    const old = managers('before-2001-06', {
      hasGuaranteedFactor: true,
      savingsAllocationPercent: 90,
      coverages: [
        { type: 'death', name: null, amount: 5, percent: null, coveredSalary: null, cost: null, status: 'active', policyNumber: 'MG' },
      ],
    })
    const desc = stopIssueEngine(input([old]))[0].description
    expect(desc).toContain('הקצאה לחיסכון: 90%')
    expect(desc).toContain('תוספות ביטוחיות')
  })

  it('2001–2004 → attention (consider diverting)', () => {
    expect(sev(stopIssueEngine(input([managers('2001-06-to-2004')])))).toBe('attention')
  })

  it('2004–2013 new factor beside a pension: fee above threshold → attention, at/below → info', () => {
    // Salaries kept low so the summed salary stays below the מקיפה cap and the
    // severity reflects the fee level, not the cap.
    const lowSalary = { coveredSalary: 8000 }
    const pen = makePolicy({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 8000 })
    const high = managers('2004-to-2013', { ...lowSalary, fees: { fromDeposit: null, fromAccumulation: 1.2 } })
    const low = managers('2004-to-2013', { ...lowSalary, fees: { fromDeposit: null, fromAccumulation: 0.5 } })
    expect(sev(stopIssueEngine(input([high, pen])))).toBe('attention')
    expect(sev(stopIssueEngine(input([low, pen])))).toBe('info')
  })

  it('inactive policy → short paid-up note, no deposit-split analysis', () => {
    const paidUp = managers('before-2001-06', { status: 'inactive', hasGuaranteedFactor: true })
    const desc = stopIssueEngine(input([paidUp, pension]))[0].description
    expect(desc).toContain('אינה פעילה')
    expect(desc).toContain('נכס שכדאי לשמר')
    expect(desc).not.toContain('חלוקת הפקדות)')
    expect(sev(stopIssueEngine(input([paidUp, pension])))).toBe('info')
  })

  it('expensive active 2004–2013 beside a pension → deposit-redirect note', () => {
    const pricey = managers('2004-to-2013', {
      hasGuaranteedFactor: true,
      coveredSalary: 12000,
      fees: { fromDeposit: null, fromAccumulation: 2 },
    })
    const desc = stopIssueEngine(input([pricey, pension]))[0].description
    expect(desc).toContain('הפקדה שוטפת לפוליסה זו יקרה')
    expect(desc).toContain('הפניית ההפקדות השוטפות')
  })

  it('expensive active 2004–2013 with separate disability + pension savings → cancellation note', () => {
    const pricey = managers('2004-to-2013', {
      coveredSalary: 12000,
      fees: { fromDeposit: null, fromAccumulation: 2 },
    })
    const akv = makePolicy({ policyNumber: 'AKV', productType: 'incomeProtection' })
    const desc = stopIssueEngine(input([pricey, pension, akv]))[0].description
    expect(desc).toContain('ניתן לשקול ביטול הפוליסה')
  })
})

describe('incomeProtectionEngine', () => {
  const disabilityCover = {
    type: 'disability' as const,
    name: null,
    amount: 9000,
    percent: 60,
    coveredSalary: 14000,
    cost: 60,
    status: 'active' as const,
    policyNumber: 'P1',
  }

  // Uses a non-pension product: pension disability is handled cross-product by
  // pensionInsightEngine, so incomeProtection no longer flags pension in isolation.
  const managersPolicy = (overrides = {}) =>
    makePolicy({ productType: 'managers', coverages: [disabilityCover], ...overrides })

  it('flags coverage percent below the 73% target (non-pension product)', () => {
    const out = incomeProtectionEngine(input([managersPolicy()]))
    const f = out.find((x) => x.title.includes('נמוך מהיעד'))
    expect(f?.severity).toBe('attention')
  })

  it('escalates to gap when the family relies on the income', () => {
    const out = incomeProtectionEngine(input([managersPolicy()], { familyReliesOnIncome: true }))
    const f = out.find((x) => x.title.includes('נמוך מהיעד'))
    expect(f?.severity).toBe('gap')
  })

  it('does not flag a low pension disability in isolation (handled cross-product)', () => {
    const out = incomeProtectionEngine(
      input([makePolicy({ productType: 'pension', coverages: [disabilityCover] })]),
    )
    expect(out.some((x) => x.title.includes('נמוך מהיעד'))).toBe(false)
  })

  it('does not flag a salary gap when the אכ"ע covers the salary echoed across products', () => {
    // Managers אכ"ע insures the full 14,000, and a pension fund echoes the same
    // 14,000. The salary must collapse to 14,000 (not double to 28,000), so the
    // covered-salary check must NOT fire.
    const fullCover = { ...disabilityCover, percent: 75, coveredSalary: 14000 }
    const out = incomeProtectionEngine(
      input([
        makePolicy({ policyNumber: 'MNG', productType: 'managers', coveredSalary: 14000, coverages: [fullCover] }),
        makePolicy({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 14000 }),
      ]),
    )
    expect(out.some((x) => x.title.includes('פער בין השכר המבוטח'))).toBe(false)
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

describe('salary from pension products', () => {
  const p = (over: Partial<Policy>) => makePolicy(over)

  it('sums insured salary across active pension + managers, excluding אכע', () => {
    const sum = salaryFromPolicies([
      p({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 9000 }),
      p({ policyNumber: 'MNG', productType: 'managers', coveredSalary: 6000 }),
      p({ policyNumber: 'AKV', productType: 'incomeProtection', coveredSalary: 15000 }),
    ])
    expect(sum).toBe(15000)
  })

  it('includes a gemel behirah that receives directed salary', () => {
    const sum = salaryFromPolicies([
      p({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 9000 }),
      p({ policyNumber: 'GML', productType: 'gemel', coveredSalary: 5000 }),
    ])
    expect(sum).toBe(14000)
  })

  it('drops a gemel with no salary base (e.g. חיסכון לכל ילד)', () => {
    const sum = salaryFromPolicies([
      p({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 9000 }),
      p({ policyNumber: 'KID', productType: 'gemel', coveredSalary: null }),
    ])
    expect(sum).toBe(9000)
  })

  it('collapses identical salaries echoed across products (no double-count)', () => {
    const sum = salaryFromPolicies([
      p({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 14442 }),
      p({ policyNumber: 'MNG', productType: 'managers', coveredSalary: 14442 }),
    ])
    expect(sum).toBe(14442)
  })

  it('ignores inactive products in the sum', () => {
    const sum = salaryFromPolicies([
      p({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 9000 }),
      p({ policyNumber: 'OLD', productType: 'managers', status: 'inactive', coveredSalary: 6000 }),
    ])
    expect(sum).toBe(9000)
  })

  it('uses a study-fund base below the cap as the full-salary reference', () => {
    const ref = fullSalaryReference(
      [p({ policyNumber: 'EDU', productType: 'education', coveredSalary: 12000 })],
      15712,
    )
    expect(ref).toBe(12000)
  })

  it('ignores a study-fund base at/above the cap (truncated, uninformative)', () => {
    const ref = fullSalaryReference(
      [p({ policyNumber: 'EDU', productType: 'education', coveredSalary: 15712 })],
      15712,
    )
    expect(ref).toBeNull()
  })

  it('hints when the summed salary is materially below the study-fund reference', () => {
    const out = dataQualityEngine(
      input([
        makePolicy({ policyNumber: 'PEN', productType: 'pension', coveredSalary: 8000 }),
        makePolicy({ policyNumber: 'EDU', productType: 'education', coveredSalary: 14000 }),
      ]),
    )
    expect(out.some((f) => f.title.includes('נמוך מנתון ההשוואה'))).toBe(true)
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

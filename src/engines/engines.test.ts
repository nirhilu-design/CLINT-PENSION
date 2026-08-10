import { describe, expect, it } from 'vitest'
import type { Policy, SupplementaryInfo } from '../models/types'
import { emptySupplementary } from '../services/analysisService'
import { depositsEngine } from './depositsEngine'
import { costEngine } from './costEngine'
import { incomeProtectionEngine } from './incomeProtectionEngine'
import { dataQualityEngine } from './dataQualityEngine'
import { deathPictureEngine } from './deathPictureEngine'
import { pensionInsightEngine } from './pensionInsightEngine'
import { stopIssueEngine, isBlockedByStopIssue } from './stopIssueEngine'
import { sortFindings, findingTier } from './findingPriority'
import { makeFinding } from './engineTypes'
import { parseEmployerFeeFile } from '../parser/parseEmployerFeeFile'

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
    const high = managers('2004-to-2013', { fees: { fromDeposit: null, fromAccumulation: 1.2 } })
    const low = managers('2004-to-2013', { fees: { fromDeposit: null, fromAccumulation: 0.5 } })
    expect(sev(stopIssueEngine(input([high, pension])))).toBe('attention')
    expect(sev(stopIssueEngine(input([low, pension])))).toBe('info')
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

describe('pensionInsightEngine survivors waiver', () => {
  const survivorsCover = (cost: number) => ({
    type: 'survivors' as const,
    name: 'אלמן/ה',
    amount: 3000,
    percent: null,
    coveredSalary: null,
    cost,
    status: 'active' as const,
    policyNumber: 'P1',
  })

  it('waiver with dependents → attention (deficit) and notes the 2-year auto-renewal', () => {
    const out = pensionInsightEngine(
      input([makePolicy({ survivorsWaiver: true })], { hasSpouse: true, hasChildrenUnder21: false }),
    )
    const f = out.find((x) => x.title.includes('ויתור על כיסוי שאירים למרות'))
    expect(f?.severity).toBe('attention')
    expect(f?.description).toContain('לשנתיים')
  })

  it('waiver without dependents → info tracking note', () => {
    const out = pensionInsightEngine(
      input([makePolicy({ survivorsWaiver: true })], { hasSpouse: false, hasChildrenUnder21: false }),
    )
    const f = out.find((x) => x.title.includes('למעקב'))
    expect(f?.severity).toBe('info')
    expect(f?.description).toContain('מתחדש אוטומטית')
  })

  it('paying for survivors coverage without dependents → info (possibly unnecessary)', () => {
    const out = pensionInsightEngine(
      input([makePolicy({ survivorsWaiver: null, coverages: [survivorsCover(50)] })], {
        hasSpouse: false,
        hasChildrenUnder21: false,
      }),
    )
    expect(out.some((x) => x.title.includes('בתשלום ללא תלויים'))).toBe(true)
  })
})

describe('deathPictureEngine pension accumulation', () => {
  it('excludes pension savings from the lump comparison when survivors exist', () => {
    const out = deathPictureEngine(
      input([makePolicy({ productType: 'pension', currentValue: 800000, survivorsWaiver: null })], {
        mortgageBalance: 500000,
        hasLiabilities: true,
        hasSpouse: true,
      }),
    )
    const f = out.find((x) => x.title.includes('נמוך מההתחייבויות'))
    expect(f).toBeDefined() // pension accumulation not counted → shortfall
    expect(f?.description).toContain('קצבת שאירים')
  })

  it('counts pension savings as a lump to beneficiaries when a survivors waiver exists', () => {
    const out = deathPictureEngine(
      input([makePolicy({ productType: 'pension', currentValue: 800000, survivorsWaiver: true })], {
        mortgageBalance: 500000,
        hasLiabilities: true,
      }),
    )
    const f = out.find((x) => x.title.includes('מכסה את ההתחייבויות'))
    expect(f).toBeDefined()
    expect(f?.description).toContain('בהיעדר שאירים')
  })
})

describe('parseEmployerFeeFile', () => {
  it('parses a CSV with a Hebrew header row', () => {
    const csv = 'מספר פוליסה,דמי ניהול מהפקדה,דמי ניהול מצבירה\nP1,1.5,0.2\nP2,2,0.3'
    const res = parseEmployerFeeFile(csv, 'fees.csv')
    expect(res.agreements).toHaveLength(2)
    expect(res.agreements[0]).toMatchObject({ policyNumber: 'P1', agreedFeeFromDeposit: 1.5, agreedFeeFromAccumulation: 0.2 })
  })

  it('parses positional rows without a header', () => {
    const res = parseEmployerFeeFile('P1,1.5,0.2', 'fees.csv')
    expect(res.agreements).toHaveLength(1)
    expect(res.agreements[0].agreedFeeFromAccumulation).toBe(0.2)
  })

  it('reports XML files as pending mapping (no agreements yet)', () => {
    const res = parseEmployerFeeFile('<root></root>', 'fees.xml')
    expect(res.agreements).toHaveLength(0)
    expect(res.note).toContain('XML')
  })
})

describe('findingTier', () => {
  const mk = (
    category: Parameters<typeof makeFinding>[0]['category'],
    severity: Parameters<typeof makeFinding>[0]['severity'],
  ) => makeFinding({ category, level: 'client', severity, title: '', description: '' })

  it('treats gaps and points-to-check as important regardless of category', () => {
    expect(findingTier(mk('cost', 'gap'))).toBe('important')
    expect(findingTier(mk('deposits', 'attention'))).toBe('important')
    expect(findingTier(mk('limitation', 'attention'))).toBe('important')
  })

  it('treats info-level insights as insight, and other info as background note', () => {
    expect(findingTier(mk('insight', 'info'))).toBe('insight')
    expect(findingTier(mk('information', 'info'))).toBe('note')
    expect(findingTier(mk('dataQuality', 'info'))).toBe('note')
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

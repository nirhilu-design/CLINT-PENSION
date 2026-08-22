import { describe, expect, it } from 'vitest'
import type { Analysis, Finding, Policy } from '../models/types'
import { makeFinding } from '../engines/engineTypes'
import { emptySupplementary } from './analysisService'
import { computeHealthScore } from './healthScoreService'
import { DEFAULT_HEALTH_WEIGHTS } from '../config/healthWeights'

const client = { id: '1', firstName: 'א', lastName: 'ב', fullName: 'א ב', birthDate: '1966-12-08', gender: null, email: null, phone: null }

function policy(over: Partial<Policy> = {}): Policy {
  return {
    productType: 'pension',
    status: 'active',
    currentValue: 100000,
    coveredSalary: 20000,
    expectedPensionWithDeposits: 14000,
    expectedPensionWithoutDeposits: 12000,
    mofid: null,
    coverages: [],
    ...(over as object),
  } as unknown as Policy
}

function analysis(policies: Policy[], findings: Finding[], salary: number | null): Analysis {
  return {
    createdAt: '2026-01-01',
    client,
    policies,
    findings,
    executiveSummary: undefined,
    supplementary: { ...emptySupplementary(), currentGrossSalary: salary },
  } as unknown as Analysis
}

describe('computeHealthScore', () => {
  it('scores replacement ratio against the target (pension ÷ salary)', () => {
    // pension 14,000 ÷ salary 20,000 = 70% = the target → 100
    const h = computeHealthScore(analysis([policy()], [], 20000))
    const ret = h.dimensions.find((d) => d.key === 'retirement')!
    expect(ret.available).toBe(true)
    expect(ret.score).toBe(100)
    expect(h.score).not.toBeNull()
    expect(h.band).toBe('טוב')
  })

  it('drops retirement and renormalizes when no salary is known', () => {
    // No stated salary and no insured salary on the policy → no replacement ratio.
    const h = computeHealthScore(analysis([policy({ coveredSalary: null })], [], null))
    const ret = h.dimensions.find((d) => d.key === 'retirement')!
    expect(ret.available).toBe(false)
    expect(ret.weight).toBe(0)
    // remaining available weights renormalize to 100
    const sum = h.dimensions.filter((d) => d.available).reduce((s, d) => s + d.weight, 0)
    expect(sum).toBe(100)
  })

  it('lowers the coverage sub-score on an insurance gap', () => {
    const gap = makeFinding({ category: 'insurance', level: 'client', severity: 'gap', title: 'פער', description: '' })
    const h = computeHealthScore(analysis([policy()], [gap], 20000))
    const cov = h.dimensions.find((d) => d.key === 'coverage')!
    expect(cov.score).toBe(65) // 100 − 35
  })

  it('reflects changed weights in the total', () => {
    const gap = makeFinding({ category: 'insurance', level: 'client', severity: 'gap', title: 'פער', description: '' })
    const a = analysis([policy()], [gap], 20000)
    const base = computeHealthScore(a, DEFAULT_HEALTH_WEIGHTS)
    // Push all weight onto coverage → the total should equal the coverage sub-score (65)
    const heavy = computeHealthScore(a, { ...DEFAULT_HEALTH_WEIGHTS, retirement: 0, fees: 0, exposure: 0, findings: 0, completeness: 0, coverage: 100 })
    expect(heavy.score).toBe(65)
    expect(heavy.score).not.toBe(base.score)
  })

  it('returns a null score when nothing can be scored', () => {
    // No policies, no findings, but completeness always scores → still not null.
    // Force everything unavailable by zeroing every weight.
    const zero = { retirement: 0, coverage: 0, fees: 0, exposure: 0, findings: 0, completeness: 0 }
    const h = computeHealthScore(analysis([policy()], [], 20000), zero)
    expect(h.score).toBeNull()
    expect(h.band).toBeNull()
  })
})

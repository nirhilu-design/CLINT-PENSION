// Portfolio health score (מדד בריאות התיק): one 0–100 number that summarizes the
// portfolio across the dimensions the engines already measure, plus a transparent
// per-dimension breakdown (never a black box). Weights are editable; dimensions
// with no data are dropped and the weights renormalized over the rest.

import type { Analysis, Finding } from '../models/types'
import { effectiveSalary } from '../engines/engineTypes'
import { computeExposure } from './exposureService'
import { assessCompleteness } from './completenessService'
import { PENSION_TO_SALARY_MIN_RATIO } from '../config/thresholds'
import {
  DEFAULT_HEALTH_WEIGHTS,
  HEALTH_DIMENSIONS,
  type HealthDimensionKey,
  type HealthWeights,
} from '../config/healthWeights'

export interface HealthDimensionResult {
  key: HealthDimensionKey
  label: string
  weight: number // effective (renormalized) percent, 0 when unavailable
  rawWeight: number // the configured weight
  score: number | null // 0–100, null when no data
  available: boolean
  detail: string
}

export interface HealthScore {
  score: number | null // 0–100 weighted average, null when nothing could be scored
  band: 'טוב' | 'בינוני' | 'טעון טיפול' | null
  openFindings: number // gap + attention findings across the portfolio
  dimensions: HealthDimensionResult[]
}

const clamp = (n: number) => Math.max(0, Math.min(100, n))

/** Penalty-based sub-score: start at 100, subtract per open finding by severity. */
function penaltyScore(findings: Finding[], gapPenalty: number, attnPenalty: number): number {
  let s = 100
  for (const f of findings) {
    if (f.severity === 'gap') s -= gapPenalty
    else if (f.severity === 'attention') s -= attnPenalty
  }
  return clamp(s)
}

function ageFrom(birthISO: string | null): number | null {
  if (!birthISO) return null
  const b = new Date(birthISO)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return age
}

export function computeHealthScore(
  analysis: Analysis,
  weights: HealthWeights = DEFAULT_HEALTH_WEIGHTS,
): HealthScore {
  const { policies, findings, supplementary, client } = analysis

  const sub: Record<HealthDimensionKey, { score: number | null; detail: string }> = {
    retirement: { score: null, detail: '' },
    coverage: { score: null, detail: '' },
    fees: { score: null, detail: '' },
    exposure: { score: null, detail: '' },
    findings: { score: null, detail: '' },
    completeness: { score: null, detail: '' },
  }

  // 1) Retirement — replacement ratio vs target.
  const salary = effectiveSalary(policies, supplementary)
  const pension = policies.reduce(
    (s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0),
    0,
  )
  if (salary && salary > 0 && pension > 0) {
    const ratio = pension / salary
    const target = PENSION_TO_SALARY_MIN_RATIO || 0.7
    sub.retirement = {
      score: clamp((ratio / target) * 100),
      detail: `יחס תחלופה ${Math.round(ratio * 100)}% מול יעד ${Math.round(target * 100)}%`,
    }
  } else {
    sub.retirement.detail = 'חסר שכר או קצבה צפויה לחישוב'
  }

  // 2) Coverage — insurance / death findings.
  const coverageFindings = findings.filter((f) => f.category === 'insurance' || f.category === 'death')
  const coverageOpen = coverageFindings.filter((f) => f.severity !== 'info')
  sub.coverage = {
    score: penaltyScore(coverageFindings, 35, 18),
    detail: coverageOpen.length ? `${coverageOpen.length} פערי/נקודות כיסוי פתוחות` : 'לא נמצאו פערי כיסוי',
  }

  // 3) Fees — cost findings.
  const feeFindings = findings.filter((f) => f.category === 'cost')
  const feeOpen = feeFindings.filter((f) => f.severity !== 'info')
  sub.fees = {
    score: penaltyScore(feeFindings, 30, 15),
    detail: feeOpen.length ? `${feeOpen.length} נקודות בדמי הניהול` : 'דמי הניהול תקינים',
  }

  // 4) Exposure — equity share vs an age-appropriate glide-path target.
  const equityPct = computeExposure(policies, supplementary.treasuryAllocations).portfolio.equity.equityPercent
  const age = ageFrom(client.birthDate)
  if (equityPct !== null && age !== null) {
    const targetEquity = Math.max(20, Math.min(75, 110 - age)) // simple glide-path
    const diff = Math.abs(equityPct - targetEquity)
    sub.exposure = {
      score: clamp(100 - diff * 2),
      detail: `רכיב מנייתי ${Math.round(equityPct)}% מול יעד ≈${Math.round(targetEquity)}% לגיל ${age}`,
    }
  } else {
    sub.exposure.detail = 'אין נתוני אפיקי השקעה (אוצר) לחישוב'
  }

  // 5) Findings — everything not already counted above (severity-weighted).
  const otherFindings = findings.filter(
    (f) => !['insurance', 'death', 'cost', 'investment'].includes(f.category),
  )
  const otherOpen = otherFindings.filter((f) => f.severity !== 'info')
  sub.findings = {
    score: penaltyScore(otherFindings, 15, 7),
    detail: otherOpen.length ? `${otherOpen.length} נקודות פתוחות נוספות` : 'אין נקודות פתוחות נוספות',
  }

  // 6) Completeness.
  const completeness = assessCompleteness(analysis)
  sub.completeness = {
    score: completeness.complete ? 100 : clamp(100 - completeness.missing.length * 12),
    detail: completeness.complete ? 'כל הנתונים הדרושים קיימים' : `${completeness.missing.length} פערי מידע`,
  }

  // Assemble + renormalize over available dimensions.
  const availableWeight = HEALTH_DIMENSIONS.reduce(
    (s, d) => s + (sub[d.key].score !== null ? Math.max(0, weights[d.key] ?? 0) : 0),
    0,
  )
  const dimensions: HealthDimensionResult[] = HEALTH_DIMENSIONS.map((d) => {
    const raw = Math.max(0, weights[d.key] ?? 0)
    const available = sub[d.key].score !== null
    return {
      key: d.key,
      label: d.label,
      rawWeight: raw,
      weight: available && availableWeight > 0 ? Math.round((raw / availableWeight) * 100) : 0,
      score: sub[d.key].score,
      available,
      detail: sub[d.key].detail,
    }
  })

  let score: number | null = null
  if (availableWeight > 0) {
    const weighted = HEALTH_DIMENSIONS.reduce((s, d) => {
      const sc = sub[d.key].score
      return sc !== null ? s + sc * Math.max(0, weights[d.key] ?? 0) : s
    }, 0)
    score = Math.round(weighted / availableWeight)
  }

  const band = score === null ? null : score >= 80 ? 'טוב' : score >= 60 ? 'בינוני' : 'טעון טיפול'
  const openFindings = findings.filter((f) => f.severity !== 'info').length

  return { score, band, openFindings, dimensions }
}

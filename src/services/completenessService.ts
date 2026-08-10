// Assesses how complete the analysis inputs are, so the UI never claims
// "all clear" when checks simply could not run for lack of data.

import type { Analysis } from '../models/types'
import { policyFundCodes } from '../utils/mofid'

export interface CompletenessReport {
  complete: boolean
  missing: string[] // human-readable list of what would deepen the analysis
}

export function assessCompleteness(analysis: Analysis): CompletenessReport {
  const { policies, findings, supplementary } = analysis
  const missing: string[] = []

  // Treasury benchmark coverage per fund (matched by any of the policy's codes)
  const withMofid = policies.filter((p) => policyFundCodes(p).length > 0)
  const covered = new Set(supplementary.treasuryFunds.map((f) => f.mofid))
  const manual = new Set(supplementary.benchmarks.map((b) => b.mofid))
  const unbenchmarked = withMofid.filter(
    (p) => !policyFundCodes(p).some((c) => covered.has(c) || manual.has(c)),
  )
  if (unbenchmarked.length > 0) {
    missing.push(
      `נתוני השוואה (אוצר) חסרים עבור ${unbenchmarked.length} מתוך ${withMofid.length} קופות — השוואת תשואות לא בוצעה עבורן`,
    )
  }

  // Fee agreements
  if (supplementary.feeAgreements.length === 0) {
    missing.push('לא הוזנו הסכמי דמי ניהול — בדיקת פער מול הסכם לא בוצעה')
  }

  // Unanswered client questions that gate checks
  const unanswered: string[] = []
  if (supplementary.hasSpouse === null && supplementary.hasChildrenUnder21 === null) {
    unanswered.push('מצב משפחתי')
  }
  if (supplementary.currentGrossSalary === null) unanswered.push('שכר נוכחי')
  if (supplementary.employmentStatus === null) unanswered.push('סטטוס תעסוקה')
  if (unanswered.length > 0) {
    missing.push(`שאלות רקע שלא נענו (${unanswered.join(', ')}) — חלק מבדיקות הכיסויים והפרישה לא בוצעו`)
  }

  // Data-quality limitations reported by the engines
  const limitationCount = findings.filter((f) => f.category === 'limitation').length
  if (limitationCount > 0) {
    missing.push(`${limitationCount} מגבלות ניתוח דווחו על ידי המנועים (פירוט בסיכום המנהלים)`)
  }

  return { complete: missing.length === 0, missing }
}

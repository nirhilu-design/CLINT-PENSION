// Equity-Mix Engine:
// Compares equity exposure to an age-appropriate reference share, editable in
// the Logic Editor (targets per age band + the band boundaries). Two separate
// checks: (1) the blended savings family (gemel, gemel-investment, education),
// and (2) the pension funds on their own.
// Neutral finding only — describes the gap and refers to a licensed advisor;
// it never instructs a switch. Equity data comes from the treasury allocation
// file (group "מניות"); with no allocation data the check is skipped.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { SAVINGS_FAMILY, equityBreakdown } from '../services/exposureService'
import { ageOf } from '../utils/age'
import {
  EQUITY_YOUNG_MAX_AGE,
  EQUITY_MID_MAX_AGE,
  EQUITY_TARGET_YOUNG,
  EQUITY_TARGET_MID,
  EQUITY_TARGET_SENIOR,
  EQUITY_MIX_SLACK,
} from '../config/thresholds'

export const equityMixEngine: Engine = ({ client, policies, supplementary }) => {
  const age = ageOf(client)
  if (age === null) return []

  const bandLabel =
    age < EQUITY_YOUNG_MAX_AGE
      ? `מתחת לגיל ${EQUITY_YOUNG_MAX_AGE}`
      : age < EQUITY_MID_MAX_AGE
        ? `בגילאי ${EQUITY_YOUNG_MAX_AGE}–${EQUITY_MID_MAX_AGE}`
        : `מעל גיל ${EQUITY_MID_MAX_AGE}`
  const target =
    age < EQUITY_YOUNG_MAX_AGE
      ? EQUITY_TARGET_YOUNG
      : age < EQUITY_MID_MAX_AGE
        ? EQUITY_TARGET_MID
        : EQUITY_TARGET_SENIOR

  const findings = []
  const allocations = supplementary.treasuryAllocations

  // 1. Savings family (gemel, gemel-investment, education) — one blended figure.
  const savings = policies.filter((p) => p.status === 'active' && SAVINGS_FAMILY.includes(p.productType) && (p.currentValue ?? 0) > 0)
  const savingsEquity = equityBreakdown(savings, allocations)
  if (savingsEquity.equityPercent !== null && savingsEquity.equityPercent + EQUITY_MIX_SLACK < target) {
    findings.push(
      makeFinding({
        category: 'insight',
        level: 'client',
        severity: 'info',
        title: 'חשיפה מנייתית מתחת להקצה המקובל לגיל',
        description: `החשיפה המנייתית המשולבת בחיסכון (גמל+השתלמות) עומדת על ${savingsEquity.equityPercent.toFixed(0)}%, בעוד ש${bandLabel} הקצה מקובל לטווח פרישה הוא כ-${target}%; מיקוד הגדלת המניות בנכסי פרישה (ולא בהשתלמות נזילה) — נקודה לבדיקה מול בעל רישיון.`,
        basedOn: 'חשיפה מנייתית משוקללת (קובץ הקצאת נכסים) מול הקצה מקובל לגיל',
      }),
    )
  }

  // 2. Pension — a separate check on the pension funds' own equity share.
  const pension = policies.filter((p) => p.status === 'active' && p.productType === 'pension' && (p.currentValue ?? 0) > 0)
  const pensionEquity = equityBreakdown(pension, allocations)
  if (pensionEquity.equityPercent !== null && pensionEquity.equityPercent + EQUITY_MIX_SLACK < target) {
    findings.push(
      makeFinding({
        category: 'insight',
        level: 'client',
        severity: 'info',
        title: 'חשיפה מנייתית בקרן הפנסיה מתחת להקצה המקובל לגיל',
        description: `החשיפה המנייתית בקרן הפנסיה עומדת על ${pensionEquity.equityPercent.toFixed(0)}%, בעוד ש${bandLabel} הקצה מקובל הוא כ-${target}%; האם יש מקום להעלאת רכיב הסיכון בהתאם לטווח עד הפרישה — נקודה לבדיקה מול בעל רישיון.`,
        basedOn: 'חשיפה מנייתית משוקללת בקרן הפנסיה (קובץ הקצאת נכסים) מול הקצה מקובל לגיל',
        productType: 'pension',
      }),
    )
  }

  return findings
}

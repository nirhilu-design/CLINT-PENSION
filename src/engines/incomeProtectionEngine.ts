// Income Protection Engine: aggregate disability benefit vs salary.
// Sums the monthly disability benefit (הפיצוי) across ALL active products —
// pension נכות and אכ"ע riders alike — and expresses it as a share of salary.
// A combined replacement ratio at or above the target is acceptable even when it
// exceeds it; only a shortfall below the target is flagged.

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'

import { IP_TARGET_COVERAGE_PERCENT as TARGET_PERCENT } from '../config/thresholds'

export const incomeProtectionEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const disabilityCoverages = policies
    .filter((p) => !isBlockedByStopIssue(p) && p.status === 'active')
    .flatMap((p) => p.coverages.filter((c) => c.type === 'disability').map((c) => ({ policy: p, coverage: c })))

  // Family relying on this income raises the stakes of every IP gap
  const familyRelies = supplementary.familyReliesOnIncome === true

  if (disabilityCoverages.length === 0) {
    findings.push(
      makeFinding({
        category: 'insurance',
        level: 'client',
        severity: familyRelies ? 'gap' : 'attention',
        title: familyRelies
          ? 'נמצא פער: המשפחה מסתמכת על ההכנסה ואין כיסוי אובדן כושר עבודה'
          : 'לא נמצא כיסוי אובדן כושר עבודה',
        description:
          'במוצרים שנותחו לא אותר כיסוי לאובדן כושר עבודה' +
          (familyRelies ? ', בעוד צוין שהמשפחה מסתמכת על ההכנסה שלך' : '') +
          '. נקודה לבדיקה מול בעל רישיון האם קיים כיסוי כזה במוצרים נוספים.',
      }),
    )
    return findings
  }

  // Aggregate replacement ratio: the total monthly disability benefit across all
  // products (פנסיית נכות + אכ"ע) as a share of salary. A combined ratio at or
  // above the target is fine even if the products together exceed it — over-
  // coverage is never flagged; only a shortfall below the target is a gap.
  const salary = effectiveSalary(policies, supplementary)
  if (salary && salary > 0) {
    const fromClient = supplementary.currentGrossSalary !== null
    const totalBenefit = disabilityCoverages.reduce(
      (sum, { coverage }) => sum + (coverage.amount ?? 0),
      0,
    )
    if (totalBenefit > 0) {
      const coveragePercent = (totalBenefit / salary) * 100
      if (coveragePercent < TARGET_PERCENT) {
        findings.push(
          makeFinding({
            category: 'insurance',
            level: 'client',
            severity: 'gap',
            title: 'שיעור הפיצוי לאובדן כושר עבודה נמוך מהיעד',
            description:
              `סך הפיצוי החודשי לאובדן כושר עבודה מכל המוצרים (${formatCurrency(totalBenefit)}) ` +
              `מהווה ${coveragePercent.toFixed(0)}% מ${fromClient ? 'השכר שציינת' : 'השכר המדווח בקבצים'} ` +
              `(${formatCurrency(salary)}), לעומת יעד של ${TARGET_PERCENT}%. נקודה לבדיקה מול בעל רישיון.`,
            basedOn: fromClient
              ? 'סך סכומי הפיצוי לנכות/אכ"ע בקבצי המסלקה מול השכר שהוזן בטופס'
              : 'סך סכומי הפיצוי לנכות/אכ"ע מול השכר המבוטח הגבוה בתיק, שניהם מקבצי המסלקה',
          }),
        )
      }
    }
  }

  return findings
}

// Retirement Engine: expected pension analysis + managers classification review.
// No automatic transfer recommendations — soft wording only.

import type { Engine } from './engineTypes'
import { makeFinding, salaryFromPolicies } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'

const generationLabels: Record<string, string> = {
  'before-2001-06': 'לפני יוני 2001 (מקדם מובטח היסטורי)',
  '2001-06-to-2004': 'יוני 2001 עד 2004',
  '2004-to-2013': '2004 עד 2013',
  '2013-plus': '2013 ואילך',
}

export const retirementEngine: Engine = ({ policies }) => {
  const findings = []

  const pensionable = policies.filter(
    (p) =>
      (p.productType === 'pension' || p.productType === 'managers') &&
      !isBlockedByStopIssue(p) &&
      p.status === 'active',
  )

  // Aggregate expected pension
  const withPension = pensionable.filter((p) => p.expectedPension !== null)
  const totalExpected = withPension.reduce((sum, p) => sum + (p.expectedPension ?? 0), 0)

  if (withPension.length > 0) {
    findings.push(
      makeFinding({
        category: 'retirement',
        level: 'client',
        severity: 'info',
        title: 'קצבה חודשית צפויה בפרישה',
        description: `סך הקצבה החודשית הצפויה מהמוצרים הפנסיוניים הפעילים: ${formatCurrency(totalExpected)}.`,
      }),
    )

    const salary = salaryFromPolicies(policies)
    if (salary && salary > 0) {
      const ratio = Math.round((totalExpected / salary) * 100)
      if (ratio < 70) {
        findings.push(
          makeFinding({
            category: 'retirement',
            level: 'client',
            severity: 'attention',
            title: 'הקצבה הצפויה נמוכה ביחס לשכר',
            description:
              `הקצבה הצפויה מהווה כ-${ratio}% מהשכר המבוטח המדווח בקבצים (${formatCurrency(salary)}). ` +
              'מומלץ לבחון את היקף החיסכון הפנסיוני ואת רמת ההפקדות.',
          }),
        )
      }
    }
  }

  // Pension products missing expected pension → limitation, not a guess
  for (const p of pensionable.filter((p) => p.expectedPension === null)) {
    findings.push(
      makeFinding({
        category: 'limitation',
        level: 'policy',
        severity: 'info',
        title: 'לא ניתן לחשב קצבה צפויה',
        description: `בפוליסה ${p.policyNumber} לא דווח נתון קצבה צפויה, ולכן לא נכלל בניתוח הפרישה.`,
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  // Managers classification review (information only)
  for (const p of policies.filter((p) => p.productType === 'managers' && p.managersGeneration)) {
    findings.push(
      makeFinding({
        category: 'retirement',
        level: 'policy',
        severity: 'info',
        title: 'סיווג דור ביטוח המנהלים',
        description:
          `פוליסה ${p.policyNumber} שייכת לדור: ${generationLabels[p.managersGeneration!]}. ` +
          'מומלץ לבחון את משמעות הדור על תנאי הקצבה.',
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  return findings
}

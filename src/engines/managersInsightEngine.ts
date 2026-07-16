// Managers Insight Engine: observations (הארות) about the structure of
// managers-insurance policies in the portfolio context.
// This system analyzes and highlights — it never recommends actions
// and never replaces a licensed agent.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

// Salary equivalent of the comprehensive pension fund deposit cap:
// twice the national average wage (2025 ≈ ₪13,316 → cap salary ≈ ₪26,632)
export const MEKIFA_SALARY_CAP = 26632

export const managersInsightEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const activeManagers = policies.filter(
    (p) => p.productType === 'managers' && p.status === 'active' && !isBlockedByStopIssue(p),
  )
  if (activeManagers.length === 0) return []

  const activePension = policies.filter((p) => p.productType === 'pension' && p.status === 'active')
  const pensionSalary = activePension.length
    ? Math.max(...activePension.map((p) => p.coveredSalary ?? 0))
    : 0
  const hasStandaloneIP = policies.some(
    (p) => p.productType === 'incomeProtection' && p.status === 'active',
  )
  const portfolioDisabilitySources = policies.filter(
    (p) => p.status === 'active' && p.coverages.some((c) => c.type === 'disability'),
  )

  const clientNotes: string[] = []

  for (const policy of activeManagers) {
    const notes: string[] = []

    // Layer structure vs the comprehensive pension fund deposit cap
    if (activePension.length === 0) {
      notes.push(
        'בתיק אין קרן פנסיה מקיפה פעילה — ההפקדות הפנסיוניות מתבצעות בביטוח המנהלים בלבד. ' +
          'כדאי להכיר את הבדלי העלויות בין המוצרים, כולל קיומה של קרן פנסיה משלימה',
      )
    } else if (pensionSalary < MEKIFA_SALARY_CAP) {
      const parts = [
        'ההפקדות לביטוח המנהלים מתבצעות בעוד תקרת ההפקדה לקרן הפנסיה המקיפה אינה מנוצלת במלואה',
        'קיימת גם אפשרות של קרן פנסיה משלימה כרובד נוסף',
      ]
      if (hasStandaloneIP) {
        parts.push('בתיק קיים כיסוי אובדן כושר עבודה נפרד — נתון רלוונטי להשוואת המבנים')
      }
      if (supplementary.feeAgreements.length > 0) {
        parts.push('הוזנו הסכמי דמי ניהול — ייתכן רובד דמי ניהול מפעליים שמשפיע על ההשוואה')
      }
      notes.push(parts.join('. '))
    } else {
      notes.push(
        'שכר הבסיס בקרן הפנסיה המקיפה נמצא סביב התקרה — ביטוח המנהלים משמש רובד מעל תקרת המקיפה, מבנה מקובל',
      )
    }

    // אכ"ע rider inside the policy
    const hasDisabilityRider = policy.coverages.some((c) => c.type === 'disability')
    if (hasDisabilityRider) {
      notes.push('הפוליסה כוללת רכיב אובדן כושר עבודה — כל שינוי בפוליסה משפיע גם על כיסוי זה')
    }

    findings.push(
      makeFinding({
        category: 'insight',
        level: 'policy',
        severity: 'info',
        title: 'הארות על מבנה הפוליסה בתיק',
        description: `פוליסה ${policy.policyNumber}: ${notes.join(' | ')}.`,
        productType: 'managers',
        policyNumber: policy.policyNumber,
      }),
    )

    clientNotes.push(
      `בפוליסה ${policy.policyNumber}${policy.hasGuaranteedFactor ? ' (עם מקדם מובטח)' : ''}: ${notes[0]}`,
    )
  }

  // Client-level: the managers policy is the only disability source in the portfolio
  const managersOnlyDisability =
    portfolioDisabilitySources.length > 0 &&
    portfolioDisabilitySources.every((p) => p.productType === 'managers')
  if (managersOnlyDisability) {
    clientNotes.push(
      'כיסוי אובדן כושר העבודה היחיד בתיק מצוי בפוליסת ביטוח המנהלים — נקודה חשובה להכרה',
    )
  }

  // Consolidated observation for the executive summary (one finding, not many)
  findings.push(
    makeFinding({
      category: 'insight',
      level: 'client',
      severity: 'info',
      title: 'הארות על מבנה ביטוח המנהלים בתיק',
      description: clientNotes.join(' • ') + '.',
    }),
  )

  return findings
}

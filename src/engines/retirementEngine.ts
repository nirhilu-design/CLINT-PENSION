// Retirement Engine: expected pension analysis + managers classification review.
// No automatic transfer recommendations — soft wording only.

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { PENSION_TO_SALARY_MIN_RATIO } from '../config/thresholds'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'

export const retirementEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const pensionable = policies.filter(
    (p) =>
      (p.productType === 'pension' || p.productType === 'managers') &&
      !isBlockedByStopIssue(p) &&
      p.status === 'active',
  )

  // Aggregate expected pension. The realistic figure for an active saver assumes
  // continued deposits; the "no further deposits" figure is the conservative floor.
  const hasPensionData = (p: (typeof pensionable)[number]) =>
    p.expectedPensionWithDeposits !== null || p.expectedPensionWithoutDeposits !== null
  const primaryPension = (p: (typeof pensionable)[number]) =>
    p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0

  const withPension = pensionable.filter(hasPensionData)
  const totalExpected = withPension.reduce((sum, p) => sum + primaryPension(p), 0)
  const totalWithoutDeposits = withPension.reduce(
    (sum, p) => sum + (p.expectedPensionWithoutDeposits ?? 0),
    0,
  )

  if (withPension.length > 0) {
    findings.push(
      makeFinding({
        category: 'retirement',
        level: 'client',
        severity: 'info',
        title: 'קצבה חודשית צפויה בפרישה',
        description:
          `סך הקצבה החודשית הצפויה מהמוצרים הפנסיוניים הפעילים בהמשך הפקדות: ${formatCurrency(totalExpected)}` +
          (totalWithoutDeposits > 0
            ? ` · ללא המשך הפקדות: ${formatCurrency(totalWithoutDeposits)}.`
            : '.'),
      }),
    )

    const salary = effectiveSalary(policies, supplementary)
    if (salary && salary > 0) {
      const fromClient = supplementary.currentGrossSalary !== null
      const ratio = Math.round((totalExpected / salary) * 100)
      if (ratio < PENSION_TO_SALARY_MIN_RATIO * 100) {
        findings.push(
          makeFinding({
            category: 'retirement',
            level: 'client',
            severity: 'attention',
            title: 'הקצבה הצפויה נמוכה ביחס לשכר',
            description:
              `הקצבה הצפויה מהווה כ-${ratio}% מ${fromClient ? 'השכר שציינת' : 'השכר המבוטח המדווח בקבצים'} (${formatCurrency(salary)}). ` +
              'מומלץ לבחון את היקף החיסכון הפנסיוני ואת רמת ההפקדות.',
          }),
        )
      }
    }

  }

  // Self-employed: mandatory pension applies — flag when no active pension-type product
  if (
    (supplementary.employmentStatus === 'selfEmployed' || supplementary.employmentStatus === 'both') &&
    pensionable.length === 0
  ) {
    findings.push(
      makeFinding({
        category: 'retirement',
        level: 'client',
        severity: 'attention',
        title: 'עצמאי ללא מוצר פנסיוני פעיל בתיק',
        description:
          'צוין סטטוס עצמאי, אך בקבצים לא זוהה מוצר פנסיוני פעיל. על עצמאים חלה חובת הפקדה לפנסיה — כדאי לבדוק האם קיים מוצר שלא הועלה.',
      }),
    )
  }

  // Pension products missing expected pension → limitation, not a guess
  for (const p of pensionable.filter((p) => !hasPensionData(p))) {
    findings.push(
      makeFinding({
        category: 'limitation',
        level: 'policy',
        severity: 'info',
        title: 'לא ניתן לחשב קצבה צפויה',
        description: `בפוליסה ${p.policyNumber} לא דווח נתון קצבה צפויה, ולכן לא נכלל בניתוח הפרישה.`,
        missingInfo: 'נתון קצבה צפויה (KITZVAT-HODSHIT-TZFUYA) בדיווח היצרן',
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  // Employee without employer contributions anywhere — worth checking entitlement
  if (
    (supplementary.employmentStatus === 'employee' || supplementary.employmentStatus === 'both') &&
    pensionable.length > 0
  ) {
    const hasEmployerContribution = policies.some(
      (p) =>
        p.status === 'active' &&
        p.contributions.some((c) => c.role === 'employer' && (c.percent ?? 0) > 0),
    )
    if (!hasEmployerContribution) {
      findings.push(
        makeFinding({
          category: 'retirement',
          level: 'client',
          severity: 'attention',
          title: 'לא זוהו הפרשות מעסיק בקבצים',
          description:
            'צוין סטטוס שכיר, אך באף מוצר פעיל לא זוהו הפרשות מעסיק. ' +
            'כדאי לבדוק שההפרשות מהמעסיק אכן מתבצעות ומדווחות.',
        }),
      )
    }
  }

  // Not working: coverages survive only a limited period without deposits
  if (supplementary.employmentStatus === 'notWorking') {
    const hasCoverages = policies.some(
      (p) => p.status === 'active' && p.coverages.length > 0,
    )
    if (hasCoverages) {
      findings.push(
        makeFinding({
          category: 'insurance',
          level: 'client',
          severity: 'attention',
          title: 'ללא עבודה כיום — שמירת הכיסויים הביטוחיים מוגבלת בזמן',
          description:
            'צוין שאינך עובד/ת כיום. ללא הפקדות שוטפות, הכיסויים הביטוחיים בקרן הפנסיה נשמרים לתקופה מוגבלת בלבד (הסדר ריסק זמני). ' +
            'מומלץ לבחון את המשך הכיסוי מול הקרן.',
        }),
      )
    }
  }

  // Frozen (inactive) pension funds: no insurance coverage, often higher fees
  for (const p of policies.filter(
    (p) => (p.productType === 'pension' || p.productType === 'gemel') && p.status === 'inactive' && (p.currentValue ?? 0) > 0,
  )) {
    findings.push(
      makeFinding({
        category: 'retirement',
        level: 'policy',
        severity: 'attention',
        title: 'חשבון לא פעיל (מוקפא) עם צבירה',
        description:
          `בחשבון ${p.policyNumber} (${p.managingCompany ?? ''}) קיימת צבירה של ${formatCurrency(p.currentValue)} ללא הפקדות שוטפות. ` +
          'בחשבון מוקפא אין כיסוי ביטוחי ולעיתים דמי הניהול גבוהים יותר. מומלץ לבחון איחוד חשבונות.',
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  // Managers generation classification moved to stopIssueEngine (the managers
  // generation engine), which now examines all generations.

  return findings
}

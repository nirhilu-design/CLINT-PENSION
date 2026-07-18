// Retirement Engine: expected pension analysis + managers classification review.
// No automatic transfer recommendations — soft wording only.

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'

const generationLabels: Record<string, string> = {
  'before-2001-06': 'לפני יוני 2001 (מקדם מובטח היסטורי)',
  '2001-06-to-2004': 'יוני 2001 עד 2004',
  '2004-to-2013': '2004 עד 2013',
  '2013-plus': '2013 ואילך',
}

export const retirementEngine: Engine = ({ policies, supplementary }) => {
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

    const salary = effectiveSalary(policies, supplementary)
    if (salary && salary > 0) {
      const fromClient = supplementary.currentGrossSalary !== null
      const ratio = Math.round((totalExpected / salary) * 100)
      if (ratio < 70) {
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

  // Managers classification review
  for (const p of policies.filter(
    (p) => p.productType === 'managers' && p.managersGeneration && !isBlockedByStopIssue(p),
  )) {
    const gen = p.managersGeneration!
    const isNewGuaranteedFactorEra = gen === '2001-06-to-2004' || gen === '2004-to-2013'

    if (isNewGuaranteedFactorEra && p.hasGuaranteedFactor) {
      // Observation only: the value of a 2001-2013 factor depends on age and
      // the full picture (near retirement it may even gain importance) —
      // the system highlights, it does not judge.
      findings.push(
        makeFinding({
          category: 'insight',
          level: 'policy',
          severity: 'info',
          title: 'קיים מקדם קצבה מובטח מדור 2001–2013',
          description:
            `בפוליסה ${p.policyNumber} (${generationLabels[gen]}) קיים מקדם קצבה מובטח. ` +
            'בפוליסות מדור זה גלומה עלות עבור הבטחת המקדם, ושוויה בפועל תלוי בגיל, בוותק ובתמונה הכוללת של התיק — ' +
            'נקודה שחשוב להכיר בבחינת הפוליסה.',
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    } else {
      findings.push(
        makeFinding({
          category: 'retirement',
          level: 'policy',
          severity: 'info',
          title: 'סיווג דור ביטוח המנהלים',
          description:
            `פוליסה ${p.policyNumber} שייכת לדור: ${generationLabels[gen]}` +
            (p.hasGuaranteedFactor ? '. קיים מקדם קצבה מובטח.' : '. ללא מקדם קצבה מובטח.'),
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }
  }

  return findings
}

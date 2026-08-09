// Pension Insight Engine: observations (הארות) about the insurance track
// of pension funds against the client's family context. Highlights only —
// never recommendations.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'
import { productTypeLabels } from '../models/labels'

import {
  MAX_PENSION_DISABILITY_PERCENT as MAX_DISABILITY_PERCENT,
  PENSION_DISABILITY_LOW_PERCENT,
} from '../config/thresholds'

export const pensionInsightEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const activePension = policies.filter(
    (p) => p.productType === 'pension' && p.status === 'active' && !isBlockedByStopIssue(p),
  )

  // Cross-product view: disability / אכ"ע coverage that exists OUTSIDE the pension
  // fund (e.g. a managers policy with an income-protection rider). A low pension
  // disability percent is not a gap on its own when covered elsewhere.
  const otherDisabilityPolicies = policies.filter(
    (p) =>
      p.productType !== 'pension' &&
      p.status === 'active' &&
      !isBlockedByStopIssue(p) &&
      p.coverages.some((c) => c.type === 'disability'),
  )

  const noDependents =
    supplementary.hasSpouse === false && supplementary.hasChildrenUnder21 === false
  const hasDependents =
    supplementary.hasSpouse === true || supplementary.hasChildrenUnder21 === true

  for (const policy of activePension) {
    const survivorsCost = policy.coverages
      .filter((c) => c.type === 'survivors')
      .reduce((sum, c) => sum + (c.cost ?? 0), 0)

    // The survivors waiver (ויתור שאירים) is valid for two years and renews
    // automatically. A change in family status should end it, so an active
    // waiver always warrants a tracking note — its weight depends on the
    // current family status.
    if (policy.survivorsWaiver === true) {
      if (hasDependents) {
        // Deficit: dependents exist yet no survivors pension would be paid.
        findings.push(
          makeFinding({
            category: 'insurance',
            level: 'policy',
            severity: 'attention',
            title: 'ויתור על כיסוי שאירים למרות שצוינו תלויים',
            description:
              `בקרן ${policy.policyNumber} קיים ויתור על כיסוי שאירים, בעוד צוין שקיימים בן/בת זוג או ילדים מתחת לגיל 21. ` +
              'המשמעות: במקרה פטירה לא תשולם קצבת שאירים מהקרן. ' +
              'הוויתור בתוקף לשנתיים ומתחדש אוטומטית, וייתכן שהתחדש למרות שינוי במצב המשפחתי — ' +
              'ביטול הוויתור והחזרת כיסוי השאירים הם נקודה לבדיקה מול בעל רישיון.',
            productType: 'pension',
            policyNumber: policy.policyNumber,
          }),
        )
      } else {
        // No dependents (or unknown): the waiver fits, but it renews silently —
        // surface it for ongoing tracking against family status.
        findings.push(
          makeFinding({
            category: 'insight',
            level: 'policy',
            severity: 'info',
            title: 'קיים ויתור על כיסוי שאירים — למעקב',
            description:
              `בקרן ${policy.policyNumber} קיים ויתור על כיסוי שאירים` +
              (noDependents ? ', בהתאם לכך שצוין שאין בן/בת זוג וילדים מתחת לגיל 21. ' : '. ') +
              'הוויתור בתוקף לשנתיים ומתחדש אוטומטית ללא התראה. ' +
              'אם המצב המשפחתי ישתנה (בן/בת זוג או ילדים), יש לוודא שהוויתור אינו מתחדש מאליו — נקודה למעקב מול בעל רישיון.',
            productType: 'pension',
            policyNumber: policy.policyNumber,
          }),
        )
      }
    } else if (noDependents && survivorsCost > 0) {
      // Paying for survivors coverage with no dependents — possibly unnecessary.
      findings.push(
        makeFinding({
          category: 'insight',
          level: 'policy',
          severity: 'info',
          title: 'כיסוי שאירים בתשלום ללא תלויים',
          description:
            `בקרן ${policy.policyNumber} משולם כיסוי שאירים בעלות של כ-${formatCurrency(survivorsCost)} לחודש, ` +
            'בעוד צוין שאין בן/בת זוג וילדים מתחת לגיל 21. ' +
            'קיים בקרנות הפנסיה מסלול ויתור שאירים (בתוקף לשנתיים, מתחדש אוטומטית) — ' +
            'התאמת הכיסוי למצב המשפחתי היא נקודה לבדיקה מול בעל רישיון.',
          productType: 'pension',
          policyNumber: policy.policyNumber,
        }),
      )
    }

    // Low pension disability → look across products before calling it a gap.
    // A pension fund's נכות is often intentionally partial because אכ"ע sits in
    // a managers/life policy. Below the low threshold we point to that check.
    const disabilityPercents = policy.coverages
      .filter((c) => c.type === 'disability' && c.percent !== null)
      .map((c) => c.percent!)
    if (disabilityPercents.length > 0) {
      const maxPercent = Math.max(...disabilityPercents)
      if (maxPercent < PENSION_DISABILITY_LOW_PERCENT) {
        const coveredElsewhere = otherDisabilityPolicies.length > 0
        const others = otherDisabilityPolicies
          .map((p) => `${p.policyNumber} (${productTypeLabels[p.productType]})`)
          .join(', ')
        findings.push(
          makeFinding({
            category: 'insight',
            level: 'policy',
            severity: 'info',
            title: coveredElsewhere
              ? 'כיסוי הנכות בקרן נמוך — קיים כיסוי אכ"ע במוצר אחר'
              : 'כיסוי הנכות בקרן נמוך — לא זוהה כיסוי אכ"ע במוצר אחר',
            description: coveredElsewhere
              ? `בקרן ${policy.policyNumber} שיעור כיסוי הנכות הוא ${maxPercent.toFixed(0)}% בלבד ` +
                `(מתוך מקסימום ${MAX_DISABILITY_PERCENT}%). זוהה כיסוי אובדן כושר עבודה גם ב-${others}, ` +
                'כך שייתכן שהתמונה המצרפית מכסה את מלוא השכר. נקודה לבדיקה מול בעל רישיון.'
              : `בקרן ${policy.policyNumber} שיעור כיסוי הנכות הוא ${maxPercent.toFixed(0)}% בלבד ` +
                `(מתוך מקסימום ${MAX_DISABILITY_PERCENT}%), ולא זוהה כיסוי אובדן כושר עבודה במוצר אחר. ` +
                'ייתכן פער בכיסוי אובדן כושר עבודה — נקודה לבדיקה מול בעל רישיון.',
            productType: 'pension',
            policyNumber: policy.policyNumber,
          }),
        )
      }
    }
  }

  return findings
}

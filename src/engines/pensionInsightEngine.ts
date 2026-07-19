// Pension Insight Engine: observations (הארות) about the insurance track
// of pension funds against the client's family context. Highlights only —
// never recommendations.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'

import { MAX_PENSION_DISABILITY_PERCENT as MAX_DISABILITY_PERCENT } from '../config/thresholds'

export const pensionInsightEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const activePension = policies.filter(
    (p) => p.productType === 'pension' && p.status === 'active' && !isBlockedByStopIssue(p),
  )

  const noDependents =
    supplementary.hasSpouse === false && supplementary.hasChildrenUnder21 === false
  const hasDependents =
    supplementary.hasSpouse === true || supplementary.hasChildrenUnder21 === true

  for (const policy of activePension) {
    const survivorsCost = policy.coverages
      .filter((c) => c.type === 'survivors')
      .reduce((sum, c) => sum + (c.cost ?? 0), 0)

    // Direction 1: no dependents, yet paying for survivors coverage
    if (noDependents && !policy.survivorsWaiver && survivorsCost > 0) {
      findings.push(
        makeFinding({
          category: 'insight',
          level: 'policy',
          severity: 'info',
          title: 'כיסוי שאירים בתשלום ללא תלויים',
          description:
            `בקרן ${policy.policyNumber} משולם כיסוי שאירים בעלות של כ-${formatCurrency(survivorsCost)} לחודש, ` +
            'בעוד צוין שאין בן/בת זוג וילדים מתחת לגיל 21. ' +
            'קיים בקרנות הפנסיה מסלול ויתור שאירים לרווקים (מתחדש אחת לשנתיים) — נקודה שכדאי להכיר.',
          productType: 'pension',
          policyNumber: policy.policyNumber,
        }),
      )
    }

    // Direction 2 (stronger): dependents exist but survivors coverage is waived
    if (hasDependents && policy.survivorsWaiver === true) {
      findings.push(
        makeFinding({
          category: 'insurance',
          level: 'policy',
          severity: 'attention',
          title: 'קיים ויתור על כיסוי שאירים למרות שצוינו תלויים',
          description:
            `בקרן ${policy.policyNumber} קיים ויתור על כיסוי שאירים, בעוד צוין שקיימים בן/בת זוג או ילדים מתחת לגיל 21. ` +
            'המשמעות: במקרה פטירה לא תשולם קצבת שאירים מהקרן. מומלץ לבחון את התאמת המסלול הביטוחי.',
          productType: 'pension',
          policyNumber: policy.policyNumber,
        }),
      )
    }

    // Basic track observation: disability coverage below the maximum
    const disabilityPercents = policy.coverages
      .filter((c) => c.type === 'disability' && c.percent !== null)
      .map((c) => c.percent!)
    if (disabilityPercents.length > 0) {
      const maxPercent = Math.max(...disabilityPercents)
      if (maxPercent < MAX_DISABILITY_PERCENT) {
        findings.push(
          makeFinding({
            category: 'insight',
            level: 'policy',
            severity: 'info',
            title: 'מסלול הביטוח אינו בכיסוי הנכות המרבי',
            description:
              `בקרן ${policy.policyNumber} שיעור הכיסוי לנכות במסלול הנוכחי הוא ${maxPercent.toFixed(0)}%, ` +
              `לעומת כיסוי מרבי אפשרי של ${MAX_DISABILITY_PERCENT}%. נקודה שכדאי להכיר בבחינת מסלול הביטוח.`,
            productType: 'pension',
            policyNumber: policy.policyNumber,
          }),
        )
      }
    }
  }

  return findings
}

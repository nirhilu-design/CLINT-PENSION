// Deposits & Continuity Engine.
// Surfaces only two states for an active savings policy:
//   1. ריסק זמני — deposits stopped, coverage kept alive temporarily.
//   2. Active policy with no deposits at all in the files.
// When deposits do exist (even if stale or gapped) nothing is raised.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

export const depositsEngine: Engine = ({ policies }) => {
  const findings = []

  for (const p of policies) {
    if (isBlockedByStopIssue(p)) continue

    // Temporary-risk status (ריסק זמני): deposits stopped and the risk coverage is
    // being kept alive from the accumulation for a limited period — surfaced on its
    // own, since the missing deposits are explained by this state.
    if (p.temporaryRisk) {
      findings.push(
        makeFinding({
          category: 'deposits',
          level: 'policy',
          severity: 'attention',
          title: 'הפוליסה במצב ריסק זמני',
          description:
            `פוליסה ${p.policyNumber} מדווחת בסטטוס ריסק זמני — ההפקדות הופסקו והכיסוי הביטוחי נשמר ` +
            'זמנית על חשבון הצבירה, לתקופה מוגבלת בלבד. נקודה לבדיקה מול בעל רישיון.',
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
      continue
    }

    if (p.status !== 'active') continue
    // Risk-only products have no ongoing savings deposits to track
    if (p.productType === 'life' || p.productType === 'incomeProtection') continue

    // Only surface an active policy that shows no deposits at all.
    const hasDeposits =
      p.lastDepositMonth !== null || p.monthlyDeposits.some((d) => d.total > 0)
    if (hasDeposits) continue

    findings.push(
      makeFinding({
        category: 'deposits',
        level: 'policy',
        severity: 'attention',
        title: 'פוליסה פעילה ללא הפקדות',
        description: `פוליסה ${p.policyNumber} פעילה אך לא זוהתה בה אף הפקדה בקבצים; נקודה לבדיקה מול בעל רישיון.`,
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  return findings
}

// Deposits & Continuity Engine.
// All recency checks are measured against the file's as-of date
// (TAARICH-NECHONUT), never against today — uploaded files may be old.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'
import {
  DEPOSIT_RECENCY_MONTHS,
  DEPOSIT_CONTINUITY_WINDOW_MONTHS,
} from '../config/thresholds'

/** Month arithmetic on 'yyyy-mm' strings */
function monthIndex(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return y * 12 + (m - 1)
}

export const depositsEngine: Engine = ({ policies }) => {
  const findings = []

  for (const p of policies) {
    if (isBlockedByStopIssue(p) || p.status !== 'active') continue
    // Risk-only products have no ongoing savings deposits to track
    if (p.productType === 'life' || p.productType === 'incomeProtection') continue

    const asOf = p.reportDate ? p.reportDate.slice(0, 7) : null

    // 1. Recency: last deposit vs the file's as-of month
    if (asOf && p.lastDepositMonth) {
      const gapMonths = monthIndex(asOf) - monthIndex(p.lastDepositMonth)
      if (gapMonths > DEPOSIT_RECENCY_MONTHS) {
        findings.push(
          makeFinding({
            category: 'deposits',
            level: 'policy',
            severity: 'attention',
            title: 'ההפקדה האחרונה אינה עדכנית',
            description:
              `בפוליסה ${p.policyNumber} ההפקדה האחרונה נקלטה בחודש ${p.lastDepositMonth}, ` +
              `כ-${gapMonths} חודשים לפני תאריך הנתונים (${asOf}). ` +
              'ייתכן עיכוב בהעברת הפקדות — כדאי לבדוק מול המעסיק או הגורם המשלם.',
            productType: p.productType,
            policyNumber: p.policyNumber,
          }),
        )
      }
    }

    // 2. Continuity: gaps inside the reported monthly deposits window
    if (p.monthlyDeposits.length >= 2) {
      const months = p.monthlyDeposits.map((d) => monthIndex(d.month))
      const last = Math.max(...months)
      const windowStart = last - (DEPOSIT_CONTINUITY_WINDOW_MONTHS - 1)
      const inWindow = new Set(months.filter((m) => m >= windowStart))
      const firstReported = Math.min(...months)
      // Only judge months we could have seen (window may start before the data does)
      const checkFrom = Math.max(windowStart, firstReported)
      const expected = last - checkFrom + 1
      const missing = expected - [...inWindow].filter((m) => m >= checkFrom).length

      if (missing > 0) {
        findings.push(
          makeFinding({
            category: 'deposits',
            level: 'policy',
            severity: 'attention',
            title: 'זוהו חודשים ללא הפקדה',
            description:
              `בפוליסה ${p.policyNumber} חסרות הפקדות עבור ${missing} מתוך ${expected} חודשי השכר האחרונים שדווחו. ` +
              'אי-רציפות בהפקדות עשויה לפגוע בכיסויים הביטוחיים ובצבירה — כדאי לבדוק את סיבת הפער.',
            productType: p.productType,
            policyNumber: p.policyNumber,
          }),
        )
      }

      // 3. Information: total deposits over the reported window
      const windowTotal = p.monthlyDeposits
        .filter((d) => monthIndex(d.month) >= checkFrom)
        .reduce((s, d) => s + d.total, 0)
      findings.push(
        makeFinding({
          category: 'information',
          level: 'policy',
          severity: 'info',
          title: 'סך הפקדות בתקופה המדווחת',
          description:
            `בפוליסה ${p.policyNumber} הופקדו ${formatCurrency(windowTotal)} ` +
            `ב-${expected - missing} חודשי הפקדה (מתוך ${expected} חודשי שכר אחרונים שדווחו).`,
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }
  }

  return findings
}

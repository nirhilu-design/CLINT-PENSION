// Fee Benchmark Engine:
// Flags per-fund management fees that exceed an editable benchmark (BM),
// set per product type in the Logic Editor (marketFees table). The employer
// fee agreement (advisor area) takes precedence: a policy that HAS an agreement
// is judged against it by costEngine, so it is skipped here to avoid a double
// finding. Policies without an agreement are judged against the BM.
// Information finding ("illuminate, not recommend").

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { MARKET_FEE_THRESHOLDS } from '../config/thresholds'
import { isBlockedByStopIssue } from './stopIssueEngine'

export const feeBenchmarkEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  for (const policy of policies) {
    if (policy.status !== 'active') continue
    if (isBlockedByStopIssue(policy)) continue
    // Employer agreement wins where it exists — costEngine judges those.
    if (supplementary.feeAgreements.some((a) => a.policyNumber === policy.policyNumber)) continue

    const bm = MARKET_FEE_THRESHOLDS[policy.productType]
    if (!bm) continue

    const gaps: string[] = []
    if (bm.fromAccumulation !== null && policy.fees.fromAccumulation !== null && policy.fees.fromAccumulation > bm.fromAccumulation) {
      gaps.push(`מצבירה ${policy.fees.fromAccumulation.toFixed(2)}% מעל סף הבדיקה (${bm.fromAccumulation.toFixed(2)}%)`)
    }
    if (bm.fromDeposit !== null && policy.fees.fromDeposit !== null && policy.fees.fromDeposit > bm.fromDeposit) {
      gaps.push(`מהפקדה ${policy.fees.fromDeposit.toFixed(2)}% מעל סף הבדיקה (${bm.fromDeposit.toFixed(2)}%)`)
    }
    if (gaps.length === 0) continue

    findings.push(
      makeFinding({
        category: 'cost',
        level: 'policy',
        severity: 'attention',
        title: 'דמי ניהול גבוהים מסף הבדיקה',
        description: `קופה ${policy.policyNumber} — דמי ניהול ${gaps.join(', ')}; נקודה לבדיקה מול בעל רישיון.`,
        basedOn: 'דמי ניהול מדווחים במסלקה מול סף בדיקה (BM) פר-מוצר',
        productType: policy.productType,
        policyNumber: policy.policyNumber,
      }),
    )
  }

  return findings
}

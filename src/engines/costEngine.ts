// Cost Engine:
// 1. Compare actual fees vs agreement fees (only when an agreement exists).
// 2. Compare actual fees vs market thresholds per product type.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { marketFeeThresholds } from '../utils/feeBenchmarks'

export const costEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  // Market threshold check — runs for every policy with fee data
  for (const policy of policies) {
    if (isBlockedByStopIssue(policy) || policy.status === 'inactive') continue
    const threshold = marketFeeThresholds[policy.productType]
    if (!threshold) continue

    const high: string[] = []
    if (
      threshold.fromAccumulation !== null &&
      policy.fees.fromAccumulation !== null &&
      policy.fees.fromAccumulation > threshold.fromAccumulation
    ) {
      high.push(
        `דמי ניהול מצבירה ${policy.fees.fromAccumulation.toFixed(2)}% (מקובל בשוק: עד ${threshold.fromAccumulation.toFixed(2)}%)`,
      )
    }
    if (
      threshold.fromDeposit !== null &&
      policy.fees.fromDeposit !== null &&
      policy.fees.fromDeposit > threshold.fromDeposit
    ) {
      high.push(
        `דמי ניהול מהפקדה ${policy.fees.fromDeposit.toFixed(2)}% (מקובל בשוק: עד ${threshold.fromDeposit.toFixed(2)}%)`,
      )
    }

    if (high.length > 0) {
      findings.push(
        makeFinding({
          category: 'cost',
          level: 'policy',
          severity: 'attention',
          title: 'דמי ניהול גבוהים מהמקובל בשוק',
          description: `בפוליסה ${policy.policyNumber}: ${high.join('; ')}. כדאי לבדוק אפשרות להוזלה.`,
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  // Treasury data check — client's actual fee vs the fund's average fee
  for (const policy of policies) {
    if (isBlockedByStopIssue(policy) || policy.status === 'inactive') continue
    const fund = policy.mofid
      ? supplementary.treasuryFunds.find((f) => f.mofid === policy.mofid)
      : undefined
    if (!fund) continue

    if (
      fund.avgFeeFromAccumulation !== null &&
      policy.fees.fromAccumulation !== null &&
      policy.fees.fromAccumulation > fund.avgFeeFromAccumulation + 0.1
    ) {
      findings.push(
        makeFinding({
          category: 'cost',
          level: 'policy',
          severity: 'attention',
          title: 'דמי ניהול גבוהים מהממוצע בקופה',
          description:
            `בפוליסה ${policy.policyNumber} דמי הניהול מצבירה הם ${policy.fees.fromAccumulation.toFixed(2)}%, ` +
            `לעומת ממוצע של ${fund.avgFeeFromAccumulation.toFixed(2)}% למצטרפי הקופה (לפי נתוני האוצר). ` +
            'כדאי לבדוק אפשרות להוזלה.',
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  // Agreement check — only where an agreement was entered
  for (const policy of policies) {
    if (isBlockedByStopIssue(policy)) continue
    const agreement = supplementary.feeAgreements.find(
      (a) => a.policyNumber === policy.policyNumber,
    )
    if (!agreement) continue

    const gaps: string[] = []
    if (
      agreement.agreedFeeFromDeposit !== null &&
      policy.fees.fromDeposit !== null &&
      policy.fees.fromDeposit > agreement.agreedFeeFromDeposit
    ) {
      gaps.push(
        `דמי ניהול מהפקדה בפועל ${policy.fees.fromDeposit.toFixed(2)}% לעומת ${agreement.agreedFeeFromDeposit.toFixed(2)}% בהסכם`,
      )
    }
    if (
      agreement.agreedFeeFromAccumulation !== null &&
      policy.fees.fromAccumulation !== null &&
      policy.fees.fromAccumulation > agreement.agreedFeeFromAccumulation
    ) {
      gaps.push(
        `דמי ניהול מצבירה בפועל ${policy.fees.fromAccumulation.toFixed(2)}% לעומת ${agreement.agreedFeeFromAccumulation.toFixed(2)}% בהסכם`,
      )
    }

    if (gaps.length > 0) {
      findings.push(
        makeFinding({
          category: 'cost',
          level: 'policy',
          severity: 'gap',
          title: 'נמצא פער בדמי הניהול מול ההסכם',
          description: `בפוליסה ${policy.policyNumber}: ${gaps.join('; ')}. כדאי לבדוק את הנושא מול הגורם המנהל.`,
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  return findings
}

// Cost Engine: compare actual fees vs agreement fees.
// Generates a finding only when a fee agreement exists for the policy.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

export const costEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

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

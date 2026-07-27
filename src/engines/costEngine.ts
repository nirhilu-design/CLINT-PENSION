// Cost Engine:
// Fees are judged against the employer fee agreement (קובץ דמי ניהול מעסיק) only —
// not against a market average. A finding is raised where the actual fee exceeds
// the agreed fee. Policies without an agreement are not judged on cost here.

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
          title: 'נמצא פער בדמי הניהול מול הסכם המעסיק',
          description: `בפוליסה ${policy.policyNumber}: ${gaps.join('; ')}. נקודה לבדיקה מול בעל רישיון.`,
          basedOn: 'דמי ניהול מדווחים במסלקה מול קובץ דמי ניהול המעסיק',
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  return findings
}

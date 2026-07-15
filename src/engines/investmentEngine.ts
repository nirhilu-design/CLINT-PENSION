// Investment Engine: compare returns vs benchmark (user-entered from
// גמל-נט / ביטוח-נט / פנסיה-נט, keyed by מספר אוצר). Information and findings only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

export const investmentEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  for (const policy of policies) {
    if (isBlockedByStopIssue(policy)) continue
    if (policy.netReturn === null) continue

    const benchmark = policy.mofid
      ? supplementary.benchmarks.find((b) => b.mofid === policy.mofid)
      : undefined

    if (benchmark && benchmark.annualReturn !== null) {
      const diff = policy.netReturn - benchmark.annualReturn
      if (diff < -0.5) {
        findings.push(
          makeFinding({
            category: 'investment',
            level: 'policy',
            severity: 'attention',
            title: 'תשואה נמוכה מנתוני ההשוואה',
            description:
              `בפוליסה ${policy.policyNumber} התשואה נטו המדווחת היא ${policy.netReturn.toFixed(2)}% ` +
              `לעומת ${benchmark.annualReturn.toFixed(2)}% בנתוני ההשוואה שהוזנו. ` +
              'כדאי לבדוק את התאמת מסלול ההשקעה.',
            productType: policy.productType,
            policyNumber: policy.policyNumber,
          }),
        )
      } else {
        findings.push(
          makeFinding({
            category: 'investment',
            level: 'policy',
            severity: 'info',
            title: 'תשואה בהתאם לנתוני ההשוואה',
            description:
              `בפוליסה ${policy.policyNumber} התשואה נטו ${policy.netReturn.toFixed(2)}% ` +
              `אינה נמוכה מהותית מנתוני ההשוואה (${benchmark.annualReturn.toFixed(2)}%).`,
            productType: policy.productType,
            policyNumber: policy.policyNumber,
          }),
        )
      }
    } else {
      findings.push(
        makeFinding({
          category: 'information',
          level: 'policy',
          severity: 'info',
          title: 'תשואה מדווחת (ללא נתוני השוואה)',
          description:
            `בפוליסה ${policy.policyNumber} התשואה נטו המדווחת היא ${policy.netReturn.toFixed(2)}%. ` +
            'לא הוזנו נתוני השוואה (גמל-נט / פנסיה-נט / ביטוח-נט) עבור מספר האוצר של הקופה, ולכן לא בוצעה השוואה.',
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  return findings
}

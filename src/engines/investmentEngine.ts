// Investment Engine: reports the net return from the clearinghouse XML only.
// Comparison against treasury benchmarks (גמל-נט / פנסיה-נט) is intentionally
// disabled for now — matching policies to treasury funds by מספר אוצר (מ"ה) is
// not reliable yet, so a dedicated matching engine will be built later. Until
// then we surface only what the XML itself reports. Information only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatPercent } from '../utils/format'

export const investmentEngine: Engine = ({ policies }) => {
  const findings = []

  for (const policy of policies) {
    if (policy.netReturn === null) continue
    findings.push(
      makeFinding({
        category: 'information',
        level: 'policy',
        severity: 'info',
        title: 'תשואה נטו מדווחת',
        description:
          `בפוליסה ${policy.policyNumber} התשואה נטו המדווחת בקבצי המסלקה היא ${formatPercent(policy.netReturn)} ` +
          '(לאחר ניכוי דמי ניהול). לא בוצעה השוואה מול נתוני אוצר בשלב זה.',
        basedOn: 'שדה התשואה נטו (SHEUR-TSUA-NETO) בקובץ המסלקה',
        productType: policy.productType,
        policyNumber: policy.policyNumber,
      }),
    )
  }

  return findings
}

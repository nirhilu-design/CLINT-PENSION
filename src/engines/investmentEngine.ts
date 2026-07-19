// Investment Engine: compare returns and Sharpe vs benchmark data.
// Benchmark source order: uploaded treasury files (by מ"ה) win over
// manually entered figures. Information and findings only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatPercent } from '../utils/format'
import { RETURN_BELOW_BENCHMARK_TOLERANCE } from '../config/thresholds'

export const investmentEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  for (const policy of policies) {
    if (isBlockedByStopIssue(policy)) continue
    if (policy.netReturn === null) continue

    const treasury = policy.mofid
      ? supplementary.treasuryFunds.find((f) => f.mofid === policy.mofid)
      : undefined
    const manual = policy.mofid
      ? supplementary.benchmarks.find((b) => b.mofid === policy.mofid)
      : undefined

    const benchmarkReturn = treasury?.return12m ?? manual?.annualReturn ?? null
    const benchmarkSharpe = treasury?.sharpe ?? manual?.sharpe ?? null
    const sourceLabel = treasury ? 'נתוני האוצר שהועלו' : 'נתוני ההשוואה שהוזנו'

    if (benchmarkReturn !== null) {
      const diff = policy.netReturn - benchmarkReturn
      if (diff < -RETURN_BELOW_BENCHMARK_TOLERANCE) {
        findings.push(
          makeFinding({
            category: 'investment',
            level: 'policy',
            severity: 'attention',
            title: 'תשואה נמוכה מנתוני ההשוואה',
            description:
              `בפוליסה ${policy.policyNumber} התשואה נטו המדווחת היא ${formatPercent(policy.netReturn)} ` +
              `לעומת ${formatPercent(benchmarkReturn)} ב${sourceLabel} (12 חודשים, ברוטו). ` +
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
              `בפוליסה ${policy.policyNumber} התשואה נטו ${formatPercent(policy.netReturn)} ` +
              `אינה נמוכה מהותית מ${sourceLabel} (${formatPercent(benchmarkReturn)}).`,
            productType: policy.productType,
            policyNumber: policy.policyNumber,
          }),
        )
      }

      if (benchmarkSharpe !== null) {
        findings.push(
          makeFinding({
            category: 'investment',
            level: 'policy',
            severity: 'info',
            title: 'מדד שארפ של הקופה',
            description:
              `מדד שארפ (תשואה ביחס לסיכון) של הקופה בפוליסה ${policy.policyNumber}: ${benchmarkSharpe.toFixed(2)}` +
              (treasury?.stdDev36m != null ? ` · סטיית תקן 36 חודשים: ${treasury.stdDev36m.toFixed(2)}` : '') +
              '.',
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
            `בפוליסה ${policy.policyNumber} התשואה נטו המדווחת היא ${formatPercent(policy.netReturn)}. ` +
            'לא נמצאו נתוני אוצר עבור מספר האוצר של הקופה ולא הוזנו נתוני השוואה, ולכן לא בוצעה השוואה.',
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  return findings
}

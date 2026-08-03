// Investment Engine: compare returns and Sharpe vs benchmark data.
// Benchmark source order: uploaded treasury files (by מ"ה) win over
// manually entered figures. Information and findings only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatPercent } from '../utils/format'
import { benchmarkKey } from '../utils/benchmark'
import { RETURN_BELOW_BENCHMARK_TOLERANCE } from '../config/thresholds'

export const investmentEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  for (const policy of policies) {
    if (isBlockedByStopIssue(policy)) continue
    if (policy.netReturn === null) continue

    // Match by the track-level key (מספר מסלול) so a comprehensive pension's
    // reported return is compared to its actual track in פנסיה-נט, not the fund at large.
    const key = benchmarkKey(policy)
    const treasury = key ? supplementary.treasuryFunds.find((f) => f.mofid === key) : undefined
    const manual = key ? supplementary.benchmarks.find((b) => b.mofid === key) : undefined

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
              'נקודה לבדיקה מול בעל רישיון.',
            basedOn: treasury
              ? `תשואת המסלקה מול קובץ נתוני האוצר (מ"ה ${key}, לתקופה ${treasury.periodTo ?? '—'})`
              : 'תשואת המסלקה מול נתוני השוואה שהוזנו ידנית באזור היועץ',
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
          missingInfo: `קובץ נתוני אוצר הכולל את מ"ה ${key ?? '(לא זוהה)'} או הזנת נתוני השוואה באזור היועץ`,
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  return findings
}

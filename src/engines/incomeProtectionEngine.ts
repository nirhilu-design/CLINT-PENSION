// Income Protection Engine: disability coverage percent, target 73%.
// Policy-level and client-level findings.

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

const TARGET_PERCENT = 73

export const incomeProtectionEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const disabilityCoverages = policies
    .filter((p) => !isBlockedByStopIssue(p) && p.status === 'active')
    .flatMap((p) => p.coverages.filter((c) => c.type === 'disability').map((c) => ({ policy: p, coverage: c })))

  if (disabilityCoverages.length === 0) {
    findings.push(
      makeFinding({
        category: 'insurance',
        level: 'client',
        severity: 'attention',
        title: 'לא נמצא כיסוי אובדן כושר עבודה',
        description:
          'במוצרים שנותחו לא אותר כיסוי לאובדן כושר עבודה. מומלץ לבחון האם קיים כיסוי כזה במוצרים נוספים.',
      }),
    )
    return findings
  }

  // Policy level: coverage percent vs target
  for (const { policy, coverage } of disabilityCoverages) {
    if (coverage.percent === null) continue
    if (coverage.percent < TARGET_PERCENT - 3) {
      findings.push(
        makeFinding({
          category: 'insurance',
          level: 'policy',
          severity: 'attention',
          title: 'שיעור כיסוי אכ"ע נמוך מהיעד',
          description:
            `בפוליסה ${policy.policyNumber} שיעור הכיסוי לאובדן כושר עבודה הוא ${coverage.percent.toFixed(0)}% ` +
            `לעומת יעד מקובל של ${TARGET_PERCENT}%. מומלץ לבחון השלמת כיסוי.`,
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  // Client level: covered salary for disability vs the actual salary
  // (client-stated salary wins over the XML-reported insured salary)
  const salary = effectiveSalary(policies, supplementary)
  if (salary && salary > 0) {
    const fromClient = supplementary.currentGrossSalary !== null
    const maxCoveredSalary = Math.max(
      ...disabilityCoverages.map(({ coverage }) => coverage.coveredSalary ?? 0),
    )
    if (maxCoveredSalary > 0 && maxCoveredSalary < salary * 0.9) {
      findings.push(
        makeFinding({
          category: 'insurance',
          level: 'client',
          severity: 'gap',
          title: 'נמצא פער בין השכר המבוטח לאכ"ע לשכר בפועל',
          description:
            `השכר המבוטח לאובדן כושר עבודה (₪${maxCoveredSalary.toLocaleString()}) נמוך מ${fromClient ? 'השכר שציינת' : 'השכר המדווח בקבצים'} ` +
            `(₪${salary.toLocaleString()}). כדאי לבדוק התאמת הכיסוי לשכר הנוכחי.`,
        }),
      )
    }
  }

  return findings
}

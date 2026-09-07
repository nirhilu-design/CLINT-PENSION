// Income Protection Engine: disability coverage percent, target 73%.
// Policy-level and client-level findings.

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'

import { IP_TARGET_COVERAGE_PERCENT as TARGET_PERCENT, IP_COVERAGE_PERCENT_SLACK } from '../config/thresholds'

// The actual monthly disability benefit: the reported amount, or — when it is
// missing — reconstructed from the insured salary and the coverage percent.
function benefitOf(c: { amount: number | null; coveredSalary: number | null; percent: number | null }): number | null {
  if (c.amount !== null) return c.amount
  if (c.coveredSalary !== null && c.percent !== null) return (c.coveredSalary * c.percent) / 100
  return null
}

export const incomeProtectionEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  const disabilityCoverages = policies
    .filter((p) => !isBlockedByStopIssue(p) && p.status === 'active')
    .flatMap((p) => p.coverages.filter((c) => c.type === 'disability').map((c) => ({ policy: p, coverage: c })))

  // Family relying on this income raises the stakes of every IP gap
  const familyRelies = supplementary.familyReliesOnIncome === true

  if (disabilityCoverages.length === 0) {
    findings.push(
      makeFinding({
        category: 'insurance',
        level: 'client',
        severity: familyRelies ? 'gap' : 'attention',
        title: familyRelies
          ? 'נמצא פער: המשפחה מסתמכת על ההכנסה ואין כיסוי אובדן כושר עבודה'
          : 'לא נמצא כיסוי אובדן כושר עבודה',
        description:
          'במוצרים שנותחו לא אותר כיסוי לאובדן כושר עבודה' +
          (familyRelies ? ', בעוד צוין שהמשפחה מסתמכת על ההכנסה שלך' : '') +
          '. נקודה לבדיקה מול בעל רישיון האם קיים כיסוי כזה במוצרים נוספים.',
      }),
    )
    return findings
  }

  // Policy level: coverage percent vs target.
  // Pension disability is handled cross-product by pensionInsightEngine (a low
  // pension נכות is often complemented by an אכ"ע rider elsewhere), so it is not
  // flagged here in isolation.
  for (const { policy, coverage } of disabilityCoverages) {
    if (policy.productType === 'pension') continue
    if (coverage.percent === null) continue
    if (coverage.percent < TARGET_PERCENT - IP_COVERAGE_PERCENT_SLACK) {
      findings.push(
        makeFinding({
          category: 'insurance',
          level: 'policy',
          severity: familyRelies ? 'gap' : 'attention',
          title: 'שיעור כיסוי אכ"ע נמוך מהיעד',
          description:
            `בפוליסה ${policy.policyNumber} שיעור הכיסוי לאובדן כושר עבודה הוא ${coverage.percent.toFixed(0)}% ` +
            `לעומת יעד מקובל של ${TARGET_PERCENT}%. נקודה לבדיקה מול בעל רישיון.`,
          productType: policy.productType,
          policyNumber: policy.policyNumber,
        }),
      )
    }
  }

  // Client level: the TOTAL monthly disability benefit across ALL products
  // (pension included) against the actual salary. A saver can be correctly
  // covered inside one product — e.g. 75% of a pension's insured base — yet be
  // under-covered in aggregate, because the summed benefits fall short of the
  // real salary. This is the headline "actual benefit vs reported salary".
  const salary = effectiveSalary(policies, supplementary)
  const benefits = disabilityCoverages
    .map(({ coverage }) => benefitOf(coverage))
    .filter((b): b is number => b !== null && b > 0)
  if (salary && salary > 0 && benefits.length > 0) {
    const fromClient = supplementary.currentGrossSalary !== null
    const totalBenefit = benefits.reduce((sum, b) => sum + b, 0)
    const ratio = Math.round((totalBenefit / salary) * 100)
    const under = ratio < TARGET_PERCENT - IP_COVERAGE_PERCENT_SLACK
    findings.push(
      makeFinding({
        category: 'insurance',
        level: 'client',
        severity: under ? (familyRelies ? 'gap' : 'attention') : 'info',
        title: under ? 'תת-כיסוי אכ"ע כולל מול השכר' : 'כיסוי אכ"ע כולל מול השכר',
        description:
          `סך הפיצוי החודשי לאובדן כושר עבודה בתיק (₪${totalBenefit.toLocaleString()}) מהווה כ-${ratio}% מ${fromClient ? 'השכר שציינת' : 'השכר המדווח בקבצים'} (₪${salary.toLocaleString()})` +
          (under ? `, מתחת ליעד המקובל של ${TARGET_PERCENT}%` : '') +
          '. נקודה לבדיקה מול בעל רישיון.',
        basedOn: 'סך קצבאות אכ"ע בתיק (כל המוצרים) מול השכר בפועל',
      }),
    )
  }

  return findings
}

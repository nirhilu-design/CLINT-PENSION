// Executive Summary Engine: top 3-5 findings, up to 3 strengths, up to 3 limitations.
// Priority: Stop Issue > Retirement > Cost > Insurance > Investment.

import type { ExecutiveSummary, Finding, Policy } from '../models/types'
import { formatCurrency } from '../utils/format'

const severityWeight = { gap: 0, attention: 1, info: 2 } as const

function priorityOf(f: Finding): number {
  // Stop-issue limitations are policy-level 'limitation' from the stop-issue engine;
  // treat all limitations right after as they block analysis.
  switch (f.category) {
    case 'limitation':
      return 0
    case 'retirement':
      return 1
    case 'cost':
      return 2
    case 'insurance':
      return 3
    case 'investment':
      return 4
    default:
      return 5
  }
}

export function buildExecutiveSummary(findings: Finding[], policies: Policy[]): ExecutiveSummary {
  const actionable = findings
    .filter((f) => f.severity !== 'info')
    .sort((a, b) => priorityOf(a) - priorityOf(b) || severityWeight[a.severity] - severityWeight[b.severity])

  const topFindings = actionable.slice(0, 5)

  const strengths: string[] = []
  const activeCount = policies.filter((p) => p.status === 'active').length
  if (activeCount > 0) strengths.push(`${activeCount} מוצרים פעילים עם הפקדות שוטפות`)

  const totalAssets = policies.reduce((sum, p) => sum + (p.currentValue ?? 0), 0)
  if (totalAssets > 0) strengths.push(`סך נכסים צבורים של ${formatCurrency(totalAssets)}`)

  const hasDisability = policies.some((p) => p.coverages.some((c) => c.type === 'disability'))
  if (hasDisability) strengths.push('קיים כיסוי לאובדן כושר עבודה במסגרת המוצרים')

  const limitations = findings
    .filter((f) => f.category === 'limitation')
    .slice(0, 3)
    .map((f) => f.description)

  return {
    topFindings,
    strengths: strengths.slice(0, 3),
    limitations,
  }
}

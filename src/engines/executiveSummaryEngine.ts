// Executive Summary Engine: top 3-5 findings, up to 3 strengths, up to 3 limitations.
// Display priority comes from the shared findingPriority module.

import type { ExecutiveSummary, Finding, Policy } from '../models/types'
import { formatCurrency } from '../utils/format'
import { sortFindings } from './findingPriority'

export function buildExecutiveSummary(findings: Finding[], policies: Policy[]): ExecutiveSummary {
  const topFindings = sortFindings(findings.filter((f) => f.severity !== 'info')).slice(0, 5)

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

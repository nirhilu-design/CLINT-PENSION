// Business display priority for findings (approved order):
// analysis-blocking first, then fees → insurance coverages → investment
// track → deposits/continuity → retirement → data quality → information.
// Shared by the dashboard and the executive summary.

import type { Finding } from '../models/types'

const severityWeight: Record<Finding['severity'], number> = { gap: 0, attention: 1, info: 2 }

export function findingPriority(f: Finding): number {
  // Stop-issue blocks change the meaning of everything else — always first
  if (f.category === 'limitation' && f.severity !== 'info') return 0
  switch (f.category) {
    case 'cost':
      return 1
    case 'insurance':
    case 'death':
      return 2
    case 'investment':
      return 3
    // deposits/continuity findings (phase B) will slot here as 4
    case 'retirement':
      return 5
    case 'dataQuality':
    case 'limitation':
      return 6
    default: // information, insight
      return 7
  }
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      findingPriority(a) - findingPriority(b) ||
      severityWeight[a.severity] - severityWeight[b.severity],
  )
}

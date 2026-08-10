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
    case 'deposits':
      return 4
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

// Presentation tier — how prominently a finding should be shown to the client,
// so we don't overload them with background facts. Derived from the existing
// severity/category, no per-engine changes needed.
//   important — gaps and points-to-check; always shown.
//   insight   — neutral observations (הארות) that may matter; shown, lighter.
//   note      — pure background/context (מידע, איכות נתונים, מגבלות); collapsed
//               for the advisor, hidden from the client.
export type FindingTier = 'important' | 'insight' | 'note'

export function findingTier(f: Finding): FindingTier {
  if (f.severity === 'gap' || f.severity === 'attention') return 'important'
  if (f.category === 'insight') return 'insight'
  return 'note'
}

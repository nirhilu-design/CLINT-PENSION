// Per-policy net-return resolution for the performance chart. Only savings-bearing
// products carry a return; a reported figure is sanity-checked and, when missing or
// implausible, recomputed as a value-weighted average of the investment tracks.
//
// Rule (from the advisor): a net return of exactly 0% is not real for these products
// — the one exception is a ביטוח מנהלים policy predating 1992 (old guaranteed-yield
// policies). A 0% anywhere else signals missing data, so it is not charted as a real
// value. An implausibly large figure (|v| ≥ 100%, e.g. a -100 sentinel) is discarded.

import type { Policy, ProductType } from '../models/types'

const RETURN_TYPES: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education']
const IMPLAUSIBLE = 100 // a YTD net return at/above this magnitude is not a real figure

function weightedTrackReturn(p: Policy): number | null {
  let weighted = 0
  let base = 0
  for (const t of p.investmentTracks) {
    if (t.returnNet !== null && t.value && Math.abs(t.returnNet) < IMPLAUSIBLE) {
      weighted += t.value * t.returnNet
      base += t.value
    }
  }
  return base > 0 ? weighted / base : null
}

function isPre1992Managers(p: Policy): boolean {
  return p.productType === 'managers' && !!p.openDate && p.openDate < '1992-01-01'
}

export interface PolicyReturn {
  /** Display return in %, or null when no reliable figure exists. */
  value: number | null
  /** True when a 0% was reported where 0% is implausible (missing data). */
  suspiciousZero: boolean
}

export function policyDisplayReturn(p: Policy): PolicyReturn {
  if (!RETURN_TYPES.includes(p.productType)) return { value: null, suspiciousZero: false }
  const raw = p.netReturn
  let value = raw !== null && Math.abs(raw) < IMPLAUSIBLE ? raw : null
  if (value === null) value = weightedTrackReturn(p) // fall back to the tracks
  if (value === 0 && !isPre1992Managers(p)) return { value: null, suspiciousZero: true }
  return { value, suspiciousZero: false }
}

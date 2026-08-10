import type { Policy } from '../models/types'

// Every treasury fund code a policy could match on. Falls back to the primary
// mofid for policies parsed before mofidCandidates existed.
export function policyFundCodes(p: Pick<Policy, 'mofid' | 'mofidCandidates'>): string[] {
  const set = new Set<string>()
  for (const c of p.mofidCandidates ?? []) if (c) set.add(c)
  if (p.mofid) set.add(p.mofid)
  return [...set]
}

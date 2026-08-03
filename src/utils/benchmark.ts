import type { Policy } from '../models/types'

/**
 * The key that joins a policy to official פנסיה-נט / גמל-נט data.
 *
 * Treasury returns (and asset allocations) are published per investment track,
 * so the track code (מספר מסלול) is the correct join key. It falls back to the
 * fund מספר אוצר when no track code was parsed — and for single-track products
 * the two coincide anyway, so existing גמל/השתלמות matching is unaffected.
 */
export function benchmarkKey(policy: Pick<Policy, 'trackCode' | 'mofid'>): string | null {
  return policy.trackCode ?? policy.mofid
}

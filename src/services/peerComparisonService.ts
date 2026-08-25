// Ranks a client's fund against its peer group using the official treasury numbers.
// The peer group is defined by the advisor's uploaded comparison table (by מ"ה); the
// return/fee/Sharpe figures for every fund — the client's and the peers' — come from
// the treasury files, so the comparison is treasury-vs-treasury (like for like).

import type { Policy, PeerComparisonGroup, TreasuryFundData } from '../models/types'

export type PeerMetric = 'return12m' | 'return3yAnnualized' | 'return5yAnnualized' | 'sharpe'

export interface PeerRow {
  mofid: string
  name: string | null
  isClient: boolean
  fund: TreasuryFundData | null // treasury data, when available for this mofid
}

export interface PeerComparison {
  policyNumber: string
  clientMofid: string
  group: PeerComparisonGroup | null
  rows: PeerRow[] // client + peers, sorted by the metric (desc); missing data last
  clientRank: number | null // 1-based, among rows that have the metric
  ranked: number // how many rows have a metric value
  metric: PeerMetric
}

export function findPeerGroupFor(
  mofid: string,
  groups: PeerComparisonGroup[],
): PeerComparisonGroup | null {
  return groups.find((g) => g.members.some((m) => m.mofid === mofid)) ?? null
}

export function comparePeers(
  policies: Policy[],
  treasuryFunds: TreasuryFundData[],
  peerGroups: PeerComparisonGroup[],
  metric: PeerMetric = 'return12m',
  manualAssignments: Record<string, string> = {},
): PeerComparison[] {
  const fundByMofid = new Map(treasuryFunds.map((f) => [f.mofid, f]))
  const out: PeerComparison[] = []

  for (const p of policies) {
    if (!p.mofid) continue
    const manualId = manualAssignments[p.policyNumber]
    const group = manualId
      ? peerGroups.find((g) => g.id === manualId) ?? null
      : findPeerGroupFor(p.mofid, peerGroups)

    const mofids = new Set<string>([p.mofid])
    group?.members.forEach((m) => mofids.add(m.mofid))

    const rows: PeerRow[] = [...mofids].map((mofid) => {
      const fund = fundByMofid.get(mofid) ?? null
      const memberName = group?.members.find((m) => m.mofid === mofid)?.name ?? null
      const isClient = mofid === p.mofid
      return {
        mofid,
        name: isClient ? p.productName ?? fund?.name ?? memberName : memberName ?? fund?.name ?? null,
        isClient,
        fund,
      }
    })

    const val = (r: PeerRow): number | null => (r.fund ? r.fund[metric] : null)
    rows.sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return bv - av
    })

    const withMetric = rows.filter((r) => val(r) !== null)
    const idx = withMetric.findIndex((r) => r.isClient)
    out.push({
      policyNumber: p.policyNumber,
      clientMofid: p.mofid,
      group,
      rows,
      clientRank: idx >= 0 ? idx + 1 : null,
      ranked: withMetric.length,
      metric,
    })
  }

  return out
}

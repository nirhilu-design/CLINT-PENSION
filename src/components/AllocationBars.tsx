import type { AssetAllocationGroup, Policy, TreasuryAllocation } from '../models/types'

// Value-weighted asset allocation across a set of policies, using the
// treasury allocation data matched by מ"ה. Funds without allocation data
// (or without value) are excluded, and the covered share is reported so
// the user knows how much of the money the breakdown actually represents.
export function weightedAllocation(
  policies: Policy[],
  allocations: TreasuryAllocation[],
): { groups: AssetAllocationGroup[]; coveredValue: number; totalValue: number } {
  const byMofid = new Map(allocations.map((a) => [a.mofid, a]))
  const totals = new Map<string, number>()
  let coveredValue = 0
  const totalValue = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  for (const p of policies) {
    const alloc = p.mofid ? byMofid.get(p.mofid) : undefined
    const value = p.currentValue ?? 0
    if (!alloc || value <= 0) continue
    coveredValue += value
    for (const g of alloc.groups) {
      totals.set(g.name, (totals.get(g.name) ?? 0) + (g.percent / 100) * value)
    }
  }

  const groups: AssetAllocationGroup[] =
    coveredValue > 0
      ? [...totals.entries()]
          .map(([name, amount]) => ({ name, percent: (amount / coveredValue) * 100 }))
          .sort((a, b) => b.percent - a.percent)
      : []

  return { groups, coveredValue, totalValue }
}

const COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e87ba4', '#eb6834', '#008300', '#64748b', '#94a3b8']

export default function AllocationBars({
  groups,
  coveredValue,
  totalValue,
}: {
  groups: AssetAllocationGroup[]
  coveredValue: number
  totalValue: number
}) {
  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        אין נתוני אפיקי השקעה. הם נטענים מקבצי נתוני האוצר (גמל-נט / פנסיה-נט) באזור היועץ.
      </p>
    )
  }
  const coverage = totalValue > 0 ? Math.round((coveredValue / totalValue) * 100) : 0

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5">
      {/* Single stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {groups.map((g, i) => (
          <div
            key={g.name}
            className="h-full"
            style={{ width: `${g.percent}%`, backgroundColor: COLORS[i % COLORS.length] }}
            title={`${g.name} ${g.percent.toFixed(1)}%`}
          />
        ))}
      </div>
      <ul className="space-y-1.5">
        {groups.map((g, i) => (
          <li key={g.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-slate-600 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="truncate">{g.name}</span>
            </span>
            <span className="text-slate-700 font-medium tabular shrink-0">{g.percent.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
      {coverage < 100 && (
        <p className="text-xs text-slate-400 mt-3">
          הפירוק מבוסס על {coverage}% מהנכסים — עבור היתר לא נטענו נתוני אפיקים.
        </p>
      )}
    </div>
  )
}

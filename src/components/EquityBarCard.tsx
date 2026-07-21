import type { Policy, TreasuryAllocation } from '../models/types'

// Group-name matchers over the treasury 9-group asset breakdown.
const isEquity = (name: string) => /מני/.test(name)
const isForeign = (name: string) => /חו["׳״'״׳]?ל|בחו|חו"ל/.test(name)

interface EquityStats {
  weightedEquity: number | null
  foreignEquity: number | null
  coveredValue: number
  totalValue: number
  foreignAvailable: boolean
}

/** Value-weighted equity exposure across funds that have treasury allocation data. */
function computeStats(policies: Policy[], allocations: TreasuryAllocation[]): EquityStats {
  const byMofid = new Map(allocations.map((a) => [a.mofid, a]))
  let weight = 0
  let equitySum = 0
  let foreignSum = 0
  let foreignAvailable = false
  const totalValue = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  for (const p of policies) {
    if (!p.mofid || !p.currentValue || p.currentValue <= 0) continue
    const alloc = byMofid.get(p.mofid)
    if (!alloc) continue
    const w = p.currentValue
    weight += w
    equitySum += alloc.groups.filter((g) => isEquity(g.name)).reduce((s, g) => s + g.percent, 0) * w
    const foreign = alloc.groups.filter((g) => isForeign(g.name))
    if (foreign.length > 0) {
      foreignAvailable = true
      foreignSum += foreign.reduce((s, g) => s + g.percent, 0) * w
    }
  }

  return {
    weightedEquity: weight > 0 ? equitySum / weight : null,
    foreignEquity: weight > 0 && foreignAvailable ? foreignSum / weight : null,
    coveredValue: weight,
    totalValue,
    foreignAvailable,
  }
}

function Bar({ label, value, color }: { label: string; value: number | null; color: string }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value))
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-800 tabular">
          {value === null ? '—' : `${value.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

export default function EquityBarCard({
  policies,
  allocations,
}: {
  policies: Policy[]
  allocations: TreasuryAllocation[]
}) {
  const stats = computeStats(policies, allocations)
  const hasData = stats.coveredValue > 0
  const coverage =
    stats.totalValue > 0 ? Math.round((stats.coveredValue / stats.totalValue) * 100) : 0

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/70">
      <h3 className="font-semibold text-slate-700">חשיפה למניות</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-4">אחוזים משוקללים לפי שווי הצבירה בתיק</p>
      {!hasData ? (
        <p className="text-sm text-slate-400 py-8 text-center leading-relaxed">
          אין נתוני אפיקי השקעה לחישוב.
          <br />
          יש להעלות את קובצי נתוני האוצר באזור היועץ.
        </p>
      ) : (
        <div className="space-y-4">
          <Bar label="אחוז מניות משוקלל בתיק" value={stats.weightedEquity} color="#2a78d6" />
          <Bar label='אחוז מניות חו"ל' value={stats.foreignEquity} color="#008300" />
          <p className="text-[11px] text-slate-400 pt-1">
            {coverage < 100 && `החישוב מבוסס על ${coverage}% משווי התיק שיש לו נתוני אפיקים. `}
            {!stats.foreignAvailable && 'פילוח מניות חו"ל אינו זמין בקבצים שנטענו.'}
          </p>
        </div>
      )}
    </div>
  )
}

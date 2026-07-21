import type { Policy } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatCurrency } from '../utils/format'

// "yyyy-mm" → "mm/yyyy"
function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${m}/${y}`
}

interface DepositRow {
  month: string
  productLabel: string
  amount: number
}

/** Last deposits per product across the three most recent reported months. */
function buildRows(policies: Policy[]): DepositRow[] {
  const allMonths = [
    ...new Set(policies.flatMap((p) => p.monthlyDeposits.map((d) => d.month))),
  ].sort()
  const recent = new Set(allMonths.slice(-3))
  if (recent.size === 0) return []

  // Aggregate by month + product type (sum across policies of the same product)
  const byKey = new Map<string, DepositRow>()
  for (const p of policies) {
    for (const d of p.monthlyDeposits) {
      if (!recent.has(d.month) || d.total <= 0) continue
      const key = `${d.month}|${p.productType}`
      const existing = byKey.get(key)
      if (existing) existing.amount += d.total
      else byKey.set(key, { month: d.month, productLabel: productTypeLabels[p.productType], amount: d.total })
    }
  }

  return [...byKey.values()].sort(
    (a, b) => b.month.localeCompare(a.month) || b.amount - a.amount,
  )
}

export default function DepositsTableCard({ policies }: { policies: Policy[] }) {
  const rows = buildRows(policies)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/70">
      <h3 className="font-semibold text-slate-700">הפקדות אחרונות לפי מוצר</h3>
      <p className="text-xs text-slate-400 mt-0.5 mb-3">שלושת חודשי ההפקדה האחרונים שדווחו</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">לא דווחו הפקדות בקבצים</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b border-slate-100">
              <th className="text-right font-medium pb-2">חודש</th>
              <th className="text-right font-medium pb-2">מוצר</th>
              <th className="text-left font-medium pb-2">סכום הפקדה</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-b-0">
                <td className="py-2 text-slate-500 tabular">{monthLabel(r.month)}</td>
                <td className="py-2 text-slate-700">{r.productLabel}</td>
                <td className="py-2 text-slate-800 font-medium tabular text-left">
                  {formatCurrency(r.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

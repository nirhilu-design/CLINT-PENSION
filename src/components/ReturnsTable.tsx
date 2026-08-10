import type { Policy } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatPercent } from '../utils/format'

// Reported returns straight from the clearinghouse XML. Comparison against
// official treasury data (גמל-נט / פנסיה-נט) is intentionally not shown yet —
// a dedicated matching engine will be built later. For now we surface only what
// the XML itself reports.
export default function ReturnsTable({
  policies,
  showProductColumn = true,
}: {
  policies: Policy[]
  showProductColumn?: boolean
}) {
  const rows = policies
    .filter((p) => p.status !== 'inactive' || (p.currentValue ?? 0) > 0)
    .filter((p) => p.netReturn !== null)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        אין נתוני תשואה להצגה. תשואות מדווחות נקראות מקבצי המסלקה (שדה התשואה נטו).
      </p>
    )
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500">
            <th className="text-right font-medium p-3">קופה</th>
            {showProductColumn && <th className="text-right font-medium p-3">מוצר</th>}
            <th className="text-right font-medium p-3">מ"ה</th>
            <th className="text-right font-medium p-3"><span className="tip" data-tip="התשואה כפי שדווחה בקובץ המסלקה — לאחר ניכוי דמי ניהול">תשואה מדווחת (נטו)</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((policy) => (
            <tr key={policy.policyNumber} className="border-t border-slate-100">
              <td className="p-3">
                <div className="font-medium text-slate-700">
                  {policy.productName ?? policy.policyNumber}
                </div>
              </td>
              {showProductColumn && (
                <td className="p-3 text-slate-500">{productTypeLabels[policy.productType]}</td>
              )}
              <td className="p-3 tabular text-slate-600">{policy.mofid ?? '—'}</td>
              <td className="p-3 tabular font-medium text-slate-800">
                {formatPercent(policy.netReturn)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
        תשואה מדווחת: נטו, מקבצי המסלקה. השוואה מול נתוני אוצר תתווסף בהמשך.
      </div>
    </div>
  )
}

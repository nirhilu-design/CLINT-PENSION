import type { Policy, TreasuryFundData } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatPercent } from '../utils/format'

// Consolidated returns view: the client's reported net return (from the
// clearinghouse XML) side by side with official treasury data matched by
// מספר אוצר (מ"ה), so the link between the two sources is visible.
export default function ReturnsTable({
  policies,
  treasuryFunds,
  showProductColumn = true,
}: {
  policies: Policy[]
  treasuryFunds: TreasuryFundData[]
  showProductColumn?: boolean
}) {
  const rows = policies
    .filter((p) => p.status !== 'inactive' || (p.currentValue ?? 0) > 0)
    .map((p) => ({
      policy: p,
      fund: p.mofid ? treasuryFunds.find((f) => f.mofid === p.mofid) : undefined,
    }))
    .filter((r) => r.policy.netReturn !== null || r.fund)

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        אין נתוני תשואה להצגה. תשואות מדווחות נקראות מקבצי המסלקה, ונתוני השוואה רשמיים
        נטענים באזור היועץ (קבצי גמל-נט / פנסיה-נט).
      </p>
    )
  }

  const anyTreasury = rows.some((r) => r.fund)

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500">
            <th className="text-right font-medium p-3">קופה</th>
            {showProductColumn && <th className="text-right font-medium p-3">מוצר</th>}
            <th className="text-right font-medium p-3">מ"ה</th>
            <th className="text-right font-medium p-3"><span className="tip" data-tip="התשואה כפי שדווחה בקובץ המסלקה — לאחר ניכוי דמי ניהול">תשואה מדווחת (נטו)</span></th>
            <th className="text-right font-medium p-3"><span className="tip" data-tip="תשואה מצטברת ל-12 חודשים מקובץ נתוני האוצר — ברוטו נומינלי, לפני דמי ניהול">12 חודשים (אוצר)</span></th>
            <th className="text-right font-medium p-3">3 שנים (ממוצע)</th>
            <th className="text-right font-medium p-3">5 שנים (ממוצע)</th>
            <th className="text-right font-medium p-3"><span className="tip" data-tip="מדד שארפ: תשואה עודפת ביחס לסיכון (ריבית חסרת סיכון) — גבוה יותר טוב יותר">שארפ</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ policy, fund }) => {
            const diff =
              policy.netReturn !== null && fund?.return12m != null
                ? policy.netReturn - fund.return12m
                : null
            return (
              <tr key={policy.policyNumber} className="border-t border-slate-100">
                <td className="p-3">
                  <div className="font-medium text-slate-700">
                    {policy.productName ?? policy.policyNumber}
                  </div>
                  {fund?.name && policy.productName !== fund.name && (
                    <div className="text-xs text-slate-400">{fund.name}</div>
                  )}
                </td>
                {showProductColumn && (
                  <td className="p-3 text-slate-500">{productTypeLabels[policy.productType]}</td>
                )}
                <td className="p-3 tabular text-slate-600">{policy.mofid ?? '—'}</td>
                <td className="p-3 tabular font-medium text-slate-800">
                  {formatPercent(policy.netReturn)}
                </td>
                {fund ? (
                  <>
                    <td className="p-3 tabular">
                      {formatPercent(fund.return12m)}
                      {diff !== null && (
                        <span
                          className={`text-xs mr-1.5 ${diff < -0.5 ? 'text-rose-500' : 'text-slate-400'}`}
                        >
                          ({diff > 0 ? '+' : ''}
                          {diff.toFixed(1)})
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular">{formatPercent(fund.return3yAnnualized)}</td>
                    <td className="p-3 tabular">{formatPercent(fund.return5yAnnualized)}</td>
                    <td className="p-3 tabular">{fund.sharpe?.toFixed(2) ?? '—'}</td>
                  </>
                ) : (
                  <td colSpan={4} className="p-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      אין נתוני אוצר למ"ה זה
                    </span>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-3 py-2 border-t border-slate-100 text-xs text-slate-400">
        תשואה מדווחת: נטו, מקבצי המסלקה · נתוני אוצר: ברוטו נומינלי, מקבצי גמל-נט/פנסיה-נט שנטענו באזור היועץ
        {!anyTreasury && ' · לא נטענו עדיין קבצי נתוני אוצר'}
      </div>
    </div>
  )
}

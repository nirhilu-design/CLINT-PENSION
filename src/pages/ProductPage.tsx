import { useApp } from '../hooks/useAppState'
import { coverageTypeLabels, productTypeLabels } from '../models/labels'
import type { Policy, ProductType } from '../models/types'
import { formatCurrency, formatPercent } from '../utils/format'
import KpiCard from '../components/KpiCard'
import FindingCard from '../components/FindingCard'
import { isBlockedByStopIssue } from '../engines/stopIssueEngine'
import { isEducationFundLiquid } from '../utils/liquidity'

/** Products whose screen shows a dedicated insurance-coverages section */
const COVERAGE_PRODUCTS: ProductType[] = ['pension', 'managers', 'life', 'incomeProtection']

interface Kpi {
  label: string
  value: string
  sub?: string
}

/** Product-specific KPI definitions per PRD Product Discovery sections */
function productKpis(productType: ProductType, policies: Policy[]): Kpi[] {
  const total = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const expectedPension = policies.reduce((s, p) => s + (p.expectedPension ?? 0), 0)
  const avgFeeAccum = (() => {
    const vals = policies.map((p) => p.fees.fromAccumulation).filter((v): v is number => v !== null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  })()

  switch (productType) {
    case 'pension':
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'קצבה צפויה', value: formatCurrency(expectedPension) },
        { label: 'דמי ניהול מצבירה (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    case 'managers': {
      const anyGuaranteed = policies.some((p) => p.hasGuaranteedFactor)
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'קצבה צפויה', value: formatCurrency(expectedPension) },
        { label: 'מקדם מובטח', value: anyGuaranteed ? 'קיים' : 'לא קיים' },
        { label: 'דמי ניהול (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    }
    case 'gemel':
      return [
        { label: 'צבירה (מיועדת לקצבה)', value: formatCurrency(total) },
        { label: 'מספר חשבונות', value: String(policies.length) },
        { label: 'דמי ניהול מצבירה (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    case 'gemelInvestment':
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'סכום נזיל', value: formatCurrency(total), sub: 'נזיל בכל עת' },
        { label: 'דמי ניהול מצבירה (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    case 'education': {
      const liquid = policies
        .filter((p) => isEducationFundLiquid(p) === true)
        .reduce((s, p) => s + (p.currentValue ?? 0), 0)
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'סכום נזיל', value: formatCurrency(liquid) },
        { label: 'סכום לא נזיל', value: formatCurrency(total - liquid) },
        { label: 'דמי ניהול מצבירה (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    }
    case 'life': {
      const deathCover = policies.flatMap((p) => p.coverages).filter((c) => c.type === 'death')
        .reduce((s, c) => s + (c.amount ?? 0), 0)
      return [
        { label: 'כיסוי למקרה מוות', value: formatCurrency(deathCover) },
        { label: 'מספר פוליסות', value: String(policies.length) },
      ]
    }
    case 'incomeProtection': {
      const covers = policies.flatMap((p) => p.coverages).filter((c) => c.type === 'disability')
      const monthly = covers.reduce((s, c) => s + (c.amount ?? 0), 0)
      const maxPercent = covers.length ? Math.max(...covers.map((c) => c.percent ?? 0)) : null
      return [
        { label: 'פיצוי חודשי', value: formatCurrency(monthly) },
        { label: 'שיעור כיסוי', value: maxPercent ? formatPercent(maxPercent, 0) : '—' },
      ]
    }
    default:
      return [{ label: 'צבירה', value: formatCurrency(total) }]
  }
}

export default function ProductPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const productType = state.selectedProduct!
  const policies = analysis.policies.filter((p) => p.productType === productType)
  const blockedPolicies = policies.filter(isBlockedByStopIssue)
  const activePolicies = policies.filter((p) => p.status !== 'inactive' && !isBlockedByStopIssue(p))
  const frozenPolicies = policies.filter((p) => p.status === 'inactive' && !isBlockedByStopIssue(p))
  const coverages = policies.flatMap((p) =>
    p.coverages.map((c) => ({ ...c, managingCompany: p.managingCompany })),
  )
  const productFindings = analysis.findings.filter(
    (f) => f.productType === productType || policies.some((p) => p.policyNumber === f.policyNumber),
  )

  const policyRow = (p: Policy) => (
    <button
      key={p.policyNumber}
      onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: p.policyNumber })}
      className="w-full rounded-xl bg-white border border-slate-200 p-4 text-right hover:border-blue-400 hover:shadow flex justify-between items-center"
    >
      <div>
        <div className="font-semibold text-slate-800">{p.productName ?? p.policyNumber}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {p.managingCompany} · פוליסה {p.policyNumber}
        </div>
      </div>
      <div className="text-lg font-bold text-slate-700">{formatCurrency(p.currentValue)}</div>
    </button>
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button
        onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        → חזרה לדשבורד
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-4">{productTypeLabels[productType]}</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {productKpis(productType, policies).map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
        ))}
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">פוליסות פעילות</h2>
        {activePolicies.length === 0 ? (
          <p className="text-sm text-slate-400">אין פוליסות פעילות</p>
        ) : (
          <div className="space-y-2">{activePolicies.map(policyRow)}</div>
        )}
      </section>

      {frozenPolicies.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">חשבונות לא פעילים (מוקפאים)</h2>
          <p className="text-xs text-slate-400 mb-3">חשבונות ללא הפקדות שוטפות — ללא כיסוי ביטוחי</p>
          <div className="space-y-2 opacity-80">{frozenPolicies.map(policyRow)}</div>
        </section>
      )}

      {blockedPolicies.length > 0 && (
        <section className="mb-6">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 mb-3">
            <div className="font-semibold text-amber-800">מוצר היסטורי — נדרשת בחינה פרטנית</div>
            <p className="text-sm text-amber-700 mt-1">
              הפוליסות הבאות נפתחו לפני יוני 2001 (דור מקדמים היסטורי עם תנאים מובטחים).
              המערכת מציגה נתונים בסיסיים בלבד ואינה מריצה עליהן ניתוח אוטומטי.
            </p>
          </div>
          <div className="space-y-2">{blockedPolicies.map(policyRow)}</div>
        </section>
      )}

      {COVERAGE_PRODUCTS.includes(productType) && (
        <section className="mb-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">כיסויים ביטוחיים</h2>
          {coverages.length === 0 ? (
            <p className="text-sm text-slate-400">לא דווחו כיסויים ביטוחיים במוצר זה</p>
          ) : (
            <div className="rounded-xl bg-white border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500">
                    <th className="text-right font-medium p-3">סוג כיסוי</th>
                    <th className="text-right font-medium p-3">סכום / קצבה</th>
                    <th className="text-right font-medium p-3">שיעור</th>
                    <th className="text-right font-medium p-3">עלות חודשית</th>
                    <th className="text-right font-medium p-3">פוליסה</th>
                  </tr>
                </thead>
                <tbody>
                  {coverages.map((c, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="p-3 font-medium text-slate-700">{coverageTypeLabels[c.type]}</td>
                      <td className="p-3">{formatCurrency(c.amount)}</td>
                      <td className="p-3">{c.percent !== null ? formatPercent(c.percent, 0) : '—'}</td>
                      <td className="p-3">{formatCurrency(c.cost)}</td>
                      <td className="p-3 text-slate-400">{c.policyNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-3">ממצאים</h2>
        {productFindings.length === 0 ? (
          <p className="text-sm text-slate-400">אין ממצאים למוצר זה</p>
        ) : (
          <div className="space-y-2">
            {productFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

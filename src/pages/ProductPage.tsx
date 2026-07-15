import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { Policy, ProductType } from '../models/types'
import { formatCurrency, formatPercent } from '../utils/format'
import KpiCard from '../components/KpiCard'
import FindingCard from '../components/FindingCard'

/** Product-specific KPI definitions per PRD Product Discovery sections */
function productKpis(productType: ProductType, policies: Policy[]) {
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
    case 'managers':
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'קצבה צפויה', value: formatCurrency(expectedPension) },
        { label: 'דמי ניהול (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
    case 'gemel':
    case 'education':
      return [
        { label: 'צבירה', value: formatCurrency(total) },
        { label: 'מספר חשבונות', value: String(policies.length) },
        { label: 'דמי ניהול מצבירה (ממוצע)', value: formatPercent(avgFeeAccum) },
      ]
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
  const productFindings = analysis.findings.filter(
    (f) => f.productType === productType || policies.some((p) => p.policyNumber === f.policyNumber),
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
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">פוליסות</h2>
        <div className="space-y-2">
          {policies.map((p) => (
            <button
              key={p.policyNumber}
              onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: p.policyNumber })}
              className="w-full rounded-xl bg-white border border-slate-200 p-4 text-right hover:border-blue-400 hover:shadow flex justify-between items-center"
            >
              <div>
                <div className="font-semibold text-slate-800">{p.productName ?? p.policyNumber}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {p.managingCompany} · פוליסה {p.policyNumber}
                  {p.status === 'inactive' && ' · לא פעילה'}
                </div>
              </div>
              <div className="text-lg font-bold text-slate-700">{formatCurrency(p.currentValue)}</div>
            </button>
          ))}
        </div>
      </section>

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

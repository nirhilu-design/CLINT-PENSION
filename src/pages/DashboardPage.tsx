import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import { formatCurrency } from '../utils/format'
import KpiCard from '../components/KpiCard'
import PieChartCard from '../components/PieChartCard'
import FindingCard from '../components/FindingCard'

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'education', 'life', 'incomeProtection']

export default function DashboardPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { policies, findings, client } = analysis

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPension = policies.reduce((s, p) => s + (p.expectedPension ?? 0), 0)
  const productTypes = new Set(policies.map((p) => p.productType))

  const byProduct = PRODUCT_ORDER.filter((t) => productTypes.has(t)).map((t) => ({
    name: productTypeLabels[t],
    value: policies.filter((p) => p.productType === t).reduce((s, p) => s + (p.currentValue ?? 0), 0),
  })).filter((d) => d.value > 0)

  const byCompany = [...new Set(policies.map((p) => p.managingCompany).filter(Boolean))].map((c) => ({
    name: c!,
    value: policies.filter((p) => p.managingCompany === c).reduce((s, p) => s + (p.currentValue ?? 0), 0),
  })).filter((d) => d.value > 0)

  const centralFindings = findings.filter((f) => f.severity !== 'info').slice(0, 6)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">התיק הפנסיוני של {client.fullName}</h1>
          <p className="text-sm text-slate-500">ת.ז. {client.id}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: 'GO_SUMMARY' })}
            className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            סיכום מנהלים
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            ניתוח חדש
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="סך נכסים" value={formatCurrency(totalAssets)} />
        <KpiCard label="קצבה חודשית צפויה" value={formatCurrency(totalPension)} sub="סיכום מהדיווחים בקבצים" />
        <KpiCard label="מספר מוצרים" value={String(productTypes.size)} />
        <KpiCard label="מספר פוליסות" value={String(policies.length)} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <PieChartCard title="פיזור לפי סוג מוצר" data={byProduct} />
        <PieChartCard title="פיזור לפי חברה מנהלת" data={byCompany} />
      </div>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">ממצאים מרכזיים</h2>
        {centralFindings.length === 0 ? (
          <p className="text-sm text-slate-400">לא נמצאו ממצאים הדורשים בדיקה</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {centralFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold text-slate-800 mb-3">מוצרים</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {PRODUCT_ORDER.map((t) => {
            const productPolicies = policies.filter((p) => p.productType === t)
            const value = productPolicies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
            const has = productPolicies.length > 0
            return (
              <button
                key={t}
                disabled={!has}
                onClick={() => dispatch({ type: 'OPEN_PRODUCT', productType: t })}
                className={`rounded-xl border p-4 text-right transition ${
                  has
                    ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow'
                    : 'bg-slate-50 border-slate-100 text-slate-300 cursor-default'
                }`}
              >
                <div className="font-semibold">{productTypeLabels[t]}</div>
                {has ? (
                  <>
                    <div className="text-xl font-bold mt-1 text-slate-800">{formatCurrency(value)}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{productPolicies.length} פוליסות</div>
                  </>
                ) : (
                  <div className="text-xs mt-1">אין מוצר מסוג זה</div>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

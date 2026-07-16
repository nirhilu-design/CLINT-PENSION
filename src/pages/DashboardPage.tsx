import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import { formatCurrency } from '../utils/format'
import KpiCard from '../components/KpiCard'
import PieChartCard from '../components/PieChartCard'
import FindingCard from '../components/FindingCard'

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education', 'life', 'incomeProtection']

const productIcons: Record<ProductType, string> = {
  pension: '🏛️',
  managers: '📋',
  gemel: '🏦',
  gemelInvestment: '📈',
  education: '🎓',
  life: '🕊️',
  incomeProtection: '🩺',
  unknown: '❔',
}

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">התיק הפנסיוני של {client.fullName}</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          תמונת מצב מרוכזת מ-{policies.length} פוליסות · נכון לדיווח האחרון בקבצים
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="סך נכסים" value={formatCurrency(totalAssets)} icon="💰" accent="blue" />
        <KpiCard
          label="קצבה חודשית צפויה"
          value={formatCurrency(totalPension)}
          sub="סיכום מהדיווחים בקבצים"
          icon="📅"
          accent="emerald"
        />
        <KpiCard label="מספר מוצרים" value={String(productTypes.size)} icon="📦" accent="violet" />
        <KpiCard label="מספר פוליסות" value={String(policies.length)} icon="📄" accent="slate" />
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
                className={`group rounded-xl border p-4 text-right transition ${
                  has
                    ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5'
                    : 'bg-slate-50 border-slate-100 text-slate-300 cursor-default'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={has ? '' : 'grayscale opacity-40'}>{productIcons[t]}</span>
                  <span className="font-semibold">{productTypeLabels[t]}</span>
                </div>
                {has ? (
                  <>
                    <div className="text-xl font-bold mt-1.5 text-slate-800">{formatCurrency(value)}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-slate-400">{productPolicies.length} פוליסות</span>
                      <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition">
                        לפירוט ←
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs mt-1.5">אין מוצר מסוג זה</div>
                )}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import { formatCurrency } from '../utils/format'
import PieChartCard from '../components/PieChartCard'
import FindingCard from '../components/FindingCard'

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education', 'life', 'incomeProtection']

// Gradient monogram tiles per product — a calm, non-templated identity
const productTiles: Record<ProductType, { initials: string; classes: string }> = {
  pension: { initials: 'פנ', classes: 'from-[#235a92] to-[#1a4270]' },
  managers: { initials: 'מנ', classes: 'from-[#4a3aa7] to-[#372c7d]' },
  gemel: { initials: 'גמ', classes: 'from-[#0e9484] to-[#0b6f63]' },
  gemelInvestment: { initials: 'ג"ה', classes: 'from-[#1baf7a] to-[#12805a]' },
  education: { initials: 'הש', classes: 'from-[#eda100] to-[#c07f00]' },
  life: { initials: 'חי', classes: 'from-[#e87ba4] to-[#c25579]' },
  incomeProtection: { initials: 'אכ', classes: 'from-[#eb6834] to-[#bf4d20]' },
  unknown: { initials: '?', classes: 'from-slate-400 to-slate-500' },
}

function HeroKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white/[0.07] border border-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="text-xs text-slate-300/90">{label}</div>
      <div className="mt-0.5 text-2xl font-bold text-white tabular">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
    </div>
  )
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
    <div>
      {/* Hero band */}
      <div className="bg-gradient-to-l from-[#0c1f38] via-[#123054] to-[#173a60] text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <h1 className="text-2xl font-bold">התיק הפנסיוני של {client.fullName}</h1>
          <p className="text-sm text-slate-300/80 mt-1">
            תמונת מצב מרוכזת מ-{policies.length} פוליסות · נכון לדיווח האחרון בקבצים
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <HeroKpi label="סך נכסים" value={formatCurrency(totalAssets)} />
            <HeroKpi label="קצבה חודשית צפויה" value={formatCurrency(totalPension)} sub="סיכום מהדיווחים בקבצים" />
            <HeroKpi label="מוצרים" value={String(productTypes.size)} />
            <HeroKpi label="פוליסות" value={String(policies.length)} />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 pb-10">
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <PieChartCard title="פיזור לפי סוג מוצר" data={byProduct} />
          <PieChartCard title="פיזור לפי חברה מנהלת" data={byCompany} />
        </div>

        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-800">ממצאים מרכזיים</h2>
            {centralFindings.length > 0 && (
              <span className="text-xs text-slate-400">{centralFindings.length} ממצאים לתשומת לב</span>
            )}
          </div>
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
              const tile = productTiles[t]
              return (
                <button
                  key={t}
                  disabled={!has}
                  onClick={() => dispatch({ type: 'OPEN_PRODUCT', productType: t })}
                  className={`group rounded-2xl border p-4 text-right transition ${
                    has
                      ? 'bg-white border-slate-200/70 shadow-sm hover:shadow-md hover:border-[#235a92]/40 hover:-translate-y-0.5'
                      : 'bg-slate-50/60 border-slate-100 cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-10 h-10 rounded-xl grid place-items-center text-white text-sm font-bold bg-gradient-to-br ${tile.classes} ${
                        has ? '' : 'opacity-25'
                      }`}
                    >
                      {tile.initials}
                    </span>
                    <div className="min-w-0">
                      <div className={`font-semibold truncate ${has ? 'text-slate-800' : 'text-slate-300'}`}>
                        {productTypeLabels[t]}
                      </div>
                      {has ? (
                        <div className="text-xs text-slate-400">{productPolicies.length} פוליסות</div>
                      ) : (
                        <div className="text-xs text-slate-300">אין מוצר מסוג זה</div>
                      )}
                    </div>
                  </div>
                  {has && (
                    <div className="flex items-end justify-between mt-3">
                      <div className="text-xl font-bold text-slate-800 tabular">{formatCurrency(value)}</div>
                      <span className="text-xs text-[#235a92] opacity-0 group-hover:opacity-100 transition">
                        לפירוט ←
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import { formatCurrency, formatDate } from '../utils/format'
import PieChartCard from '../components/PieChartCard'
import FindingCard from '../components/FindingCard'
import DepositsTableCard from '../components/DepositsTableCard'
import EquityBarCard from '../components/EquityBarCard'
import { sortFindings } from '../engines/findingPriority'
import { assessCompleteness } from '../services/completenessService'
import { useState } from 'react'
import SliceDrawer, { type SliceSelection } from '../components/SliceDrawer'

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education', 'life', 'incomeProtection']

// Gradient monogram tiles per product — a calm, non-templated identity
const productTiles: Record<ProductType, { initials: string; classes: string }> = {
  pension: { initials: 'פנ', classes: 'from-brand-600 to-brand-700' },
  managers: { initials: 'מנ', classes: 'from-[#4a3aa7] to-[#372c7d]' },
  gemel: { initials: 'גמ', classes: 'from-accent-600 to-[#0b6f63]' },
  gemelInvestment: { initials: 'ג"ה', classes: 'from-[#1baf7a] to-[#12805a]' },
  education: { initials: 'הש', classes: 'from-[#eda100] to-[#c07f00]' },
  life: { initials: 'חי', classes: 'from-[#e87ba4] to-[#c25579]' },
  incomeProtection: { initials: 'אכ', classes: 'from-[#eb6834] to-[#bf4d20]' },
  unknown: { initials: '?', classes: 'from-slate-400 to-slate-500' },
}

function SnapshotTile({
  label,
  value,
  sub,
  ok,
}: {
  label: string
  value: string
  sub: string
  ok: boolean
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-accent-500' : 'bg-slate-300'}`} />
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <div className={`mt-1 text-lg font-bold tabular ${ok ? 'text-slate-800' : 'text-slate-400'}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
    </div>
  )
}

function HeroKpi({
  label,
  value,
  sub,
  tooltip,
}: {
  label: string
  value: string
  sub?: string
  tooltip?: string
}) {
  return (
    <div className="group relative rounded-xl bg-white/[0.07] border border-white/10 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-1 text-xs text-slate-300/90">
        <span>{label}</span>
        {tooltip && <span className="text-slate-400/70 cursor-help">ⓘ</span>}
      </div>
      <div className="mt-0.5 text-2xl font-bold text-white tabular">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-slate-400">{sub}</div>}
      {tooltip && (
        <div className="pointer-events-none absolute z-20 top-full mt-2 right-0 w-64 rounded-lg bg-slate-900/95 text-slate-100 text-[11px] leading-relaxed p-2.5 shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition">
          {tooltip}
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { policies, findings, client } = analysis

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPension = policies.reduce((s, p) => s + (p.expectedPension ?? 0), 0)
  const hasNoDepositProjection = policies.some((p) => p.expectedPensionNoDeposits !== null)
  const totalPensionNoDeposits = hasNoDepositProjection
    ? policies.reduce((s, p) => s + (p.expectedPensionNoDeposits ?? 0), 0)
    : null
  const productTypes = new Set(policies.map((p) => p.productType))

  const byProduct = PRODUCT_ORDER.filter((t) => productTypes.has(t)).map((t) => ({
    name: productTypeLabels[t],
    key: t,
    value: policies.filter((p) => p.productType === t).reduce((s, p) => s + (p.currentValue ?? 0), 0),
  })).filter((d) => d.value > 0)

  const byCompany = [...new Set(policies.map((p) => p.managingCompany).filter(Boolean))].map((c) => ({
    name: c!,
    key: c!,
    value: policies.filter((p) => p.managingCompany === c).reduce((s, p) => s + (p.currentValue ?? 0), 0),
  })).filter((d) => d.value > 0)

  const [slice, setSlice] = useState<SliceSelection | null>(null)

  const actionable = sortFindings(findings.filter((f) => f.severity !== 'info'))
  const centralFindings = actionable.slice(0, 6)
  const gapCount = actionable.filter((f) => f.severity === 'gap').length
  const attentionCount = actionable.filter((f) => f.severity === 'attention').length
  const completeness = assessCompleteness(analysis)

  // Insurance coverage snapshot across the portfolio
  const activePolicies = policies.filter((p) => p.status === 'active')
  const ipPercents = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'disability'))
    .map((c) => c.percent)
    .filter((v): v is number => v !== null)
  const survivorsMonthly = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'survivors'))
    .reduce((s, c) => s + (c.amount ?? 0), 0)
  const deathLump = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'death'))
    .reduce((s, c) => s + (c.amount ?? 0), 0)
  const lastDeposit = policies
    .map((p) => p.lastDepositMonth)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined

  return (
    <div>
      {/* Hero band */}
      <div className="bg-gradient-to-l from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <h1 className="text-2xl font-bold">התיק הפנסיוני של {client.fullName}</h1>
          <p className="text-sm text-slate-300/80 mt-1">
            תמונת מצב מרוכזת מ-{policies.length} פוליסות
            {(() => {
              const dates = policies.map((p) => p.reportDate).filter(Boolean) as string[]
              if (dates.length === 0) return ' · תאריך הנתונים לא דווח בקבצים'
              const latest = dates.sort()[dates.length - 1]
              return ` · הנתונים נכונים ל-${formatDate(latest)}`
            })()}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            <HeroKpi label="סך נכסים" value={formatCurrency(totalAssets)} />
            <HeroKpi
              label="קצבה עם המשך הפקדות"
              value={formatCurrency(totalPension)}
              sub="סיכום מהדיווחים בקבצים"
              tooltip="הקצבה החודשית הצפויה לגיל הפרישה בהנחה שההפקדות ממשיכות עד הפרישה — ללא פדיון וללא שינוי בשכר. זו הקצבה שהבקרות בודקות."
            />
            <HeroKpi
              label="קצבה ללא המשך הפקדות"
              value={totalPensionNoDeposits !== null ? formatCurrency(totalPensionNoDeposits) : '—'}
              sub={totalPensionNoDeposits !== null ? 'ללא הפקדות נוספות מהיום' : 'לא דווח בקבצים'}
            />
            <HeroKpi
              label="מוצרים · פוליסות"
              value={`${productTypes.size} · ${policies.length}`}
            />
            <HeroKpi
              label="ממצאים לתשומת לב"
              value={String(actionable.length)}
              sub={
                actionable.length > 0
                  ? [gapCount > 0 ? `${gapCount} פערים` : '', attentionCount > 0 ? `${attentionCount} לבדיקה` : '']
                      .filter(Boolean)
                      .join(' · ')
                  : completeness.complete
                    ? 'לא נמצאו ממצאים'
                    : 'הבדיקה חלקית — מידע חסר'
              }
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 pb-10">
        {/* 1. Attention first */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3 pt-2">
            <h2 className="text-lg font-bold text-slate-800">נקודות הדורשות תשומת לב</h2>
            {actionable.length > centralFindings.length && (
              <span className="text-xs text-slate-400">
                מוצגים {centralFindings.length} מתוך {actionable.length} · המלא בסיכום המנהלים
              </span>
            )}
          </div>
          {centralFindings.length === 0 ? (
            completeness.complete ? (
              <p className="text-sm text-slate-400">לא נמצאו ממצאים הדורשים בדיקה</p>
            ) : (
              <p className="text-sm text-slate-500">
                לא עלו ממצאים בבדיקות שבוצעו — אך הבדיקה לא הושלמה במלואה בשל מידע חסר (פירוט למטה).
              </p>
            )
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {centralFindings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}

          {!completeness.complete && (
            <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
              <div className="text-sm font-semibold text-slate-600 mb-1.5">שלמות הנתונים</div>
              <ul className="space-y-1">
                {completeness.missing.map((m, i) => (
                  <li key={i} className="text-xs text-slate-500 flex gap-1.5">
                    <span className="text-slate-300">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 2. Coverage & deposits snapshot */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-800 mb-3">כיסויים והפקדות במבט מהיר</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SnapshotTile
              label='אובדן כושר עבודה'
              value={ipPercents.length > 0 ? `${Math.max(...ipPercents).toFixed(0)}%` : 'לא נמצא'}
              sub={ipPercents.length > 0 ? 'שיעור הכיסוי הגבוה בתיק' : 'לא אותר כיסוי במוצרים שנותחו'}
              ok={ipPercents.length > 0}
            />
            <SnapshotTile
              label="קצבת שאירים"
              value={survivorsMonthly > 0 ? formatCurrency(survivorsMonthly) : 'לא נמצא'}
              sub={survivorsMonthly > 0 ? 'לחודש, מקרן הפנסיה' : 'לא אותר כיסוי שאירים'}
              ok={survivorsMonthly > 0}
            />
            <SnapshotTile
              label="ביטוח חיים"
              value={deathLump > 0 ? formatCurrency(deathLump) : 'לא נמצא'}
              sub={deathLump > 0 ? 'סכום חד-פעמי למקרה מוות' : 'לא אותר ביטוח למקרה מוות'}
              ok={deathLump > 0}
            />
            <SnapshotTile
              label="הפקדה אחרונה"
              value={lastDeposit ?? 'לא דווח'}
              sub={lastDeposit ? 'החודש האחרון שנקלט בתיק' : 'לא דווחו הפקדות בקבצים'}
              ok={!!lastDeposit}
            />
          </div>
        </section>

        {/* 3. Money distribution */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <PieChartCard
            title="פיזור לפי סוג מוצר"
            data={byProduct}
            onSliceClick={(key) => setSlice({ kind: 'product', key })}
          />
          <PieChartCard
            title="פיזור לפי חברה מנהלת"
            data={byCompany}
            onSliceClick={(key) => setSlice({ kind: 'company', key })}
          />
        </div>

        {slice && (
          <SliceDrawer
            selection={slice}
            policies={policies}
            portfolioTotal={totalAssets}
            onClose={() => setSlice(null)}
          />
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <DepositsTableCard policies={policies} />
          <EquityBarCard policies={policies} allocations={analysis.supplementary.treasuryAllocations} />
        </div>

        {/* 4. Products */}
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
                      ? 'bg-white border-slate-200/70 shadow-sm hover:shadow-md hover:border-brand-600/40 hover:-translate-y-0.5'
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
                      <span className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition">
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

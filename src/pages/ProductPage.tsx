import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { coverageTypeLabels, productTypeLabels } from '../models/labels'
import type { Policy, ProductType } from '../models/types'
import { formatCurrency, formatDate, formatPercent } from '../utils/format'
import KpiCard from '../components/KpiCard'
import FindingCard from '../components/FindingCard'
import ReturnsTable from '../components/ReturnsTable'
import AllocationBars, { weightedAllocation } from '../components/AllocationBars'
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
      const deathCovers = policies.flatMap((p) => p.coverages).filter((c) => c.type === 'death')
      const deathCover = deathCovers.reduce((s, c) => s + (c.amount ?? 0), 0)
      const premium = deathCovers.reduce((s, c) => s + (c.cost ?? 0), 0)
      const kpis: Kpi[] = [
        { label: 'כיסוי למקרה מוות (ריסק)', value: formatCurrency(deathCover) },
        { label: 'פרמיה חודשית', value: formatCurrency(premium) },
      ]
      if (total > 0) {
        kpis.push({ label: 'רכיב חיסכון', value: formatCurrency(total), sub: 'צבירה בפוליסה' })
      }
      return kpis
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

  const [tab, setTab] = useState<'overview' | 'returns' | 'coverages'>('overview')
  const tabs: { id: 'overview' | 'returns' | 'coverages'; label: string; count?: number }[] = [
    { id: 'overview', label: 'סקירה', count: productFindings.length },
    { id: 'returns', label: 'תשואות' },
    ...(COVERAGE_PRODUCTS.includes(productType)
      ? [{ id: 'coverages' as const, label: 'כיסויים', count: coverages.length }]
      : []),
  ]

  // Visible per-product missing-data summary
  const missingData: string[] = []
  for (const p of policies) {
    if (isBlockedByStopIssue(p)) continue
    const miss: string[] = []
    if (p.fees.fromDeposit === null && p.fees.fromAccumulation === null) miss.push('דמי ניהול')
    if (p.netReturn === null) miss.push('תשואה')
    if (!p.openDate) miss.push('תאריך הצטרפות')
    if (!p.mofid) miss.push('מספר אוצר')
    if ((productType === 'pension' || productType === 'managers') && p.expectedPension === null) {
      miss.push('קצבה צפויה')
    }
    if (miss.length > 0) miss.length && missingData.push(`פוליסה ${p.policyNumber}: ${miss.join(', ')}`)
  }

  const policyRow = (p: Policy) => (
    <button
      key={p.policyNumber}
      onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: p.policyNumber })}
      className="w-full rounded-xl bg-white border border-slate-200 p-4 text-right hover:border-brand-600/50 hover:shadow flex justify-between items-center"
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
      <nav className="text-sm text-slate-400 mb-4">
        <button onClick={() => dispatch({ type: 'GO_DASHBOARD' })} className="text-brand-700 hover:underline">
          דשבורד
        </button>
        <span className="mx-1.5">‹</span>
        <span className="text-slate-600">{productTypeLabels[productType]}</span>
      </nav>

      {/* Product header: identity and status first */}
      <header className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{productTypeLabels[productType]}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {[...new Set(policies.map((p) => p.managingCompany).filter(Boolean))].join(' · ') ||
                'גוף מנהל לא דווח'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {policies.length} פוליסות
            </span>
            {activePolicies.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
                {activePolicies.length} פעילות
              </span>
            )}
            {frozenPolicies.length > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                {frozenPolicies.length} מוקפאות
              </span>
            )}
            {(() => {
              const dates = policies.map((p) => p.openDate).filter(Boolean) as string[]
              return dates.length > 0 ? (
                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                  ותק מ-{formatDate(dates.sort()[0])}
                </span>
              ) : null
            })()}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {productKpis(productType, policies).map((kpi) => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} sub={kpi.sub} />
          ))}
        </div>
      </header>

      {/* Tabs: overview first, secondary detail behind */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition -mb-px ${
              tab === t.id
                ? 'bg-white border border-slate-200 border-b-white text-brand-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="text-xs text-slate-400 mr-1.5">({t.count})</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <section className="mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-3">פוליסות פעילות</h2>
            {activePolicies.length === 0 ? (
              <p className="text-sm text-slate-400">אין פוליסות פעילות</p>
            ) : (
              <div className="space-y-2">{activePolicies.map(policyRow)}</div>
            )}
          </section>

          {frozenPolicies.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-bold text-slate-800 mb-1">חשבונות לא פעילים (מוקפאים)</h2>
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

          <section className="mb-6">
            <h2 className="text-base font-bold text-slate-800 mb-3">ממצאים</h2>
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

          {missingData.length > 0 && (
            <section className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
              <h2 className="text-sm font-semibold text-violet-700 mb-1.5">נתונים חסרים במוצר זה</h2>
              <ul className="space-y-1">
                {missingData.map((m, i) => (
                  <li key={i} className="text-xs text-violet-600/80 flex gap-1.5">
                    <span>•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {tab === 'returns' && (
        <div className="space-y-6">
          <ReturnsTable
            policies={policies}
            treasuryFunds={analysis.supplementary.treasuryFunds}
            showProductColumn={false}
          />
          <div>
            <h3 className="text-base font-bold text-slate-800 mb-3">פירוק אפיקי השקעה</h3>
            {(() => {
              const agg = weightedAllocation(policies, analysis.supplementary.treasuryAllocations)
              return (
                <AllocationBars
                  groups={agg.groups}
                  coveredValue={agg.coveredValue}
                  totalValue={agg.totalValue}
                />
              )
            })()}
          </div>
        </div>
      )}

      {tab === 'coverages' && (
        <>
          {coverages.length === 0 ? (
            <p className="text-sm text-slate-400">לא דווחו כיסויים ביטוחיים במוצר זה</p>
          ) : (
            <div className="rounded-xl bg-white border border-slate-200 overflow-x-auto">
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
                      <td className="p-3 tabular">{formatCurrency(c.amount)}</td>
                      <td className="p-3 tabular">{c.percent !== null ? formatPercent(c.percent, 0) : '—'}</td>
                      <td className="p-3 tabular">{formatCurrency(c.cost)}</td>
                      <td className="p-3 text-slate-400 tabular">{c.policyNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

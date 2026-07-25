import type { PortfolioExposure, ExposureScope, CompanyExposure } from '../services/exposureService'
import { formatCurrency } from '../utils/format'

// Distinct, theme-fixed hues for the company bars (identity by order, direct-labeled).
const BAR_COLORS = ['#1a4270', '#235a92', '#16ab99', '#4f7bab', '#0e9484', '#8aa6c4']

function CompanyBars({ items }: { items: CompanyExposure[] }) {
  if (items.length === 0) return <p className="text-xs text-slate-400">אין נתונים</p>
  return (
    <div className="space-y-1.5">
      {items.map((c, i) => (
        <div key={c.company} className="text-xs">
          <div className="flex justify-between text-slate-600 mb-0.5">
            <span className="truncate">{c.company}</span>
            <span className="tabular font-medium text-slate-800 shrink-0 ms-2">
              {c.percent.toFixed(0)}% · {formatCurrency(c.value)}
            </span>
          </div>
          <div className="h-2 rounded-sm bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-sm"
              style={{ width: `${c.percent}%`, background: BAR_COLORS[i % BAR_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function EquityLine({ scope }: { scope: ExposureScope }) {
  if (scope.equity.equityPercent === null) {
    return (
      <p className="text-xs text-slate-400 mt-2">
        חשיפה למניות: טען קובץ אפיקי השקעה (אוצר) באזור היועץ כדי לחשב.
      </p>
    )
  }
  const pct = scope.equity.equityPercent
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>חשיפה למניות (משוקללת)</span>
        <span className="font-semibold text-slate-800">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 rounded-sm bg-slate-100 overflow-hidden">
        <div className="h-full bg-accent-500 rounded-sm" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        מחושב על {formatCurrency(scope.equity.coveredValue)} שיש להם נתוני אפיקים
      </p>
    </div>
  )
}

export default function ExposureAnalysis({ exposure }: { exposure: PortfolioExposure }) {
  const { portfolio, gemel, gemelTotal, gemelShare } = exposure
  if (portfolio.total <= 0) return null

  return (
    <section className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm mb-8">
      <h3 className="font-bold text-slate-800">מבנה חשיפה — מנהל השקעות ומניות</h3>
      <p className="text-sm text-slate-500 mt-1">
        סך נכסים {formatCurrency(portfolio.total)} · מתוכם בקופות גמל{' '}
        <span className="font-semibold text-slate-700">{formatCurrency(gemelTotal)}</span> (
        {gemelShare.toFixed(0)}% מהתיק).
      </p>

      <div className="grid md:grid-cols-2 gap-6 mt-4">
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">כלל התיק</div>
          <CompanyBars items={portfolio.byCompany} />
          <EquityLine scope={portfolio} />
        </div>
        <div>
          <div className="text-sm font-semibold text-slate-700 mb-2">קופות גמל בלבד</div>
          {gemel.total > 0 ? (
            <>
              {gemel.capitalTotal > 0 && (
                <p className="text-xs text-slate-600 mb-2">
                  מזה במעמד הון:{' '}
                  <span className="font-semibold text-slate-800">{formatCurrency(gemel.capitalTotal)}</span>{' '}
                  ({((gemel.capitalTotal / gemel.total) * 100).toFixed(0)}%)
                </p>
              )}
              <CompanyBars items={gemel.byCompany} />
              <EquityLine scope={gemel} />
            </>
          ) : (
            <p className="text-xs text-slate-400">אין קופות גמל בתיק</p>
          )}
        </div>
      </div>
    </section>
  )
}

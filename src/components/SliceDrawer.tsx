import { useEffect, useState } from 'react'
import type { Policy, ProductType } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatCurrency } from '../utils/format'
import { useApp } from '../hooks/useAppState'

export interface SliceSelection {
  kind: 'product' | 'company'
  key: string // ProductType for product slices, company name for company slices
}

// Drill-down drawer opened by clicking a pie slice: the policies behind
// that slice, their values and share of the portfolio.
export default function SliceDrawer({
  selection,
  policies,
  portfolioTotal,
  onClose,
}: {
  selection: SliceSelection
  policies: Policy[]
  portfolioTotal: number
  onClose: () => void
}) {
  const { dispatch } = useApp()
  const [entered, setEntered] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const slicePolicies =
    selection.kind === 'product'
      ? policies.filter((p) => p.productType === selection.key)
      : policies.filter((p) => p.managingCompany === selection.key)

  const title =
    selection.kind === 'product'
      ? productTypeLabels[selection.key as ProductType]
      : selection.key
  const total = slicePolicies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const share = portfolioTotal > 0 ? Math.round((total / portfolioTotal) * 100) : 0

  return (
    <div className="fixed inset-0 z-40">
      <div
        className={`absolute inset-0 bg-black/30 transition-opacity duration-200 ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 left-0 h-full w-full max-w-sm bg-white shadow-xl overflow-y-auto transition-transform duration-200 ${
          entered ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 px-5 py-3.5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <p className="text-sm text-slate-500 tabular">
              {formatCurrency(total)} · {share}% מהתיק · {slicePolicies.length} פוליסות
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg grid place-items-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 text-xl"
            aria-label="סגירה"
          >
            ×
          </button>
        </div>

        <div className="p-5 space-y-2">
          {slicePolicies.map((p) => (
            <button
              key={p.policyNumber}
              onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: p.policyNumber })}
              className="w-full rounded-xl border border-slate-200/70 p-3 text-right hover:border-brand-600/50 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-center">
                <div className="min-w-0">
                  <div className="font-medium text-slate-800 text-sm truncate">
                    {p.productName ?? p.policyNumber}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selection.kind === 'product' ? p.managingCompany : productTypeLabels[p.productType]}
                    {' · '}
                    {p.policyNumber}
                    {p.status === 'inactive' && ' · לא פעילה'}
                  </div>
                </div>
                <div className="text-sm font-bold text-slate-700 tabular shrink-0">
                  {formatCurrency(p.currentValue)}
                </div>
              </div>
              {total > 0 && (
                <div className="h-1 rounded-full bg-slate-100 mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-600"
                    style={{ width: `${Math.round(((p.currentValue ?? 0) / total) * 100)}%` }}
                  />
                </div>
              )}
            </button>
          ))}

          {selection.kind === 'product' && (
            <button
              onClick={() => {
                onClose()
                dispatch({ type: 'OPEN_PRODUCT', productType: selection.key as ProductType })
              }}
              className="w-full rounded-xl bg-brand-800 text-white font-semibold py-2.5 hover:bg-brand-700 transition mt-2"
            >
              למסך המוצר המלא ←
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}

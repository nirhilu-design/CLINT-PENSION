import { useState } from 'react'
import type { Policy, ProductType } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatPercent, formatDate } from '../utils/format'
import { useIsMobile } from '../hooks/useMediaQuery'
import { TrendingUp, LineChart } from 'lucide-react'

/**
 * ביצועים ותשואות. The clearinghouse XML reports one cumulative YTD net return
 * per product (SHEUR-TSUA-NETO) — a single point, not a monthly series. Per the
 * baseline spec we do NOT fabricate a historical line from a single point; we
 * compare the real per-product YTD returns as bars and surface the weighted
 * portfolio average. Longer ranges are shown but disabled until a real series
 * (e.g. treasury history) is connected.
 */

type Range = 'ytd' | '1y' | '3y' | '5y' | 'all'
const RANGES: { key: Range; label: string }[] = [
  { key: 'ytd', label: 'מתחילת השנה' },
  { key: '1y', label: 'שנה' },
  { key: '3y', label: '3 שנים' },
  { key: '5y', label: '5 שנים' },
  { key: 'all', label: 'הכל' },
]

export default function ReturnsPerformance({
  policies,
  colorFor,
}: {
  policies: Policy[]
  colorFor: (t: ProductType) => string
}) {
  const mobile = useIsMobile()
  const [range, setRange] = useState<Range>('ytd')

  // Only YTD has real data from a single XML snapshot.
  const available = new Set<Range>(['ytd'])

  const withReturn = policies.filter((p) => p.netReturn !== null)
  const sorted = [...withReturn].sort((a, b) => (b.netReturn ?? 0) - (a.netReturn ?? 0))
  const maxAbs = Math.max(0.01, ...sorted.map((p) => Math.abs(p.netReturn ?? 0)))

  // Weighted average by current value (falls back to a simple mean).
  let wSum = 0
  let base = 0
  for (const p of withReturn) {
    if (p.currentValue && p.netReturn !== null) {
      wSum += p.currentValue * p.netReturn
      base += p.currentValue
    }
  }
  const weightedAvg =
    base > 0
      ? wSum / base
      : withReturn.length > 0
        ? withReturn.reduce((s, p) => s + (p.netReturn ?? 0), 0) / withReturn.length
        : null

  const reportDates = policies.map((p) => p.reportDate).filter(Boolean) as string[]
  const asOf = reportDates.length ? formatDate(reportDates.sort()[reportDates.length - 1]) : null

  return (
    <div>
      {/* Range selector — only ranges with a real data series are enabled */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', background: 'var(--neutral-100)', borderRadius: 'var(--radius-full)', padding: 3, gap: 2 }}>
          {RANGES.map((r) => {
            const enabled = available.has(r.key)
            const active = range === r.key
            return (
              <button
                key={r.key}
                onClick={() => enabled && setRange(r.key)}
                disabled={!enabled}
                title={enabled ? undefined : 'אין נתונים לטווח זה'}
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  fontFamily: 'inherit',
                  border: 'none',
                  cursor: enabled ? 'pointer' : 'not-allowed',
                  background: active ? 'var(--color-bg-card)' : 'transparent',
                  boxShadow: active ? 'var(--shadow-card)' : 'none',
                  color: active ? 'var(--clint-700)' : enabled ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
                  opacity: enabled ? 1 : 0.55,
                }}
              >
                {r.label}
              </button>
            )
          })}
        </div>
        {asOf && <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>נכון ל-{asOf}</span>}
      </div>

      {sorted.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '40px 16px', textAlign: 'center' }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--neutral-100)', display: 'grid', placeItems: 'center', color: 'var(--color-text-tertiary)' }}>
            <LineChart size={22} />
          </span>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-secondary)' }}>אין נתוני תשואה בקבצים שנטענו</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', maxWidth: 380, lineHeight: 1.6 }}>
            תשואה מוצגת כאשר הגוף המדווח כולל שדה תשואה מתחילת השנה. חיבור להיסטוריית מסלולים יאפשר גרף תשואה לאורך זמן.
          </div>
        </div>
      ) : (
        <>
          {/* Weighted-portfolio insight */}
          {weightedAvg !== null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--clint-50)',
                marginBottom: 16,
              }}
            >
              <span style={{ width: 34, height: 34, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color: 'var(--clint-600)', flexShrink: 0 }}>
                <TrendingUp size={17} />
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>תשואת התיק המשוקללת מתחילת השנה</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-mono)', color: weightedAvg >= 0 ? 'var(--color-success-dark)' : 'var(--color-danger-dark)' }}>
                  {weightedAvg >= 0 ? '+' : ''}{formatPercent(weightedAvg)}
                </div>
              </div>
            </div>
          )}

          {/* Per-product YTD return bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 12 : 11 }}>
            {sorted.map((p) => {
              const v = p.netReturn ?? 0
              const color = colorFor(p.productType)
              const pos = v >= 0
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: mobile ? 96 : 132, flexShrink: 0, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {productTypeLabels[p.productType]}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.managingCompany ?? '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1, height: 12, borderRadius: 6, background: 'var(--neutral-100)', position: 'relative', overflow: 'hidden' }}>
                    <div
                      style={{
                        position: 'absolute',
                        insetInlineStart: 0,
                        top: 0,
                        bottom: 0,
                        width: `${(Math.abs(v) / maxAbs) * 100}%`,
                        background: pos ? color : 'var(--color-danger)',
                        borderRadius: 6,
                        transition: 'width 400ms var(--ease-out)',
                      }}
                    />
                  </div>
                  <b style={{ width: 62, textAlign: 'left', flexShrink: 0, fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 800, color: pos ? 'var(--color-success-dark)' : 'var(--color-danger-dark)' }}>
                    {pos ? '+' : ''}{formatPercent(v)}
                  </b>
                </div>
              )
            })}
          </div>

          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 14, lineHeight: 1.6 }}>
            הנתון הוא תשואה נטו מצטברת מתחילת השנה כפי שדווחה בקובץ — נקודה אחת לכל מוצר, לא סדרה היסטורית.
          </div>
        </>
      )}
    </div>
  )
}

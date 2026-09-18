import { useState } from 'react'
import type { Policy, ProductType } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatPercent, formatDate } from '../utils/format'
import { useIsMobile } from '../hooks/useMediaQuery'
import { policyDisplayReturn } from '../services/returnsService'
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

  // Resolve each policy's reliable return (sanity-checked, track-weighted fallback).
  const withReturn = policies
    .map((p) => ({ p, value: policyDisplayReturn(p).value }))
    .filter((x): x is { p: Policy; value: number } => x.value !== null)
  const sorted = [...withReturn].sort((a, b) => b.value - a.value)
  const maxAbs = Math.max(0.01, ...sorted.map((x) => Math.abs(x.value)))
  const hasNegative = sorted.some((x) => x.value < 0)
  // Products that carry savings but whose reported return is a not-real 0% (data gap).
  const suspiciousCount = policies.filter((p) => policyDisplayReturn(p).suspiciousZero).length

  // Weighted average by current value (falls back to a simple mean).
  let wSum = 0
  let base = 0
  for (const { p, value } of withReturn) {
    if (p.currentValue) {
      wSum += p.currentValue * value
      base += p.currentValue
    }
  }
  const weightedAvg =
    base > 0
      ? wSum / base
      : withReturn.length > 0
        ? withReturn.reduce((s, x) => s + x.value, 0) / withReturn.length
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

          {/* Per-policy YTD return — vertical columns, X axis = product name.
              Positive grows up (product hue), negative down (danger), from a zero
              baseline. Horizontally scrollable when there are many policies. */}
          {(() => {
            const plotH = mobile ? 150 : 190
            const headroom = 22 // room for the value label at the bar end
            const zeroTop = hasNegative ? plotH / 2 : plotH - 6 // baseline position
            const upSpan = zeroTop - headroom
            const downSpan = plotH - zeroTop - headroom
            const colW = mobile ? 76 : 92
            return (
              <div className="clint-scroll-x" style={{ overflowX: 'auto', paddingBottom: 4 }}>
                <div style={{ display: 'flex', gap: mobile ? 10 : 14, alignItems: 'stretch', minWidth: 'min-content' }}>
                  {sorted.map(({ p, value }) => {
                    const pos = value >= 0
                    const color = pos ? colorFor(p.productType) : 'var(--color-danger)'
                    const span = pos ? upSpan : downSpan
                    const barLen = Math.max(3, (Math.abs(value) / maxAbs) * span)
                    return (
                      <div
                        key={p.id}
                        style={{ width: colW, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        title={`${productTypeLabels[p.productType]}${p.mofid ? ` · אוצר ${p.mofid}` : ''}\n${p.managingCompany ?? ''}\nתשואה נטו מתחילת השנה: ${pos ? '+' : ''}${formatPercent(value)}`}
                      >
                        {/* Plot cell with the zero baseline */}
                        <div style={{ position: 'relative', width: '100%', height: plotH }}>
                          <div style={{ position: 'absolute', insetInline: 0, top: zeroTop, height: 2, background: 'var(--color-border-strong, var(--neutral-200))' }} />
                          {/* Value label at the bar end */}
                          <div
                            style={{
                              position: 'absolute',
                              insetInline: 0,
                              ...(pos ? { top: zeroTop - barLen - 18 } : { top: zeroTop + barLen + 4 }),
                              textAlign: 'center',
                              fontSize: 12,
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 800,
                              color: pos ? 'var(--color-success-dark)' : 'var(--color-danger-dark)',
                            }}
                          >
                            {pos ? '+' : ''}{formatPercent(value)}
                          </div>
                          {/* Column */}
                          <div
                            style={{
                              position: 'absolute',
                              insetInlineStart: '50%',
                              transform: 'translateX(50%)',
                              width: mobile ? 26 : 34,
                              ...(pos ? { top: zeroTop - barLen } : { top: zeroTop }),
                              height: barLen,
                              background: color,
                              borderRadius: pos ? '4px 4px 0 0' : '0 0 4px 4px',
                              transition: 'height 400ms var(--ease-out)',
                            }}
                          />
                        </div>
                        {/* X-axis label: product name + מספר אוצר + company */}
                        <div style={{ width: '100%', textAlign: 'center', marginTop: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.25 }}>
                            {productTypeLabels[p.productType]}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                            {p.mofid ? `אוצר ${p.mofid}` : 'אין מספר אוצר'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                            {p.managingCompany ?? '—'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 14, lineHeight: 1.6 }}>
            תשואה נטו מצטברת מתחילת השנה כפי שדווחה בקובץ — נקודה אחת לכל פוליסה, לא סדרה היסטורית. מוצרי ביטוח חיים/אכ"ע אינם נכללים (אין בהם צבירה).
            {suspiciousCount > 0 && ` ${suspiciousCount} מוצרים דיווחו תשואה 0% ולא נכללו — ערך שאינו סביר (למעט ביטוח מנהלים מלפני 1992). נקודה לבדיקה מול בעל רישיון.`}
          </div>
        </>
      )}
    </div>
  )
}

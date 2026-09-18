import { useState } from 'react'
import type { Policy, ProductType, TreasuryFundData } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatPercent, formatDate } from '../utils/format'
import { useIsMobile } from '../hooks/useMediaQuery'
import { policyDisplayReturn, policyChartReturn, availableRanges, type ReturnRange } from '../services/returnsService'
import { TrendingUp, LineChart } from 'lucide-react'

/**
 * ביצועים ותשואות. The מסלקה XML carries only a net YTD return (SHEUR-TSUA-NETO)
 * — one point, not a series. Gross and multi-period (12m/3y/5y) returns come from
 * the treasury (גמל-נט/פנסיה-נט) data the advisor loads, matched by מספר אוצר. So
 * מתחילת השנה shows net (from the XML); the longer ranges show gross (from the
 * treasury). Each range is enabled only where real data exists.
 */

const RANGES: { key: ReturnRange; label: string; gross: boolean }[] = [
  { key: 'ytd', label: 'מתחילת השנה', gross: false },
  { key: '12m', label: 'שנה', gross: true },
  { key: '3y', label: '3 שנים', gross: true },
  { key: '5y', label: '5 שנים', gross: true },
]

export default function ReturnsPerformance({
  policies,
  colorFor,
  funds = [],
}: {
  policies: Policy[]
  colorFor: (t: ProductType) => string
  funds?: TreasuryFundData[]
}) {
  const mobile = useIsMobile()
  const available = new Set<ReturnRange>(availableRanges(policies, funds))
  // Default to the 12-month gross view when treasury data is present, else YTD net.
  const [range, setRange] = useState<ReturnRange>(available.has('12m') ? '12m' : 'ytd')
  const grossRange = range !== 'ytd'

  // Resolve each policy's return for the selected range (net YTD, or treasury gross).
  const withReturn = policies
    .map((p) => ({ p, value: policyChartReturn(p, funds, range).value }))
    .filter((x): x is { p: Policy; value: number } => x.value !== null)
  const sorted = [...withReturn].sort((a, b) => b.value - a.value)
  const maxAbs = Math.max(0.01, ...sorted.map((x) => Math.abs(x.value)))
  const hasNegative = sorted.some((x) => x.value < 0)
  // Products that carry savings but whose reported YTD return is a not-real 0% (data gap).
  const suspiciousCount = range === 'ytd' ? policies.filter((p) => policyDisplayReturn(p).suspiciousZero).length : 0

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
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  תשואת התיק המשוקללת · {RANGES.find((r) => r.key === range)?.label} ({grossRange ? 'ברוטו, נתוני אוצר' : 'נטו, מסלקה'})
                </div>
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
                        title={`${productTypeLabels[p.productType]}${p.mofid ? ` · אוצר ${p.mofid}` : ''}\n${p.managingCompany ?? ''}\n${grossRange ? 'תשואת ברוטו (אוצר)' : 'תשואה נטו מתחילת השנה'}: ${pos ? '+' : ''}${formatPercent(value)}`}
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
            {grossRange
              ? 'תשואת ברוטו ברמת הקופה מתוך נתוני האוצר (גמל-נט/פנסיה-נט), מותאמת לפי מספר אוצר. מוצרים ללא נתוני אוצר תואמים אינם נכללים בטווח זה.'
              : 'תשואה נטו מתחילת השנה כפי שדווחה במסלקה — נקודה אחת לכל פוליסה. מוצרי ביטוח חיים/אכ"ע אינם נכללים (אין בהם צבירה). תשואת ברוטו ולתקופות ארוכות יותר זמינה בטווחים שנה/3ש/5ש כשנטענים נתוני אוצר.'}
            {suspiciousCount > 0 && ` ${suspiciousCount} מוצרים דיווחו תשואה 0% ולא נכללו — ערך שאינו סביר (למעט ביטוח מנהלים מלפני 1992). נקודה לבדיקה מול בעל רישיון.`}
          </div>
        </>
      )}
    </div>
  )
}

import { useState } from 'react'
import type { ProductType } from '../models/types'
import Card from './ds/Card'
import { useIsMobile } from '../hooks/useMediaQuery'

export interface AssetSlice {
  type: ProductType | 'other'
  label: string
  value: number
  color: string
}

/** ₪2.43M / ₪512K compact label for the donut center. */
function compact(v: number): string {
  if (v >= 1_000_000) return `₪${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `₪${Math.round(v / 1_000)}K`
  return `₪${Math.round(v)}`
}

/**
 * Clean asset-allocation donut, hand-rolled in SVG (no chart lib). Each segment
 * is clickable and opens the matching product. Presentation only.
 */
export default function AssetDonut({
  slices,
  onSelect,
  bare = false,
  heading = 'התפלגות נכסים כוללת',
}: {
  slices: AssetSlice[]
  onSelect?: (type: ProductType) => void
  /** Render inner content only (no Card chrome) — for embedding inside another card. */
  bare?: boolean
  heading?: string
}) {
  const mobile = useIsMobile()
  const [hover, setHover] = useState<string | null>(null)
  const total = slices.reduce((s, x) => s + x.value, 0)
  const size = mobile ? 150 : 180
  const stroke = mobile ? 22 : 26
  const hoverGrow = 6 // px of extra stroke width on hover
  const r = (size - stroke - hoverGrow) / 2 // reserve room so a hovered slice isn't clipped
  const circ = 2 * Math.PI * r
  const gap = total > 0 ? 1.5 : 0 // small degree gap between segments (in %)

  let offsetPct = 0
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const pct = total > 0 ? (s.value / total) * 100 : 0
      const len = Math.max(0, pct - gap)
      const arc = {
        ...s,
        pct,
        dash: (len / 100) * circ,
        rest: circ - (len / 100) * circ,
        rotation: (offsetPct / 100) * 360,
      }
      offsetPct += pct
      return arc
    })

  const clickable = (t: ProductType | 'other') => t !== 'other' && !!onSelect

  const inner = (
    <>
      <div style={{ fontSize: mobile ? 15 : 16, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 16 }}>
        {heading}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: mobile ? 16 : 24, flexWrap: 'wrap', flex: 1 }}>
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="התפלגות נכסים לפי סוג מוצר">
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--neutral-100)" strokeWidth={stroke} />
              {arcs.map((a) => {
                const isHover = hover === a.type
                return (
                  <circle
                    key={a.type}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={a.color}
                    strokeWidth={isHover ? stroke + hoverGrow : stroke}
                    strokeLinecap="butt"
                    strokeDasharray={`${a.dash} ${a.rest}`}
                    strokeDashoffset={-((a.rotation / 360) * circ)}
                    onMouseEnter={() => setHover(a.type)}
                    onMouseLeave={() => setHover((h) => (h === a.type ? null : h))}
                    style={{
                      cursor: clickable(a.type) ? 'pointer' : 'default',
                      opacity: hover && !isHover ? 0.72 : 1,
                      transition: 'stroke-width 140ms var(--ease-out), opacity 140ms var(--ease-out)',
                    }}
                    onClick={() => clickable(a.type) && onSelect!(a.type as ProductType)}
                  />
                )
              })}
            </g>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ fontSize: mobile ? 18 : 21, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {compact(total)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>סה״כ</div>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {arcs.map((a) => {
            const isClickable = clickable(a.type)
            const isHover = hover === a.type
            const hoverProps = {
              onMouseEnter: () => setHover(a.type),
              onMouseLeave: () => setHover((h) => (h === a.type ? null : h)),
            }
            const row = (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.label}</span>
                </span>
                <b style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{a.pct.toFixed(0)}%</b>
              </>
            )
            const style: React.CSSProperties = {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '7px 6px',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              border: 'none',
              textAlign: 'right',
              background: isHover ? 'var(--neutral-50)' : 'none',
              fontFamily: 'inherit',
              cursor: isClickable ? 'pointer' : 'default',
              transition: 'background 140ms var(--ease-out)',
            }
            return isClickable ? (
              <button key={a.type} style={style} {...hoverProps} onClick={() => onSelect!(a.type as ProductType)}>
                {row}
              </button>
            ) : (
              <div key={a.type} style={style} {...hoverProps}>
                {row}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )

  if (bare) {
    return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>{inner}</div>
  }
  return (
    <Card padding={mobile ? 18 : 22} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {inner}
    </Card>
  )
}

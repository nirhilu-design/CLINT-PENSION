import { useId, useState } from 'react'
import { Info } from 'lucide-react'
import type { HealthScore } from '../services/healthScoreService'

// Circular gauge + score for the portfolio health index (מדד בריאות התיק),
// with an "i" info affordance that reveals the full per-dimension breakdown on
// hover/focus — the score is never a black box.

const BAND_COLOR: Record<string, string> = {
  טוב: 'var(--teal-400, #2fd0b2)',
  בינוני: '#e6a209',
  'טעון טיפול': 'var(--color-danger, #e5334c)',
}

const R = 19
const C = 2 * Math.PI * R

export default function HealthMeter({ health }: { health: HealthScore }) {
  const [open, setOpen] = useState(false)
  const tipId = useId()
  const { score, band, openFindings, dimensions } = health
  const color = band ? BAND_COLOR[band] : 'rgba(255,255,255,0.4)'
  const frac = score !== null ? score / 100 : 0

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: 13,
      }}
    >
      {/* Ring */}
      <div style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
        <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
          <circle cx="23" cy="23" r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="4" />
          <circle
            cx="23"
            cy="23"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`}
            transform="rotate(-90 23 23)"
          />
        </svg>
        <span
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            fontSize: 14,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: '#fff',
          }}
        >
          {score ?? '—'}
        </span>
      </div>

      {/* Label */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)' }}>מדד בריאות התיק</span>
          <button
            type="button"
            aria-label="הסבר על מדד הבריאות"
            aria-describedby={open ? tipId : undefined}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 16,
              height: 16,
              padding: 0,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'help',
            }}
          >
            <Info size={13} />
          </button>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginTop: 2 }}>
          {band ? `${band} · ` : ''}
          {openFindings > 0 ? `${openFindings} נקודות פתוחות` : 'אין נקודות פתוחות'}
        </div>
      </div>

      {/* Tooltip */}
      {open && (
        <div
          id={tipId}
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            insetInlineStart: 0,
            width: 280,
            zIndex: 50,
            background: 'var(--color-bg-card, #fff)',
            color: 'var(--color-text-primary, #14213a)',
            border: '1px solid var(--color-border-base, #e3eae8)',
            borderRadius: 12,
            boxShadow: '0 12px 32px -10px rgba(0,0,0,0.4)',
            padding: 14,
            textAlign: 'right',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>מדד בריאות התיק</div>
          <p style={{ margin: '5px 0 10px', fontSize: 11.5, color: 'var(--color-text-secondary, #4a5a76)', lineHeight: 1.6 }}>
            ממוצע משוקלל של הממדים למטה (0–100). ממד ללא נתונים יורד מהחישוב והמשקלים מתאזנים מחדש.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {dimensions.map((d) => (
              <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5 }}>
                <span style={{ flex: 1, color: d.available ? 'var(--color-text-primary, #14213a)' : 'var(--color-text-tertiary, #8a8676)' }}>
                  {d.label}
                </span>
                <span style={{ color: 'var(--color-text-tertiary, #8a8676)', fontFamily: 'var(--font-mono)' }}>
                  {d.available ? `${d.weight}%` : 'לא זמין'}
                </span>
                <span
                  style={{
                    minWidth: 30,
                    textAlign: 'left',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: d.available ? 'var(--color-text-primary, #14213a)' : 'var(--color-text-tertiary, #8a8676)',
                  }}
                >
                  {d.available && d.score !== null ? d.score : '—'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--color-border-base, #e3eae8)', fontSize: 10.5, color: 'var(--color-text-tertiary, #8a8676)' }}>
            ניתן לכוונן את המשקלים באזור הלוגיקות.
          </div>
        </div>
      )}
    </div>
  )
}

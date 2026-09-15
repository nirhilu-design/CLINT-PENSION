import { useState } from 'react'
import type { Finding, FindingCategory } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { useApp } from '../hooks/useAppState'
import { useIsMobile } from '../hooks/useMediaQuery'
import {
  ShieldAlert,
  Percent,
  TrendingUp,
  CalendarClock,
  PiggyBank,
  HeartPulse,
  Info,
  AlertTriangle,
  ChevronDown,
  ArrowLeft,
  type LucideIcon,
} from 'lucide-react'

type Tone = { fg: string; bg: string; border: string }

function toneFor(f: Finding): Tone {
  if (f.severity === 'gap') return { fg: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: 'var(--color-danger)' }
  if (f.severity === 'attention') return { fg: 'var(--color-warning)', bg: 'var(--color-warning-bg)', border: 'var(--color-warning)' }
  return { fg: 'var(--clint-600)', bg: 'var(--clint-50)', border: 'var(--clint-500)' }
}

const CATEGORY_ICON: Record<FindingCategory, LucideIcon> = {
  retirement: CalendarClock,
  cost: Percent,
  investment: TrendingUp,
  deposits: PiggyBank,
  insurance: ShieldAlert,
  death: HeartPulse,
  dataQuality: Info,
  information: Info,
  insight: Info,
  limitation: AlertTriangle,
}

/**
 * "נקודות מרכזיות לטיפול" — the top actionable findings as compact cards with a
 * status color, a one-line reason, and an expandable "למה סומן?" panel that
 * shows the concrete basis (Explainability). Presentation only.
 */
export default function FindingHighlights({ findings, limit = 5 }: { findings: Finding[]; limit?: number }) {
  const mobile = useIsMobile()
  const top = findings.slice(0, limit)
  if (top.length === 0) return null
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 14px', flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>נקודות מרכזיות לטיפול</h2>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{findings.length} נקודות · לחיצה על "למה סומן?" לפירוט</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
        {top.map((f) => (
          <HighlightCard key={f.id} finding={f} />
        ))}
      </div>
    </section>
  )
}

function HighlightCard({ finding }: { finding: Finding }) {
  const { dispatch } = useApp()
  const [open, setOpen] = useState(false)
  const tone = toneFor(finding)
  const Icon = CATEGORY_ICON[finding.category] ?? AlertTriangle
  const reason = finding.basedOn ?? finding.description

  return (
    <div
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-base)',
        borderInlineStart: `4px solid ${tone.border}`,
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px' }}>
        <span style={{ width: 34, height: 34, borderRadius: '50%', background: tone.bg, color: tone.fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={17} aria-hidden />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{finding.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 3, lineHeight: 1.5 }}>{reason}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '0 16px 12px' }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: tone.fg, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
        >
          למה סומן?
          <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms var(--ease-out)' }} />
        </button>
        {(finding.productType || finding.policyId) && (
          <button
            onClick={() =>
              finding.policyId
                ? dispatch({ type: 'OPEN_POLICY', policyId: finding.policyId })
                : dispatch({ type: 'OPEN_PRODUCT', productType: finding.productType! })
            }
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--clint-600)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            {finding.policyId ? 'לפרטי הפוליסה' : `למסך ${finding.productType ? productTypeLabels[finding.productType] : ''}`}
            <ArrowLeft size={14} />
          </button>
        )}
      </div>

      {open && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-border-base)', background: 'var(--neutral-50)' }}>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{finding.description}</p>
          {finding.basedOn && (
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              <b style={{ color: 'var(--color-text-secondary)' }}>מבוסס על:</b> {finding.basedOn}
            </p>
          )}
          {finding.missingInfo && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--clint-700)' }}>
              <b>להשלמת הבדיקה:</b> {finding.missingInfo}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

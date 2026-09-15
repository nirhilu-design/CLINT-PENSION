import type { LucideIcon } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'
import { useIsMobile } from '../hooks/useMediaQuery'

export type KpiTone = 'good' | 'warn' | 'bad'

const TONE: Record<KpiTone, { bg: string; color: string; dot: string }> = {
  good: { bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)', dot: 'var(--color-success)' },
  warn: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', dot: 'var(--color-warning)' },
  bad: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)', dot: 'var(--color-danger)' },
}

export interface Kpi {
  key: string
  icon: LucideIcon
  /** Icon color + soft circular tint behind it (mockup uses colorful duotone icons). */
  accent?: string
  tint?: string
  label: string
  /** Numeric value to count up to; pair with `format`. Omit for a static string. */
  numeric?: number | null
  format?: (n: number) => string
  /** Static display value when `numeric` is not provided. */
  value?: string
  sub?: string
  status?: { label: string; tone: KpiTone }
  onClick?: () => void
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const Icon = kpi.icon
  const animated = useCountUp(kpi.numeric ?? null)
  const display =
    kpi.numeric != null && kpi.format
      ? kpi.format(animated ?? kpi.numeric)
      : (kpi.value ?? '—')
  const clickable = !!kpi.onClick

  return (
    <button
      type="button"
      onClick={kpi.onClick}
      disabled={!clickable}
      style={{
        textAlign: 'right',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: 16,
        cursor: clickable ? 'pointer' : 'default',
        fontFamily: 'inherit',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
        transition: 'transform 180ms var(--ease-out), box-shadow 180ms var(--ease-out)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
        <span style={{ width: 38, height: 38, borderRadius: '50%', background: kpi.tint ?? 'var(--clint-50)', display: 'grid', placeItems: 'center', color: kpi.accent ?? 'var(--clint-600)', flexShrink: 0 }}>
          <Icon size={19} aria-hidden />
        </span>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.01em' }}>{kpi.label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}>
        {display}
      </div>
      {/* Footer: target/sub on the right, status chip on the left (mockup layout) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2, minHeight: 20 }}>
        {kpi.sub ? <span style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{kpi.sub}</span> : <span />}
        {kpi.status && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: TONE[kpi.status.tone].bg, color: TONE[kpi.status.tone].color, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: TONE[kpi.status.tone].dot }} />
            {kpi.status.label}
          </span>
        )}
      </div>
    </button>
  )
}

/** Four primary KPIs. 4-up on desktop, 2-column grid on phones (per the brief). */
export default function KpiRow({ kpis }: { kpis: Kpi[] }) {
  const mobile = useIsMobile()
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(auto-fit,minmax(200px,1fr))',
        gap: mobile ? 12 : 16,
      }}
    >
      {kpis.map((k) => (
        <KpiCard key={k.key} kpi={k} />
      ))}
    </div>
  )
}

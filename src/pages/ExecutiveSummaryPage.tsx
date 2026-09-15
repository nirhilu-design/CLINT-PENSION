import { useApp } from '../hooks/useAppState'
import FindingCard from '../components/FindingCard'
import KpiRow, { type Kpi } from '../components/KpiRow'
import Card from '../components/ds/Card'
import { formatCurrency } from '../utils/format'
import { sortFindings } from '../engines/findingPriority'
import { useIsMobile } from '../hooks/useMediaQuery'
import type { Finding } from '../models/types'
import { Download, ArrowRight, PiggyBank, CalendarClock, AlertTriangle, Layers } from 'lucide-react'

const SEVERITY_GROUPS: { key: Finding['severity']; label: string; bg: string; color: string }[] = [
  { key: 'gap', label: 'פערים', bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' },
  { key: 'attention', label: 'לתשומת לב', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' },
  { key: 'info', label: 'מידע והקשר', bg: 'var(--cyan-50)', color: 'var(--cyan-600)' },
]

export default function ExecutiveSummaryPage() {
  const { state, dispatch } = useApp()
  const mobile = useIsMobile()
  const analysis = state.analysis!
  const { executiveSummary, client, policies, findings } = analysis

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPension = policies.reduce(
    (s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0),
    0,
  )
  const actionable = findings.filter((f) => f.severity !== 'info')
  const gapCount = actionable.filter((f) => f.severity === 'gap').length
  const productCount = new Set(policies.map((p) => p.productType)).size

  const kpis: Kpi[] = [
    { key: 'assets', icon: PiggyBank, accent: 'var(--color-success)', tint: 'var(--color-success-bg)', label: 'סך נכסים', numeric: totalAssets, format: formatCurrency },
    { key: 'pension', icon: CalendarClock, accent: 'var(--clint-600)', tint: 'var(--clint-50)', label: 'קצבה חודשית צפויה', numeric: totalPension, format: formatCurrency },
    {
      key: 'findings',
      icon: AlertTriangle,
      accent: gapCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
      tint: gapCount > 0 ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
      label: 'ממצאים לתשומת לב',
      value: String(actionable.length),
      sub: gapCount > 0 ? `${gapCount} פערים` : undefined,
    },
    { key: 'products', icon: Layers, accent: 'var(--cyan-600)', tint: 'var(--cyan-50)', label: 'מוצרים בתיק', value: String(productCount) },
  ]

  return (
    <>
      {/* Hero */}
      <div
        style={{
          background:
            'var(--hero-bg)',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: mobile ? '18px 16px 22px' : '26px 32px 32px' }}>
          <button
            onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            <ArrowRight size={14} color="rgba(255,255,255,0.7)" />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>חזרה לדשבורד</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: mobile ? 22 : 26, fontWeight: 800, letterSpacing: '-0.01em' }}>סיכום מנהלים</h1>
              <p style={{ margin: '6px 0 0', fontSize: mobile ? 12 : 13, color: 'rgba(255,255,255,0.65)' }}>
                {client.fullName} · ת.ז. {client.id} · {policies.length} פוליסות · הופק{' '}
                {new Date(analysis.createdAt).toLocaleDateString('he-IL')}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', backdropFilter: 'blur(6px)' }}
            >
              <Download size={15} />
              ייצוא PDF
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: mobile ? '16px 16px 40px' : '24px 32px 48px' }}>
        {/* Snapshot KPIs */}
        <div style={{ marginBottom: 24 }}>
          <KpiRow kpis={kpis} />
        </div>

        {/* Narrative */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>תמצית</div>
          {executiveSummary.strengths.length > 0 && (
            <ul style={{ margin: '0 0 12px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {executiveSummary.strengths.map((s, i) => (
                <li key={i} style={{ fontSize: 14, color: 'var(--color-text-secondary)', display: 'flex', gap: 8 }}>
                  <span style={{ color: 'var(--color-success)' }}>✓</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.6, borderTop: '1px solid var(--color-border-base)', paddingTop: 12 }}>
            הניתוח מציג נקודות לתשומת לב ופערים אפשריים על בסיס הנתונים שנטענו, ואינו מהווה המלצה לפעולה.
            כל נקודה מיועדת לבדיקה מול בעל רישיון.
          </p>
        </Card>

        {/* Findings grouped by severity */}
        {SEVERITY_GROUPS.map((g) => {
          const groupFindings = sortFindings(findings.filter((f) => f.severity === g.key))
          if (groupFindings.length === 0) return null
          return (
            <section key={g.key} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 'var(--radius-full)', background: g.bg, color: g.color }}>
                  {g.label}
                </span>
                <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{groupFindings.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {groupFindings.map((f) => (
                  <FindingCard key={f.id} finding={f} />
                ))}
              </div>
            </section>
          )
        })}

        {executiveSummary.limitations.length > 0 && (
          <section>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 12 }}>מגבלות הניתוח</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {executiveSummary.limitations.map((l, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', border: '1px solid var(--color-border-base)', padding: 12, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {l}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

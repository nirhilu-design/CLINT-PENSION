import { useApp } from '../hooks/useAppState'
import FindingCard from '../components/FindingCard'
import Card from '../components/ds/Card'
import { formatCurrency } from '../utils/format'
import { sortFindings } from '../engines/findingPriority'
import type { Finding } from '../models/types'
import { Download, ArrowRight } from 'lucide-react'

const SEVERITY_GROUPS: { key: Finding['severity']; label: string; bg: string; color: string }[] = [
  { key: 'gap', label: 'פערים', bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' },
  { key: 'attention', label: 'לתשומת לב', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' },
  { key: 'info', label: 'מידע והקשר', bg: 'var(--teal-50)', color: 'var(--teal-700)' },
]

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card padding={16}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', marginTop: 6 }}>
        {value}
      </div>
    </Card>
  )
}

export default function ExecutiveSummaryPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { executiveSummary, client, policies, findings } = analysis

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPension = policies.reduce(
    (s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0),
    0,
  )
  const actionable = findings.filter((f) => f.severity !== 'info')
  const productCount = new Set(policies.map((p) => p.productType)).size

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 32px 48px' }}>
      <button
        onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        <ArrowRight size={14} color="var(--color-text-tertiary)" />
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>חזרה לדשבורד</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>סיכום מנהלים</h1>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
            {client.fullName} · ת.ז. {client.id} · {policies.length} פוליסות · הופק{' '}
            {new Date(analysis.createdAt).toLocaleDateString('he-IL')}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--clint-600)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          <Download size={15} />
          ייצוא PDF
        </button>
      </div>

      {/* Snapshot strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
        <Kpi label="סך נכסים" value={formatCurrency(totalAssets)} />
        <Kpi label="קצבה חודשית צפויה" value={formatCurrency(totalPension)} />
        <Kpi label="ממצאים לתשומת לב" value={String(actionable.length)} />
        <Kpi label="מוצרים" value={String(productCount)} />
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
  )
}

import { TrendingUp } from 'lucide-react'
import Card, { CardHeader } from './ds/Card'
import { formatCurrency } from '../utils/format'

// Two stacked horizontal bars: "with deposits" (coral, full width) and
// "without deposits" (navy, proportional). Value label sits inside each bar.
function ScenarioBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: 3, background: color, display: 'inline-block' }} />
        {label}
      </div>
      <div style={{ position: 'relative', height: 14, borderRadius: 7, background: 'var(--neutral-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 7, background: color, width: `${pct}%` }} />
        <span
          style={{
            position: 'absolute',
            top: '50%',
            left: 10,
            transform: 'translateY(-50%)',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: pct > 12 ? '#fff' : 'var(--color-text-primary)',
          }}
        >
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  )
}

export default function PensionScenarioBar({
  withDeposits,
  withoutDeposits,
}: {
  withDeposits: number
  withoutDeposits: number
}) {
  const base = Math.max(0, withoutDeposits)
  const total = Math.max(base, withDeposits)
  if (total <= 0) return null

  return (
    <Card style={{ marginBottom: 24 }}>
      <CardHeader icon={<TrendingUp size={17} />} title="קצבה חודשית חזויה — הערך של המשך ההפקדות" tone="teal" />
      <p style={{ margin: '10px 0 0', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        הצבירה של היום שקולה לקצבה חודשית של{' '}
        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
          {formatCurrency(base)}
        </span>{' '}
        גם אם ההפקדות ייפסקו. המשך ההפקדות עד הפרישה מגדיל אותה ל-
        <span style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
          {formatCurrency(total)}
        </span>{' '}
        בחודש.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
        <ScenarioBar label="בהמשך הפקדות" value={total} total={total} color="var(--accent-coral)" />
        <ScenarioBar label="ללא המשך הפקדות" value={base} total={total} color="var(--accent-navy)" />
      </div>
    </Card>
  )
}

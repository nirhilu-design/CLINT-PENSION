import type { Policy, ProductType } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatCurrency } from '../utils/format'
import Card from './ds/Card'

// Fixed categorical hues (subset of the project's validated palette), assigned
// by product identity — never cycled.
const PRODUCT_COLORS: Record<ProductType, string> = {
  pension: '#2a78d6',
  managers: '#008300',
  gemel: '#1baf7a',
  gemelInvestment: '#4a3aa7',
  education: '#eda100',
  incomeProtection: '#e87ba4',
  life: '#eb6834',
  unknown: '#94a3b8',
}

export default function SalaryByProduct({ policies, statedSalary }: { policies: Policy[]; statedSalary: number | null }) {
  const active = policies.filter((p) => p.status === 'active' && (p.coveredSalary ?? 0) > 0)
  const typeCounts = active.reduce<Record<string, number>>((m, p) => ((m[p.productType] = (m[p.productType] ?? 0) + 1), m), {})

  const data = active
    .map((p) => {
      const label = productTypeLabels[p.productType]
      const company = p.managingCompany ?? ''
      return {
        name: typeCounts[p.productType] > 1 && company ? `${label} · ${company}` : label,
        value: p.coveredSalary as number,
        color: PRODUCT_COLORS[p.productType] ?? PRODUCT_COLORS.unknown,
      }
    })
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  const showRef = statedSalary != null && statedSalary > 0
  const max = Math.max(...data.map((d) => d.value), showRef ? statedSalary! : 0) * 1.02
  const refPct = showRef ? (statedSalary! / max) * 100 : 0

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>שכר מבוטח לפי מוצר</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 16 }}>
        השכר המבוטח המדווח בכל מוצר פעיל. מוצרים שונים עשויים לבטח את אותו שכר, ולכן הסכום אינו בהכרח השכר הכולל.
      </div>

      <div style={{ position: 'relative' }}>
        {/* One reference line across all bars, at the stated-salary position */}
        {showRef && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, right: `${refPct}%`, width: 0, borderInlineStart: '1.5px dashed var(--color-text-secondary)', zIndex: 2, pointerEvents: 'none' }} />
        )}

        {data.map((d) => (
          <div key={d.name} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{d.name}</span>
              <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(d.value)}</span>
            </div>
            <div style={{ height: 14, background: 'var(--neutral-100)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(d.value / max) * 100}%`, background: d.color, borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>
        ))}
      </div>

      {showRef && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
          <span style={{ width: 20, borderTop: '1.5px dashed var(--color-text-secondary)' }} />
          השכר שציינת · {formatCurrency(statedSalary!)}
        </div>
      )}
    </Card>
  )
}

import { BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ReferenceLine, ResponsiveContainer, LabelList } from 'recharts'
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

interface Row {
  name: string
  company: string
  value: number
  color: string
}

function Chip({ p, active }: { p: { name: string; company: string; value: number }; active?: boolean }) {
  if (!active) return null
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-base)', borderRadius: 'var(--radius-md)', padding: '8px 12px', boxShadow: 'var(--shadow-card)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{p.name}</div>
      {p.company && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{p.company}</div>}
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', marginTop: 2 }}>{formatCurrency(p.value)}</div>
    </div>
  )
}

export default function SalaryByProduct({ policies, statedSalary }: { policies: Policy[]; statedSalary: number | null }) {
  const active = policies.filter((p) => p.status === 'active' && (p.coveredSalary ?? 0) > 0)

  // Disambiguate repeated product types with the managing company.
  const typeCounts = active.reduce<Record<string, number>>((m, p) => ((m[p.productType] = (m[p.productType] ?? 0) + 1), m), {})
  const data: Row[] = active
    .map((p) => {
      const label = productTypeLabels[p.productType]
      const company = p.managingCompany ?? ''
      return {
        name: typeCounts[p.productType] > 1 && company ? `${label} · ${company}` : label,
        company,
        value: p.coveredSalary as number,
        color: PRODUCT_COLORS[p.productType] ?? PRODUCT_COLORS.unknown,
      }
    })
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) return null

  const maxVal = Math.max(...data.map((d) => d.value), statedSalary ?? 0)

  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>שכר מבוטח לפי מוצר</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginBottom: 12 }}>
        השכר המבוטח המדווח בכל מוצר פעיל. מוצרים שונים עשויים לבטח את אותו שכר, ולכן הסכום אינו בהכרח השכר הכולל.
      </div>
      <div style={{ width: '100%', height: Math.max(120, data.length * 46 + 24) }}>
        <ResponsiveContainer>
          <BarChart layout="vertical" data={data} margin={{ top: 4, right: 74, bottom: 4, left: 8 }}>
            <XAxis type="number" domain={[0, Math.ceil(maxVal * 1.1)]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip cursor={{ fill: 'var(--neutral-100)' }} content={({ active: a, payload }) => <Chip active={a} p={(payload?.[0]?.payload ?? {}) as Row} />} />
            {statedSalary != null && statedSalary > 0 && (
              <ReferenceLine
                x={statedSalary}
                stroke="var(--color-text-secondary)"
                strokeDasharray="4 4"
                label={{ value: `השכר שציינת · ${formatCurrency(statedSalary)}`, position: 'top', fontSize: 11, fill: 'var(--color-text-secondary)' }}
              />
            )}
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22} isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList dataKey="value" position="right" formatter={(v: number) => formatCurrency(v)} style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fill: 'var(--color-text-primary)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

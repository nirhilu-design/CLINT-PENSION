import { useMemo } from 'react'
import type { Policy, ProductType } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { formatCurrency } from '../utils/format'
import Card from './ds/Card'

// Palette matching the design handoff (navy / red / sand family).
const PALETTE = ['#00215D', '#FF2756', '#E2D1BF', '#3D5389', '#FF6B85', '#C9B49C']

const PRODUCT_ORDER: ProductType[] = [
  'pension',
  'managers',
  'gemel',
  'gemelInvestment',
  'education',
  'life',
  'incomeProtection',
  'unknown',
]

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180
  return { x: +(cx + r * Math.cos(a)).toFixed(2), y: +(cy + r * Math.sin(a)).toFixed(2) }
}

interface DonutSlice {
  name: string
  color: string
  d: string
  value: number
  pctLabel: number
}

function buildSlices(items: { name: string; value: number; color: string }[], size: number, thick: number): DonutSlice[] {
  const cx = size / 2
  const cy = size / 2
  const r = (size - thick) / 2
  const total = items.reduce((s, i) => s + i.value, 0)
  let angle = 0
  return items.map((it) => {
    const pct = total > 0 ? it.value / total : 0
    const sweep = Math.max(pct * 360 - 3, 0)
    const st = polar(cx, cy, r, angle)
    const en = polar(cx, cy, r, angle + sweep)
    const d = `M${st.x} ${st.y} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${en.x} ${en.y}`
    angle += pct * 360
    return { name: it.name, color: it.color, d, value: it.value, pctLabel: Math.round(pct * 100) }
  })
}

// Month "yyyy-mm" -> "mm/yyyy"
function formatMonth(month: string): string {
  const [y, m] = month.split('-')
  return y && m ? `${m}/${y}` : month
}

interface DepositRow {
  month: string
  product: string
  company: string
  amount: number
}

export default function PremiumAndDeposits({ policies }: { policies: Policy[] }) {
  // Recent deposits — flatten monthly deposits across the portfolio, newest first.
  const depositRows = useMemo<DepositRow[]>(() => {
    const rows: DepositRow[] = []
    for (const p of policies) {
      const product = productTypeLabels[p.productType]
      const company = p.managingCompany ?? '—'
      if (p.monthlyDeposits.length > 0) {
        for (const md of p.monthlyDeposits) {
          rows.push({ month: md.month, product, company, amount: md.total })
        }
      } else if (p.lastDepositMonth && p.lastDepositTotal !== null) {
        rows.push({ month: p.lastDepositMonth, product, company, amount: p.lastDepositTotal })
      }
    }
    return rows.sort((a, b) => b.month.localeCompare(a.month)).slice(0, 5)
  }, [policies])

  // Premium split — the most recent monthly premium per product.
  const premiumSlices = useMemo(() => {
    const byProduct = new Map<ProductType, number>()
    for (const p of policies) {
      const premium =
        p.lastDepositTotal ?? (p.monthlyDeposits.length ? p.monthlyDeposits[p.monthlyDeposits.length - 1].total : 0)
      if (premium && premium > 0) {
        byProduct.set(p.productType, (byProduct.get(p.productType) ?? 0) + premium)
      }
    }
    const items = PRODUCT_ORDER.filter((t) => (byProduct.get(t) ?? 0) > 0).map((t, i) => ({
      name: productTypeLabels[t],
      value: byProduct.get(t)!,
      color: PALETTE[i % PALETTE.length],
    }))
    return buildSlices(items, 130, 22)
  }, [policies])

  const premiumTotal = premiumSlices.reduce((s, p) => s + p.value, 0)

  if (depositRows.length === 0 && premiumSlices.length === 0) return null

  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
        {/* Recent deposits */}
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            פירוט הפקדות אחרון
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            {depositRows.length} ההפקדות האחרונות שנקלטו בתיק
          </p>
          {depositRows.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>לא דווחו הפקדות בתיק</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {depositRows.map((d, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '90px minmax(0,1fr) auto',
                    gap: 12,
                    alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: '1px solid var(--color-border-base)',
                  }}
                >
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-tertiary)' }}>
                    {formatMonth(d.month)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {d.product}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{d.company}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-primary)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatCurrency(d.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Premium split */}
        <Card>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            פילוח פרמיה כללית
          </div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            מתוך ההפקדה החודשית הכוללת
          </p>
          {premiumSlices.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>לא זוהתה פרמיה חודשית</p>
          ) : (
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
                <svg width="130" height="130" viewBox="0 0 130 130">
                  {premiumSlices.map((s, i) => (
                    <path key={i} d={s.d} fill="none" stroke={s.color} strokeWidth={22} strokeLinecap="round" />
                  ))}
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>לחודש</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                    {formatCurrency(premiumTotal)}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                {premiumSlices.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-text-secondary)', minWidth: 0 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                    </span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', flexShrink: 0 }}>
                      {s.pctLabel}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </section>
  )
}

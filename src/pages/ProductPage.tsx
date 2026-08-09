import { useEffect, useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { coverageTypeLabels, productTypeLabels } from '../models/labels'
import type { Policy, ProductType } from '../models/types'
import { formatCurrency, formatPercent } from '../utils/format'
import ProductFindingCategories from '../components/ProductFindingCategories'
import Card from '../components/ds/Card'
import { isEducationFundLiquid } from '../utils/liquidity'
import {
  ArrowRight,
  ChevronLeft,
  Landmark,
  Briefcase,
  Wallet,
  TrendingUp,
  GraduationCap,
  HeartPulse,
  Umbrella,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react'

const productMeta: Record<ProductType, { icon: LucideIcon; grad: string }> = {
  pension: { icon: Landmark, grad: 'linear-gradient(135deg,var(--clint-600),var(--clint-800))' },
  managers: { icon: Briefcase, grad: 'linear-gradient(135deg,#4a3aa7,#372c7d)' },
  gemel: { icon: Wallet, grad: 'linear-gradient(135deg,var(--teal-600),#0b6f63)' },
  gemelInvestment: { icon: TrendingUp, grad: 'linear-gradient(135deg,#1baf7a,#12805a)' },
  education: { icon: GraduationCap, grad: 'linear-gradient(135deg,#eda100,#c07f00)' },
  life: { icon: HeartPulse, grad: 'linear-gradient(135deg,#e87ba4,#c25579)' },
  incomeProtection: { icon: Umbrella, grad: 'linear-gradient(135deg,#eb6834,#bf4d20)' },
  unknown: { icon: HelpCircle, grad: 'linear-gradient(135deg,var(--neutral-400),var(--neutral-500))' },
}

const CHANNEL_COLORS = ['var(--accent-navy)', 'var(--accent-coral)', 'var(--teal-500)', 'var(--accent-beige)', 'var(--clint-500)', 'var(--amber-400)']

type PolicyStatus = { label: string; bg: string; color: string; dot: string }
function policyStatus(p: Policy): PolicyStatus {
  if (p.temporaryRisk)
    return { label: 'ריסק זמני', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', dot: 'var(--color-warning)' }
  if (p.status === 'active')
    return { label: 'פעיל', bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)', dot: 'var(--color-success)' }
  return { label: 'לא פעיל', bg: 'var(--neutral-100)', color: 'var(--neutral-600)', dot: 'var(--neutral-400)' }
}

function specRows(productType: ProductType, policies: Policy[]): { label: string; value: string }[] {
  const total = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const withDep = policies.reduce((s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0), 0)
  const woDep = policies.reduce((s, p) => s + (p.expectedPensionWithoutDeposits ?? 0), 0)
  const feeVals = policies.map((p) => p.fees.fromAccumulation).filter((v): v is number => v !== null)
  const avgFee = feeVals.length ? feeVals.reduce((a, b) => a + b, 0) / feeVals.length : null
  const rows: { label: string; value: string }[] = [{ label: 'צבירה', value: formatCurrency(total) }]
  switch (productType) {
    case 'pension':
    case 'managers':
      rows.push({ label: 'קצבה בהמשך הפקדות', value: formatCurrency(withDep) })
      if (woDep > 0) rows.push({ label: 'קצבה ללא הפקדות', value: formatCurrency(woDep) })
      if (productType === 'managers')
        rows.push({ label: 'מקדם מובטח', value: policies.some((p) => p.hasGuaranteedFactor) ? 'קיים' : 'לא קיים' })
      rows.push({ label: 'דמי ניהול מצבירה', value: formatPercent(avgFee) })
      break
    case 'education': {
      const liquid = policies.filter((p) => isEducationFundLiquid(p) === true).reduce((s, p) => s + (p.currentValue ?? 0), 0)
      rows.push({ label: 'סכום נזיל', value: formatCurrency(liquid) })
      rows.push({ label: 'סכום לא נזיל', value: formatCurrency(total - liquid) })
      rows.push({ label: 'דמי ניהול מצבירה', value: formatPercent(avgFee) })
      break
    }
    case 'life': {
      const deathCovers = policies.flatMap((p) => p.coverages).filter((c) => c.type === 'death')
      rows.push({ label: 'כיסוי למקרה מוות', value: formatCurrency(deathCovers.reduce((s, c) => s + (c.amount ?? 0), 0)) })
      rows.push({ label: 'פרמיה חודשית', value: formatCurrency(deathCovers.reduce((s, c) => s + (c.cost ?? 0), 0)) })
      break
    }
    case 'incomeProtection': {
      const covers = policies.flatMap((p) => p.coverages).filter((c) => c.type === 'disability')
      rows.push({ label: 'פיצוי חודשי', value: formatCurrency(covers.reduce((s, c) => s + (c.amount ?? 0), 0)) })
      rows.push({ label: 'שיעור כיסוי', value: covers.length ? formatPercent(Math.max(...covers.map((c) => c.percent ?? 0)), 0) : '—' })
      break
    }
    default:
      rows.push({ label: 'מספר חשבונות', value: String(policies.length) })
      rows.push({ label: 'דמי ניהול מצבירה', value: formatPercent(avgFee) })
  }
  rows.push({ label: 'מספר פוליסות', value: String(policies.length) })
  return rows
}

export default function ProductPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const productType = state.selectedProduct!
  const policies = analysis.policies.filter((p) => p.productType === productType)
  const coverages = policies.flatMap((p) => p.coverages.map((c) => ({ ...c, policyNumber: p.policyNumber })))
  const productFindings = analysis.findings.filter(
    (f) => f.productType === productType || policies.some((p) => p.policyNumber === f.policyNumber),
  )
  const activeCount = policies.filter((p) => p.status === 'active').length

  const [tab, setTab] = useState<'overview' | 'policies' | 'returns'>('overview')
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1100)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const meta = productMeta[productType]
  const Icon = meta.icon

  // Investment-channel split across all policies of this product
  const channelMap = new Map<string, number>()
  for (const p of policies) for (const t of p.investmentTracks) if (t.value) channelMap.set(t.name ?? 'מסלול', (channelMap.get(t.name ?? 'מסלול') ?? 0) + t.value)
  const channelTotal = [...channelMap.values()].reduce((a, b) => a + b, 0)
  const channels = [...channelMap.entries()]
    .map(([name, value], i) => ({ name, pct: channelTotal ? (value / channelTotal) * 100 : 0, color: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }))
    .sort((a, b) => b.pct - a.pct)

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'overview', label: 'סקירה' },
    { id: 'policies', label: `פוליסות · ${policies.length}` },
    { id: 'returns', label: 'תשואות' },
  ]

  const PolicyRow = ({ p, compact }: { p: Policy; compact?: boolean }) => {
    const st = policyStatus(p)
    return (
      <button
        onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: p.policyNumber })}
        style={{
          cursor: 'pointer',
          textAlign: 'right',
          width: '100%',
          borderRadius: compact ? 'var(--radius-md)' : 'var(--radius-lg)',
          background: compact ? 'var(--neutral-50)' : 'var(--color-bg-card)',
          boxShadow: compact ? 'none' : 'var(--shadow-card)',
          border: compact ? 'none' : '1px solid var(--color-border-base)',
          padding: compact ? '12px 14px' : '16px 18px',
          display: 'grid',
          gridTemplateColumns: '40px minmax(0,1fr) auto auto 16px',
          gap: 12,
          alignItems: 'center',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={19} color="var(--clint-600)" />
        </span>
        <div style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {p.managingCompany ?? p.productName ?? 'גוף לא דווח'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            פוליסה {p.policyNumber} · הפקדה אחרונה {p.lastDepositMonth ?? '—'}
          </div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
          {st.label}
        </span>
        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
          {formatCurrency(p.currentValue)}
        </div>
        <ChevronLeft size={16} color="var(--color-text-tertiary)" />
      </button>
    )
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 32px 48px' }}>
      {/* Breadcrumb */}
      <button
        onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        <ArrowRight size={14} color="var(--color-text-tertiary)" />
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>חזרה לדשבורד</span>
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 52, height: 52, borderRadius: 'var(--radius-lg)', background: meta.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
            <Icon size={24} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
              {productTypeLabels[productType]}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
              {policies.length} פוליסות · {analysis.client.fullName}
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            background: activeCount > 0 ? 'var(--color-success-bg)' : 'var(--neutral-100)',
            color: activeCount > 0 ? 'var(--color-success-dark)' : 'var(--neutral-600)',
          }}
        >
          {activeCount > 0 ? `${activeCount} פעילות` : 'ללא פוליסות פעילות'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: narrow ? 'minmax(0,1fr)' : 'minmax(0,1fr) minmax(240px,300px)', gap: 20, alignItems: 'start' }}>
        {/* Content column */}
        <div style={{ minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border-base)', marginBottom: 22 }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: '10px 14px',
                  fontSize: 14,
                  fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? 'var(--clint-700)' : 'var(--color-text-secondary)',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${tab === t.id ? 'var(--clint-600)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>פוליסות בקרן זו</div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{policies.length} פוליסות · לחצו לפירוט</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {policies.map((p) => (
                    <PolicyRow key={p.policyNumber} p={p} compact />
                  ))}
                </div>
              </Card>

              {channels.length > 0 && (
                <Card>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 14 }}>מסלול השקעה — פילוח אפיקים</div>
                  <div style={{ display: 'flex', height: 22, width: '100%', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
                    {channels.map((ch) => (
                      <div key={ch.name} style={{ height: '100%', width: `${ch.pct}%`, background: ch.color }} />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12 }}>
                    {channels.map((ch) => (
                      <span key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: ch.color, display: 'inline-block' }} />
                        {ch.name} <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{ch.pct.toFixed(0)}%</b>
                      </span>
                    ))}
                  </div>
                </Card>
              )}

              <Card>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>ממצאים במוצר זה</div>
                {productFindings.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>אין ממצאים למוצר זה</p>
                ) : (
                  <ProductFindingCategories findings={productFindings} />
                )}
              </Card>
            </div>
          )}

          {tab === 'policies' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {policies.map((p) => (
                <PolicyRow key={p.policyNumber} p={p} />
              ))}
            </div>
          )}

          {tab === 'returns' && <ReturnsTab policies={policies} funds={analysis.supplementary.treasuryFunds} />}
        </div>

        {/* Right rail */}
        <div style={{ position: narrow ? 'static' : 'sticky', top: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>נתוני מוצר</div>
            {specRows(productType, policies).map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '9px 0', borderBottom: '1px solid var(--color-border-base)' }}>
                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </Card>
          {coverages.length > 0 && (
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 12 }}>כיסויים ביטוחיים</div>
              {coverages.map((c, i) => (
                <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-border-base)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{coverageTypeLabels[c.type]}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(c.amount)}</span>
                  </div>
                  {c.cost !== null && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>עלות חודשית: {formatCurrency(c.cost)}</div>
                  )}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ReturnsTab({ policies, funds }: { policies: Policy[]; funds: { mofid: string; return12m: number | null; sharpe: number | null }[] }) {
  const rows = policies
    .map((p) => {
      const fund = p.mofid ? funds.find((f) => f.mofid === p.mofid) : undefined
      return { company: p.managingCompany ?? p.policyNumber, reported: p.netReturn, treasury: fund?.return12m ?? null, sharpe: fund?.sharpe ?? null }
    })
    .filter((r) => r.reported !== null || r.treasury !== null)
  const max = Math.max(10, ...rows.flatMap((r) => [r.reported ?? 0, r.treasury ?? 0])) * 1.1

  return (
    <Card>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 18 }}>תשואה מדווחת מול אוצר</div>
      {rows.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>אין נתוני תשואה להצגה</p>
      ) : (
        rows.map((r, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>{r.company}</div>
            <ReturnBar label="מדווחת" value={r.reported} max={max} color="var(--clint-600)" strong />
            <div style={{ height: 6 }} />
            <ReturnBar label="אוצר" value={r.treasury} max={max} color="var(--neutral-400)" />
            {r.sharpe !== null && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                שארפ: <b style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{r.sharpe.toFixed(2)}</b>
              </div>
            )}
          </div>
        ))
      )}
    </Card>
  )
}

function ReturnBar({ label, value, max, color, strong }: { label: string; value: number | null; max: number; color: string; strong?: boolean }) {
  const pct = value !== null ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(0,1fr) auto', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{label}</span>
      <div style={{ height: 12, borderRadius: 6, background: 'var(--neutral-100)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 6, background: color, width: `${pct}%` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: strong ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
        {value !== null ? formatPercent(value) : '—'}
      </span>
    </div>
  )
}

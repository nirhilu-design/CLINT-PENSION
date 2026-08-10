import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import { formatCurrency, formatDate } from '../utils/format'
import PieChartCard from '../components/PieChartCard'
import ProductFindingGroups from '../components/ProductFindingGroups'
import PremiumAndDeposits from '../components/PremiumAndDeposits'
import ReturnsTable from '../components/ReturnsTable'
import PensionScenarioBar from '../components/PensionScenarioBar'
import ExposureAnalysis from '../components/ExposureAnalysis'
import Card, { CardHeader } from '../components/ds/Card'
import { computeExposure } from '../services/exposureService'
import { sortFindings } from '../engines/findingPriority'
import { assessCompleteness } from '../services/completenessService'
import { useEffect, useState } from 'react'
import SliceDrawer, { type SliceSelection } from '../components/SliceDrawer'
import {
  Landmark,
  Briefcase,
  Wallet,
  TrendingUp,
  GraduationCap,
  HeartPulse,
  Umbrella,
  HelpCircle,
  User,
  type LucideIcon,
} from 'lucide-react'

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education', 'life', 'incomeProtection']

const productMeta: Record<ProductType, { icon: LucideIcon; grad: string }> = {
  pension: { icon: Landmark, grad: 'linear-gradient(135deg,var(--clint-600),var(--clint-700))' },
  managers: { icon: Briefcase, grad: 'linear-gradient(135deg,#4a3aa7,#372c7d)' },
  gemel: { icon: Wallet, grad: 'linear-gradient(135deg,var(--teal-600),#0b6f63)' },
  gemelInvestment: { icon: TrendingUp, grad: 'linear-gradient(135deg,#1baf7a,#12805a)' },
  education: { icon: GraduationCap, grad: 'linear-gradient(135deg,#eda100,#c07f00)' },
  life: { icon: HeartPulse, grad: 'linear-gradient(135deg,#e87ba4,#c25579)' },
  incomeProtection: { icon: Umbrella, grad: 'linear-gradient(135deg,#eb6834,#bf4d20)' },
  unknown: { icon: HelpCircle, grad: 'linear-gradient(135deg,var(--neutral-400),var(--neutral-500))' },
}

const employmentLabels: Record<string, string> = {
  employee: 'שכיר/ה',
  selfEmployed: 'עצמאי/ת',
  both: 'שכיר/ה + עצמאי/ת',
  notWorking: 'לא עובד/ת כיום',
}

function ageFrom(birthISO: string | null): string {
  if (!birthISO) return '—'
  const b = new Date(birthISO)
  if (isNaN(b.getTime())) return '—'
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  if (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())) age--
  return String(age)
}

function HeroKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.12)',
        backdropFilter: 'blur(10px)',
        padding: 16,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.03em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em', marginTop: 6, color: '#fff' }}>
        {value}
      </div>
      {sub && <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{sub}</div>}
    </div>
  )
}

function SnapshotTile({ label, value, sub, ok }: { label: string; value: string; sub: string; ok: boolean }) {
  return (
    <Card padding={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--teal-500)' : 'var(--neutral-300)' }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-tertiary)' }}>{label}</span>
      </div>
      <div style={{ marginTop: 4, fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ok ? 'var(--color-text-primary)' : 'var(--neutral-400)' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>{sub}</div>
    </Card>
  )
}

export default function DashboardPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { policies, findings, client } = analysis
  const supp = analysis.supplementary

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPensionWithDeposits = policies.reduce(
    (s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0),
    0,
  )
  const totalPensionWithoutDeposits = policies.reduce((s, p) => s + (p.expectedPensionWithoutDeposits ?? 0), 0)
  const productTypes = new Set(policies.map((p) => p.productType))

  const byProduct = PRODUCT_ORDER.filter((t) => productTypes.has(t))
    .map((t) => ({
      name: productTypeLabels[t],
      key: t,
      value: policies.filter((p) => p.productType === t).reduce((s, p) => s + (p.currentValue ?? 0), 0),
    }))
    .filter((d) => d.value > 0)

  const byCompany = [...new Set(policies.map((p) => p.managingCompany).filter(Boolean))]
    .map((c) => ({
      name: c!,
      key: c!,
      value: policies.filter((p) => p.managingCompany === c).reduce((s, p) => s + (p.currentValue ?? 0), 0),
    }))
    .filter((d) => d.value > 0)

  const [slice, setSlice] = useState<SliceSelection | null>(null)
  const [compact, setCompact] = useState(false)

  // Sticky compact KPI bar once the main area is scrolled past the hero
  useEffect(() => {
    const main = document.querySelector('[data-app-main]')
    if (!main) return
    const onScroll = () => setCompact(main.scrollTop > 220)
    main.addEventListener('scroll', onScroll)
    return () => main.removeEventListener('scroll', onScroll)
  }, [])

  const actionable = sortFindings(findings.filter((f) => f.severity !== 'info'))
  const gapCount = actionable.filter((f) => f.severity === 'gap').length
  const attentionCount = actionable.filter((f) => f.severity === 'attention').length
  const completeness = assessCompleteness(analysis)

  const activePolicies = policies.filter((p) => p.status === 'active')
  const ipPercents = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'disability'))
    .map((c) => c.percent)
    .filter((v): v is number => v !== null)
  const survivorsMonthly = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'survivors'))
    .reduce((s, c) => s + (c.amount ?? 0), 0)
  const deathLump = activePolicies
    .flatMap((p) => p.coverages.filter((c) => c.type === 'death'))
    .reduce((s, c) => s + (c.amount ?? 0), 0)
  const lastDeposit = policies.map((p) => p.lastDepositMonth).filter(Boolean).sort().pop() as string | undefined

  const reportDates = policies.map((p) => p.reportDate).filter(Boolean) as string[]
  const asOf = reportDates.length ? formatDate(reportDates.sort()[reportDates.length - 1]) : 'לא דווח'
  const retirementAge = Math.max(0, ...policies.map((p) => p.retirementAge ?? 0)) || null

  const heroKpis = [
    { label: 'סך נכסים', value: formatCurrency(totalAssets) },
    { label: 'קצבה חודשית צפויה', value: formatCurrency(totalPensionWithDeposits), sub: 'בהמשך הפקדות' },
    { label: 'קצבה ללא הפקדות', value: formatCurrency(totalPensionWithoutDeposits), sub: 'ללא המשך הפקדות' },
    { label: 'מוצרים · פוליסות', value: `${productTypes.size} · ${policies.length}` },
    {
      label: 'ממצאים לתשומת לב',
      value: String(actionable.length),
      sub:
        actionable.length > 0
          ? [gapCount > 0 ? `${gapCount} פערים` : '', attentionCount > 0 ? `${attentionCount} לבדיקה` : ''].filter(Boolean).join(' · ')
          : completeness.complete
            ? 'לא נמצאו ממצאים'
            : 'הבדיקה חלקית',
    },
  ]

  const familyStatus =
    supp.hasSpouse === true || supp.hasChildrenUnder21 === true
      ? [supp.hasSpouse === true ? 'בן/בת זוג' : '', supp.hasChildrenUnder21 === true ? 'ילדים <21' : ''].filter(Boolean).join(' · ')
      : supp.hasSpouse === false && supp.hasChildrenUnder21 === false
        ? 'ללא תלויים'
        : '—'

  const clientDetails: { label: string; value: string }[] = [
    { label: 'תעודת זהות', value: client.id || '—' },
    { label: 'תאריך לידה', value: client.birthDate ? `${formatDate(client.birthDate)} · גיל ${ageFrom(client.birthDate)}` : '—' },
    { label: 'טלפון', value: client.phone || '—' },
    { label: 'דוא״ל', value: client.email || '—' },
    { label: 'סטטוס משפחתי', value: familyStatus },
    { label: 'תעסוקה', value: supp.employmentStatus ? employmentLabels[supp.employmentStatus] : '—' },
    { label: 'גיל פרישה יעד', value: retirementAge ? String(retirementAge) : '—' },
    { label: 'נכונות הנתונים', value: asOf },
  ]

  return (
    <>
      {/* Sticky compact bar */}
      {compact && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'var(--clint-950)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{client.fullName}</span>
          {heroKpis.map((k) => (
            <div key={k.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#fff' }}>{k.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hero */}
      <div
        style={{
          background:
            'radial-gradient(700px circle at 12% 15%, rgba(10,175,150,0.32), transparent 60%),radial-gradient(550px circle at 88% 25%, rgba(245,158,11,0.16), transparent 55%),linear-gradient(120deg,var(--clint-950),var(--clint-800) 55%,var(--clint-700))',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '36px 32px 40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
                התיק הפנסיוני של {client.fullName}
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
                תמונת מצב מרוכזת מ-{policies.length} פוליסות · הנתונים נכונים ל-{asOf}
              </p>
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.75)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              מנוע ניתוח
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginTop: 28 }}>
            {heroKpis.map((k) => (
              <HeroKpi key={k.label} label={k.label} value={k.value} sub={k.sub} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 32px 48px' }}>
        {/* Client details */}
        <Card style={{ marginBottom: 24 }}>
          <CardHeader icon={<User size={17} />} title="פרטי לקוח" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16 }}>
            {clientDetails.map((d) => (
              <div key={d.label}>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{d.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 3 }}>{d.value}</div>
              </div>
            ))}
          </div>
        </Card>

        {(totalPensionWithDeposits > 0 || totalPensionWithoutDeposits > 0) && (
          <PensionScenarioBar withDeposits={totalPensionWithDeposits} withoutDeposits={totalPensionWithoutDeposits} />
        )}

        <PremiumAndDeposits policies={policies} />

        <ExposureAnalysis exposure={computeExposure(policies, supp.treasuryAllocations)} />

        {/* Findings grouped by product */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
              הארות לפי מוצר
            </h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              בחרו מוצר לצפייה בהארות שלו · המלא בסיכום המנהלים
            </span>
          </div>
          {findings.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)' }}>
              {completeness.complete ? 'לא נמצאו ממצאים הדורשים בדיקה' : 'לא עלו ממצאים — אך הבדיקה חלקית בשל מידע חסר (פירוט למטה).'}
            </p>
          ) : (
            <Card>
              <ProductFindingGroups findings={findings} policies={policies} />
            </Card>
          )}
          {!completeness.complete && (
            <Card padding={16} style={{ marginTop: 16, background: 'var(--neutral-50)' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>שלמות הנתונים</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {completeness.missing.map((m, i) => (
                  <li key={i} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--neutral-300)' }}>•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {/* Coverage snapshot */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
            כיסויים והפקדות במבט מהיר
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
            <SnapshotTile
              label="אובדן כושר עבודה"
              value={ipPercents.length > 0 ? `${Math.max(...ipPercents).toFixed(0)}%` : 'לא נמצא'}
              sub={ipPercents.length > 0 ? 'שיעור הכיסוי הגבוה בתיק' : 'לא אותר כיסוי'}
              ok={ipPercents.length > 0}
            />
            <SnapshotTile
              label="קצבת שאירים"
              value={survivorsMonthly > 0 ? formatCurrency(survivorsMonthly) : 'לא נמצא'}
              sub={survivorsMonthly > 0 ? 'לחודש, מקרן הפנסיה' : 'לא אותר כיסוי שאירים'}
              ok={survivorsMonthly > 0}
            />
            <SnapshotTile
              label="ביטוח חיים"
              value={deathLump > 0 ? formatCurrency(deathLump) : 'לא נמצא'}
              sub={deathLump > 0 ? 'סכום חד-פעמי למקרה מוות' : 'לא אותר ביטוח למקרה מוות'}
              ok={deathLump > 0}
            />
            <SnapshotTile
              label="הפקדה אחרונה"
              value={lastDeposit ?? 'לא דווח'}
              sub={lastDeposit ? 'החודש האחרון שנקלט בתיק' : 'לא דווחו הפקדות'}
              ok={!!lastDeposit}
            />
          </div>
        </section>

        {/* Distribution */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16, marginBottom: 24 }}>
          <PieChartCard title="פיזור לפי סוג מוצר" data={byProduct} onSliceClick={(key) => setSlice({ kind: 'product', key })} />
          <PieChartCard title="פיזור לפי חברה מנהלת" data={byCompany} onSliceClick={(key) => setSlice({ kind: 'company', key })} />
        </div>

        {slice && (
          <SliceDrawer selection={slice} policies={policies} portfolioTotal={totalAssets} onClose={() => setSlice(null)} />
        )}

        {/* Returns */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>תשואות</h2>
          <ReturnsTable policies={policies} treasuryFunds={supp.treasuryFunds} />
        </section>

        {/* Products */}
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>מוצרים</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            {PRODUCT_ORDER.map((t) => {
              const productPolicies = policies.filter((p) => p.productType === t)
              const value = productPolicies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
              const has = productPolicies.length > 0
              const meta = productMeta[t]
              const Icon = meta.icon
              return (
                <button
                  key={t}
                  disabled={!has}
                  onClick={() => dispatch({ type: 'OPEN_PRODUCT', productType: t })}
                  style={{
                    textAlign: 'right',
                    background: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border-base)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-card)',
                    padding: 16,
                    cursor: has ? 'pointer' : 'default',
                    opacity: has ? 1 : 0.5,
                    fontFamily: 'inherit',
                    transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 'var(--radius-md)',
                        display: 'grid',
                        placeItems: 'center',
                        background: meta.grad,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {productTypeLabels[t]}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        {has ? `${productPolicies.length} פוליסות` : 'אין מוצר מסוג זה'}
                      </div>
                    </div>
                  </div>
                  {has && (
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                        {formatCurrency(value)}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--clint-600)' }}>לפירוט ←</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}

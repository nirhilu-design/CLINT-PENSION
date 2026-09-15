import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { Policy, ProductType } from '../models/types'
import { formatCurrency, formatDate } from '../utils/format'
import ContextBar from '../components/ContextBar'
import KpiRow, { type Kpi } from '../components/KpiRow'
import RetirementProjection from '../components/RetirementProjection'
import AssetDonut, { type AssetSlice } from '../components/AssetDonut'
import CompanyLogo from '../components/CompanyLogo'
import FindingHighlights from '../components/FindingHighlights'
import Card from '../components/ds/Card'
import { computeExposure } from '../services/exposureService'
import { useIsMobile } from '../hooks/useMediaQuery'
import { sortFindings } from '../engines/findingPriority'
import { assessCompleteness } from '../services/completenessService'
import { effectiveSalary } from '../engines/engineTypes'
import { PENSION_TO_SALARY_MIN_RATIO } from '../config/thresholds'
import { useEffect, useState } from 'react'
import {
  User,
  ChevronDown,
  PiggyBank,
  CalendarClock,
  ShieldCheck,
  BarChart3,
  Bell,
} from 'lucide-react'

/** Smooth-scroll the "נקודות מרכזיות לטיפול" section into view. */
function scrollToFindings() {
  document.getElementById('key-findings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PRODUCT_ORDER: ProductType[] = ['pension', 'managers', 'gemel', 'gemelInvestment', 'education', 'life', 'incomeProtection']

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

type HeroMeter = { fill: number; target?: number; color: string }

type Status = 'good' | 'warn' | 'bad'

const STATUS_META: Record<Status, { label: string; bg: string; color: string; fill: string }> = {
  good: { label: 'קיים', bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)', fill: 'var(--color-success)' },
  warn: { label: 'חלקי', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', fill: 'var(--color-warning)' },
  bad: { label: 'פער', bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)', fill: 'var(--color-danger)' },
}

export default function DashboardPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { policies, findings, client } = analysis
  const supp = analysis.supplementary
  const mobile = useIsMobile()

  const totalAssets = policies.reduce((s, p) => s + (p.currentValue ?? 0), 0)
  const totalPensionWithDeposits = policies.reduce(
    (s, p) => s + (p.expectedPensionWithDeposits ?? p.expectedPensionWithoutDeposits ?? 0),
    0,
  )
  const totalPensionWithoutDeposits = policies.reduce((s, p) => s + (p.expectedPensionWithoutDeposits ?? 0), 0)
  const salary = effectiveSalary(policies, supp)

  // Explicit product status per the reference: ✓ תקין / ! לבדיקה / ✕ חריגה
  const statusFromFindings = (fs: typeof findings): { label: string; tone: Status; sign: string } => {
    if (fs.some((f) => f.severity === 'gap')) return { label: 'חריגה', tone: 'bad', sign: '✕' }
    if (fs.some((f) => f.severity === 'attention')) return { label: 'לבדיקה', tone: 'warn', sign: '!' }
    return { label: 'תקין', tone: 'good', sign: '✓' }
  }
  const policyStatusOf = (p: Policy) => statusFromFindings(findings.filter((f) => f.policyId === p.id))
  // Headline figure per product card: accumulation when it exists, else the
  // largest insurance sum (pure-risk products carry no savings).
  const policyHeadline = (p: Policy): { value: number; note: string } => {
    const cv = p.currentValue ?? 0
    if (cv > 0) return { value: cv, note: 'צבירה' }
    const cov = p.coverages.reduce((s, c) => s + (c.amount ?? 0), 0)
    return { value: cov, note: cov > 0 ? 'סכום כיסוי' : 'ללא צבירה' }
  }

  const [compact, setCompact] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

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

  const reportDates = policies.map((p) => p.reportDate).filter(Boolean) as string[]
  const asOf = reportDates.length ? formatDate(reportDates.sort()[reportDates.length - 1]) : 'לא דווח'
  const retirementAge = Math.max(0, ...policies.map((p) => p.retirementAge ?? 0)) || null

  // Health-oriented KPI metrics (mirroring the mockup's KPI row)
  const GOOD = 'var(--color-success)'
  const WARN = 'var(--color-warning)'
  const DANGER = 'var(--color-danger)'
  const exposure = computeExposure(policies, supp.treasuryAllocations)
  const equityPct = exposure.portfolio.equity.equityPercent
  const gemelSharePct = exposure.gemelShare
  const age = client.birthDate ? Number(ageFrom(client.birthDate)) : null
  const equityTarget = age && !isNaN(age) ? Math.max(20, Math.min(75, 110 - age)) : null

  let feeWeighted = 0
  let feeBase = 0
  for (const p of policies) {
    if (p.fees.fromAccumulation !== null && p.currentValue) {
      feeWeighted += p.currentValue * p.fees.fromAccumulation
      feeBase += p.currentValue
    }
  }
  const weightedFee = feeBase > 0 ? feeWeighted / feeBase : null
  const MARKET_FEE = 1.0 // ≈ market average accumulation fee (%)

  // ---- V2 Overview: four primary KPIs (white cards, per the reference) ----
  const ipMax = ipPercents.length > 0 ? Math.max(...ipPercents) : null
  const pensionTarget = salary != null && salary > 0 ? salary * PENSION_TO_SALARY_MIN_RATIO : null
  const primaryKpis: Kpi[] = [
    {
      key: 'savings',
      icon: PiggyBank,
      accent: 'var(--color-success)',
      tint: 'var(--color-success-bg)',
      label: 'סך חיסכון פנסיוני',
      numeric: totalAssets,
      format: formatCurrency,
      sub: gemelSharePct > 0 ? `${Math.round(gemelSharePct)}% בקופות גמל` : `${policies.length} פוליסות`,
    },
    {
      key: 'pension',
      icon: CalendarClock,
      accent: 'var(--clint-600)',
      tint: 'var(--clint-50)',
      label: 'קצבה חודשית צפויה',
      numeric: totalPensionWithDeposits,
      format: formatCurrency,
      sub: pensionTarget ? `יעד ≈${formatCurrency(pensionTarget)}` : 'בהמשך הפקדות',
      status:
        pensionTarget && totalPensionWithDeposits < pensionTarget
          ? { label: `פער ${Math.round(((pensionTarget - totalPensionWithDeposits) / pensionTarget) * 100)}%`, tone: 'warn' }
          : pensionTarget
            ? { label: 'תקין', tone: 'good' }
            : undefined,
    },
    {
      key: 'ip',
      icon: ShieldCheck,
      accent: 'var(--cyan-600)',
      tint: 'var(--cyan-50)',
      label: 'כיסוי אובדן כושר עבודה',
      value: ipMax !== null ? `${ipMax.toFixed(0)}%` : '—',
      status: ipMax === null ? { label: 'לא אותר', tone: 'bad' } : ipMax >= 73 ? { label: 'תקין', tone: 'good' } : { label: 'לבדיקה', tone: 'warn' },
      sub: 'יעד 75%',
    },
    {
      key: 'fees',
      icon: BarChart3,
      accent: 'var(--clint-700)',
      tint: 'var(--clint-50)',
      label: 'דמי ניהול משוקללים',
      value: weightedFee !== null ? `${weightedFee.toFixed(2)}%` : '—',
      status: weightedFee === null ? undefined : weightedFee <= MARKET_FEE ? { label: 'תקין', tone: 'good' } : { label: 'חריגה', tone: 'warn' },
      sub: `מול ממוצע השוק ≈${MARKET_FEE.toFixed(1)}%`,
    },
  ]

  // Asset allocation donut — sum current value per product type. Presentation only.
  const DONUT_COLORS: Record<ProductType, string> = {
    pension: '#2f6fad',
    managers: '#3d3a8c',
    gemel: '#7c5cbf',
    gemelInvestment: '#16ab99',
    education: '#f5b301',
    life: '#ff5476',
    incomeProtection: '#eb6834',
    unknown: '#94a3b8',
  }
  const donutSlices: AssetSlice[] = PRODUCT_ORDER.map((t) => ({
    type: t,
    label: productTypeLabels[t],
    value: policies.filter((p) => p.productType === t).reduce((s, p) => s + (p.currentValue ?? 0), 0),
    color: DONUT_COLORS[t],
  })).filter((s) => s.value > 0)

  // Retirement projection (two-state): today vs. retirement age.
  const projectedCapital = policies.reduce((s, p) => s + (p.expectedAccumulationWithDeposits ?? 0), 0)
  const hasProjection = totalPensionWithDeposits > 0 || totalPensionWithoutDeposits > 0 || projectedCapital > 0

  const heroKpis: { label: string; value: string; sub?: string; dot?: string; meter?: HeroMeter }[] = [
    {
      label: 'סך נכסים',
      value: formatCurrency(totalAssets),
      sub: gemelSharePct > 0 ? `${Math.round(gemelSharePct)}% בקופות גמל` : undefined,
    },
    {
      label: 'דמי ניהול משוקללים',
      value: weightedFee !== null ? `${weightedFee.toFixed(2)}%` : '—',
      dot: weightedFee === null ? undefined : weightedFee <= MARKET_FEE ? GOOD : WARN,
      meter: weightedFee === null ? undefined : { fill: (weightedFee / 2) * 100, target: (MARKET_FEE / 2) * 100, color: weightedFee <= MARKET_FEE ? GOOD : WARN },
      sub: `מול ממוצע השוק ≈${MARKET_FEE.toFixed(1)}%`,
    },
    {
      label: 'חשיפה מנייתית',
      value: equityPct !== null ? `${Math.round(equityPct)}%` : '—',
      dot: equityPct === null || equityTarget === null ? undefined : Math.abs(equityPct - equityTarget) <= 10 ? GOOD : WARN,
      meter: equityPct === null || equityTarget === null ? undefined : { fill: equityPct, target: equityTarget, color: Math.abs(equityPct - equityTarget) <= 10 ? GOOD : WARN },
      sub: equityPct === null ? 'אין נתוני אוצר' : equityTarget !== null ? `יעד ≈${Math.round(equityTarget)}% לגיל ${age}` : undefined,
    },
    {
      label: 'ממצאים לתשומת לב',
      value: String(actionable.length),
      dot: gapCount > 0 ? DANGER : attentionCount > 0 ? WARN : GOOD,
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
            background: '#001233',
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
          position: 'relative',
          background: 'var(--hero-bg)',
          color: '#fff',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: mobile ? '20px 16px 22px' : '34px 32px 38px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: mobile ? 21 : 28, fontWeight: 800, letterSpacing: '-0.02em' }}>
                התיק הפנסיוני של {client.fullName}
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: mobile ? 12.5 : 14, color: 'rgba(255,255,255,0.65)' }}>
                תמונת מצב מרוכזת מ-{policies.length} פוליסות · הנתונים נכונים ל-{asOf}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button
                onClick={scrollToFindings}
                aria-label={`${actionable.length} נקודות לטיפול`}
                title="נקודות מרכזיות לטיפול"
                style={{ position: 'relative', width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.16)', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', backdropFilter: 'blur(6px)' }}
              >
                <Bell size={17} />
                {actionable.length > 0 && (
                  <span style={{ position: 'absolute', top: -3, insetInlineStart: -3, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 'var(--radius-full)', background: gapCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)', color: '#fff', fontSize: 10.5, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #0f2647' }}>
                    {actionable.length}
                  </span>
                )}
              </button>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 13px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: 'rgba(255,255,255,0.85)',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan-400)', boxShadow: '0 0 0 3px rgba(50,182,217,0.28)' }} />
                מנוע ניתוח
              </span>
            </div>
          </div>

        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: mobile ? '16px 16px 40px' : '24px 32px 48px' }}>
        {/* Primary KPIs — four white cards (V2 Overview) */}
        <div style={{ marginBottom: 24 }}>
          <KpiRow kpis={primaryKpis} />
        </div>
        {/* Context questions — a bar (replaces the old full-page step) */}
        <ContextBar />
        {/* Client details — collapsible */}
        <Card style={{ marginBottom: 24 }} padding={0}>
          <button
            onClick={() => setDetailsOpen((v) => !v)}
            aria-expanded={detailsOpen}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textAlign: 'right',
            }}
          >
            <span style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--clint-600)' }}>
              <User size={17} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>פרטי לקוח</div>
              {!detailsOpen && (
                <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clientDetails.filter((d) => ['תעודת זהות', 'תאריך לידה', 'גיל פרישה יעד'].includes(d.label)).map((d) => d.value).join(' · ')}
                </div>
              )}
            </div>
            <ChevronDown
              size={18}
              color="var(--color-text-tertiary)"
              style={{ flexShrink: 0, transform: detailsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 180ms var(--ease-out)' }}
            />
          </button>
          {detailsOpen && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, padding: '0 20px 20px' }}>
              {clientDetails.map((d) => (
                <div key={d.label}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{d.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginTop: 3 }}>{d.value}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Retirement projection (two-state timeline) + asset-allocation donut */}
        {(hasProjection || donutSlices.length > 0) && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? '1fr' : 'minmax(0,1fr) minmax(0,1.45fr)',
              gap: mobile ? 16 : 20,
              marginBottom: 24,
              alignItems: 'start',
            }}
          >
            {donutSlices.length > 0 && (
              <AssetDonut slices={donutSlices} onSelect={(type) => dispatch({ type: 'OPEN_PRODUCT', productType: type })} />
            )}
            {hasProjection && (
              <RetirementProjection
                currentAge={age !== null && !isNaN(age) ? age : null}
                retirementAge={retirementAge ?? 67}
                currentAccumulation={totalAssets}
                currentPension={totalPensionWithoutDeposits}
                projectedAccumulation={projectedCapital}
                projectedPension={totalPensionWithDeposits}
              />
            )}
          </div>
        )}

        {/* Key findings to act on */}
        <div id="key-findings" style={{ scrollMarginTop: 12 }}>
          <FindingHighlights findings={actionable} />
        </div>

        {/* Products */}
        <section>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '0 0 14px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>המוצרים בתיק</h2>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>{policies.length} מוצרים · לחיצה פותחת את הפירוט</span>
          </div>
          <div
            className="clint-scroll-x"
            style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8, scrollSnapType: 'x proximity', WebkitOverflowScrolling: 'touch' }}
          >
            {[...policies]
              .sort((a, b) => policyHeadline(b).value - policyHeadline(a).value)
              .map((p) => {
                const head = policyHeadline(p)
                const st = policyStatusOf(p)
                const m = STATUS_META[st.tone]
                const name = p.managingCompany ?? p.productName ?? productTypeLabels[p.productType]
                return (
                  <button
                    key={p.id}
                    onClick={() => dispatch({ type: 'OPEN_POLICY', policyId: p.id })}
                    style={{
                      flex: `0 0 ${mobile ? '80%' : '262px'}`,
                      maxWidth: '90vw',
                      scrollSnapAlign: 'start',
                      textAlign: 'right',
                      background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border-base)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-card)',
                      padding: 16,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'transform 200ms var(--ease-out), box-shadow 200ms var(--ease-out)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11, justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <CompanyLogo company={p.managingCompany} size={40} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {name}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {productTypeLabels[p.productType]}
                          </div>
                        </div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: m.bg, color: m.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {st.sign} {st.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 14 }}>
                      <div>
                        <div style={{ fontSize: 21, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
                          {formatCurrency(head.value)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{head.note}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clint-600)' }}>לפירוט ←</span>
                    </div>
                  </button>
                )
              })}
          </div>
        </section>
      </div>
    </>
  )
}

import Card from './ds/Card'
import { formatCurrency } from '../utils/format'
import { useCountUp } from '../hooks/useCountUp'
import { useIsMobile } from '../hooks/useMediaQuery'
import { Info, ArrowLeft } from 'lucide-react'

/**
 * תחזית פרישה — Two-State Timeline. A slim slider track with a station at each
 * end (today vs. retirement age) instead of a dense year-by-year line, so the
 * difference between "no further deposits" and "with further deposits" reads at
 * a glance. Presentation only — every figure is passed in from the analysis.
 */
export default function RetirementProjection({
  currentAge,
  retirementAge,
  currentAccumulation,
  currentPension,
  projectedAccumulation,
  projectedPension,
  onDetails,
}: {
  currentAge: number | null
  retirementAge: number
  currentAccumulation: number
  currentPension: number
  projectedAccumulation: number
  projectedPension: number
  onDetails?: () => void
}) {
  const mobile = useIsMobile()
  const yearsToRetirement =
    currentAge !== null && retirementAge > currentAge ? retirementAge - currentAge : null

  const today = (
    <Station
      heading={currentAge !== null ? `היום · גיל ${currentAge}` : 'היום'}
      accumulation={currentAccumulation}
      pension={currentPension}
      badge="ללא המשך הפקדות"
      badgeTone="warn"
      align={mobile ? 'center' : 'start'}
    />
  )
  const future = (
    <Station
      heading={`גיל ${retirementAge}`}
      accumulation={projectedAccumulation}
      pension={projectedPension}
      badge="עם המשך הפקדות"
      badgeTone="good"
      align={mobile ? 'center' : 'end'}
      highlight
    />
  )

  return (
    <Card padding={mobile ? 18 : 24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: mobile ? 16 : 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: mobile ? 15 : 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>תחזית הפרישה</span>
          <Info size={15} color="var(--color-text-tertiary)" aria-hidden />
        </div>
        {onDetails && (
          <button
            onClick={onDetails}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 600, color: 'var(--clint-600)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
          >
            {mobile ? 'לפרטים' : 'הצג תחזית מפורטת'} <ArrowLeft size={14} />
          </button>
        )}
      </div>

      {mobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {future}
          <VerticalTrack years={yearsToRetirement} />
          {today}
        </div>
      ) : (
        <>
          <SliderTrack />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto minmax(0,1fr)', gap: 18, alignItems: 'start', marginTop: 14 }}>
            {future}
            <YearsPill years={yearsToRetirement} />
            {today}
          </div>
        </>
      )}
    </Card>
  )
}

/** Full-width slim slider with a filled dot at each end (today ↔ retirement). */
function SliderTrack() {
  return (
    <div style={{ position: 'relative', height: 10, margin: '2px 6px 0' }} aria-hidden>
      <div style={{ position: 'absolute', insetInline: 4, top: 4, height: 3, borderRadius: 3, background: 'linear-gradient(90deg,var(--clint-600),var(--clint-300))' }} />
      <span style={{ position: 'absolute', insetInlineStart: 0, top: 0, width: 11, height: 11, borderRadius: '50%', background: 'var(--clint-600)', border: '2px solid var(--color-bg-card)', boxShadow: '0 0 0 1px var(--clint-400)' }} />
      <span style={{ position: 'absolute', insetInlineEnd: 0, top: 0, width: 11, height: 11, borderRadius: '50%', background: 'var(--clint-600)', border: '2px solid var(--color-bg-card)', boxShadow: '0 0 0 1px var(--clint-400)' }} />
    </div>
  )
}

function VerticalTrack({ years }: { years: number | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} aria-hidden>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--clint-600)' }} />
      <div style={{ width: 3, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,var(--clint-600),var(--clint-300))' }} />
      <YearsPill years={years} />
      <div style={{ width: 3, height: 12, borderRadius: 3, background: 'linear-gradient(180deg,var(--clint-300),var(--clint-600))' }} />
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'var(--clint-600)' }} />
    </div>
  )
}

function YearsPill({ years }: { years: number | null }) {
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 1, alignSelf: 'center', background: 'var(--neutral-50)', border: '1px solid var(--color-border-base)', borderRadius: 'var(--radius-md)', padding: '8px 12px', whiteSpace: 'nowrap' }}>
      {years !== null ? (
        <>
          <b style={{ fontSize: 14, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{years} שנה</b>
          <span style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)' }}>עד גיל הפרישה</span>
        </>
      ) : (
        <b style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>עד הפרישה</b>
      )}
    </div>
  )
}

function Station({
  heading,
  accumulation,
  pension,
  badge,
  badgeTone,
  align,
  highlight,
}: {
  heading: string
  accumulation: number
  pension: number
  badge: string
  badgeTone: 'good' | 'warn'
  align: 'start' | 'end' | 'center'
  highlight?: boolean
}) {
  const acc = useCountUp(accumulation)
  const pen = useCountUp(pension)
  const tone =
    badgeTone === 'good'
      ? { bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)' }
      : { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' }
  const items: 'flex-start' | 'flex-end' | 'center' =
    align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : 'center'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: items, gap: 3, textAlign: align === 'center' ? 'center' : (align as 'start' | 'end') }}>
      <span style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: highlight ? 'var(--clint-700)' : 'var(--color-text-secondary)', padding: '3px 11px', borderRadius: 'var(--radius-full)', background: highlight ? 'var(--clint-50)' : 'var(--neutral-100)', marginBottom: 8 }}>
        {heading}
      </span>
      <Metric label="צבירה צפויה" value={formatCurrency(acc)} />
      <Metric label="קצבה חודשית צפויה" value={formatCurrency(pen)} />
      <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 'var(--radius-full)', background: tone.bg, color: tone.color, marginTop: 8 }}>
        {badge}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', marginTop: 6 }}>בהנחת תשואה ודמי ניהול נוכחיים</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

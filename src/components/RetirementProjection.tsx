import Card from './ds/Card'
import { formatCurrency } from '../utils/format'
import { useCountUp } from '../hooks/useCountUp'
import { useIsMobile } from '../hooks/useMediaQuery'
import { Info, ArrowLeft, TrendingUp } from 'lucide-react'

/**
 * תחזית פרישה — Two-State Timeline. A slim axis with a station at each end
 * (today vs. retirement age); the age labels are anchored directly to the dot
 * on the axis they belong to, so "where you are" and "where you're heading"
 * read at a glance. Presentation only — every figure comes from the analysis.
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

  const todayHeading = currentAge !== null ? `היום · גיל ${currentAge}` : 'היום'
  const futureHeading = `גיל ${retirementAge}`

  // Desktop columns sit under their axis dot: future ▸ right (start), today ▸ left (end).
  const today = (
    <Station
      accumulation={currentAccumulation}
      pension={currentPension}
      badge="ללא המשך הפקדות"
      badgeTone="warn"
      align={mobile ? 'center' : 'end'}
    />
  )
  const future = (
    <Station
      accumulation={projectedAccumulation}
      pension={projectedPension}
      badge="עם המשך הפקדות"
      badgeTone="good"
      align={mobile ? 'center' : 'start'}
      highlight
    />
  )

  return (
    <Card padding={mobile ? 18 : 24}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: mobile ? 14 : 18 }}>
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
          <AgeChip text={futureHeading} highlight />
          {future}
          <VerticalTrack years={yearsToRetirement} />
          <AgeChip text={todayHeading} />
          {today}
        </div>
      ) : (
        <>
          {/* Axis: age labels sit on the dot they belong to (future ▸ right, today ▸ left) */}
          <Axis futureHeading={futureHeading} todayHeading={todayHeading} years={yearsToRetirement} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start', marginTop: 18 }}>
            {future}
            {today}
          </div>
        </>
      )}
    </Card>
  )
}

/**
 * Horizontal axis with a glowing station dot under each age label. The gradient
 * runs from "today" (left) toward "retirement" (right) to read as growth, and a
 * floating years capsule marks the distance between the two.
 */
function Axis({ futureHeading, todayHeading, years }: { futureHeading: string; todayHeading: string; years: number | null }) {
  return (
    <div style={{ position: 'relative', padding: '0 4px' }} aria-hidden>
      {/* Age labels, each anchored above its dot */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 9 }}>
        <AgeChip text={futureHeading} highlight />
        <AgeChip text={todayHeading} />
      </div>

      {/* The rail + end dots */}
      <div style={{ position: 'relative', height: 14 }}>
        <div
          style={{
            position: 'absolute',
            insetInline: 7,
            top: 5,
            height: 4,
            borderRadius: 4,
            background: 'linear-gradient(90deg, var(--clint-600) 0%, var(--cyan-500) 100%)',
            boxShadow: '0 1px 8px rgba(47,107,255,0.35)',
          }}
        />
        <Dot side="start" tone="future" />
        <Dot side="end" tone="today" />

        {/* Years capsule floating on the rail */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border-base)',
            borderRadius: 'var(--radius-full)',
            padding: '5px 12px',
            boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
            whiteSpace: 'nowrap',
          }}
        >
          <TrendingUp size={13} color="var(--cyan-600)" />
          {years !== null ? (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              <b style={{ fontFamily: 'var(--font-mono)' }}>{years}</b> שנה עד הפרישה
            </span>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>עד הפרישה</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Dot({ side, tone }: { side: 'start' | 'end'; tone: 'future' | 'today' }) {
  const color = tone === 'future' ? 'var(--clint-600)' : 'var(--cyan-500)'
  const glow = tone === 'future' ? 'rgba(47,107,255,0.22)' : 'rgba(50,182,217,0.22)'
  return (
    <span
      style={{
        position: 'absolute',
        [side === 'start' ? 'insetInlineStart' : 'insetInlineEnd']: 0,
        top: 1,
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: 'var(--color-bg-card)',
        border: `3px solid ${color}`,
        boxShadow: `0 0 0 4px ${glow}`,
      }}
    />
  )
}

/** Age label pill, highlighted for the retirement (target) end. */
function AgeChip({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 700,
        padding: '4px 12px',
        borderRadius: 'var(--radius-full)',
        background: highlight ? 'var(--clint-50)' : 'var(--neutral-100)',
        color: highlight ? 'var(--clint-700)' : 'var(--color-text-secondary)',
        border: highlight ? '1px solid var(--clint-300)' : '1px solid var(--color-border-base)',
        alignSelf: 'center',
      }}
    >
      {text}
    </span>
  )
}

function VerticalTrack({ years }: { years: number | null }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }} aria-hidden>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-bg-card)', border: '3px solid var(--clint-600)', boxShadow: '0 0 0 4px rgba(47,107,255,0.18)' }} />
      <div style={{ width: 4, height: 12, borderRadius: 4, background: 'linear-gradient(180deg,var(--clint-600),var(--cyan-500))' }} />
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border-base)',
          borderRadius: 'var(--radius-full)',
          padding: '5px 12px',
          boxShadow: '0 2px 10px rgba(15,23,42,0.08)',
          whiteSpace: 'nowrap',
        }}
      >
        <TrendingUp size={13} color="var(--cyan-600)" />
        {years !== null ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            <b style={{ fontFamily: 'var(--font-mono)' }}>{years}</b> שנה עד הפרישה
          </span>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>עד הפרישה</span>
        )}
      </div>
      <div style={{ width: 4, height: 12, borderRadius: 4, background: 'linear-gradient(180deg,var(--cyan-500),var(--clint-600))' }} />
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-bg-card)', border: '3px solid var(--cyan-500)', boxShadow: '0 0 0 4px rgba(50,182,217,0.18)' }} />
    </div>
  )
}

function Station({
  accumulation,
  pension,
  badge,
  badgeTone,
  align,
  highlight,
}: {
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: items,
        gap: 3,
        textAlign: align === 'center' ? 'center' : (align as 'start' | 'end'),
        padding: highlight ? '14px 14px' : '14px 14px',
        borderRadius: 'var(--radius-lg)',
        background: highlight ? 'linear-gradient(180deg, var(--clint-50), transparent 70%)' : 'transparent',
        border: highlight ? '1px solid var(--clint-300)' : '1px solid transparent',
      }}
    >
      <Metric label="צבירה צפויה" value={formatCurrency(acc)} highlight={highlight} />
      <div style={{ alignSelf: 'stretch', height: 1, background: 'var(--color-border-base)', margin: '2px 0 10px' }} />
      <Metric label="קצבה חודשית צפויה" value={formatCurrency(pen)} highlight={highlight} />
      <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '4px 11px', borderRadius: 'var(--radius-full)', background: tone.bg, color: tone.color, marginTop: 8 }}>
        {badge}
      </span>
      <span style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', marginTop: 6 }}>בהנחת תשואה ודמי ניהול נוכחיים</span>
    </div>
  )
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: highlight ? 'var(--clint-700)' : 'var(--color-text-primary)', letterSpacing: '-0.01em', marginTop: 1 }}>
        {value}
      </div>
    </div>
  )
}

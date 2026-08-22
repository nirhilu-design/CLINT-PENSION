import Card from './ds/Card'
import { formatCurrency } from '../utils/format'

// Replacement-ratio gauge (יחס תחלופה): the projected monthly pension as a
// percent of the current salary, against a target (default 70%). A dual radial
// gauge shows the "with deposits" scenario (outer) and "without deposits" (inner).

const CX = 115
const R_OUT = 92
const R_IN = 74
const SWEEP = 270 // degrees
const START = 135 // degrees, gap centered at the bottom
const arc = (r: number) => 2 * Math.PI * r * (SWEEP / 360)
const circ = (r: number) => 2 * Math.PI * r

// Polar point in SVG coordinates (clockwise, y-down).
function polar(r: number, deg: number) {
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CX + r * Math.sin(rad) }
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

export default function ReplacementGauge({
  withDeposits,
  withoutDeposits,
  salary,
  target = 0.7,
}: {
  withDeposits: number
  withoutDeposits: number
  salary: number | null
  target?: number
}) {
  const hasSalary = salary !== null && salary > 0
  const ratioWith = hasSalary ? withDeposits / salary! : null
  const ratioWithout = hasSalary ? withoutDeposits / salary! : null
  const meetsTarget = ratioWith !== null && ratioWith >= target

  const dashOut = arc(R_OUT) * clamp01(ratioWith ?? 0)
  const dashIn = arc(R_IN) * clamp01(ratioWithout ?? 0)
  const tickA = START + target * SWEEP
  const t1 = polar(R_OUT - 10, tickA)
  const t2 = polar(R_OUT + 12, tickA)
  const pct = (r: number | null) => (r === null ? '—' : `${Math.round(r * 100)}%`)

  return (
    <Card style={{ marginBottom: 24 }} padding={0}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 8, padding: '22px 24px', alignItems: 'center' }}>
        {/* Gauge */}
        <div style={{ display: 'grid', placeItems: 'center', position: 'relative' }}>
          <svg width="230" height="230" viewBox="0 0 230 230" role="img" aria-label={`יחס תחלופה ${pct(ratioWith)} בהמשך הפקדות`}>
            <circle cx={CX} cy={CX} r={R_OUT} fill="none" stroke="var(--neutral-200)" strokeWidth="15" strokeLinecap="round" strokeDasharray={`${arc(R_OUT)} ${circ(R_OUT)}`} transform={`rotate(${START} ${CX} ${CX})`} />
            <circle cx={CX} cy={CX} r={R_OUT} fill="none" stroke="var(--accent-navy)" strokeWidth="15" strokeLinecap="round" strokeDasharray={`${dashOut} ${circ(R_OUT)}`} transform={`rotate(${START} ${CX} ${CX})`} />
            <circle cx={CX} cy={CX} r={R_IN} fill="none" stroke="var(--neutral-200)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${arc(R_IN)} ${circ(R_IN)}`} transform={`rotate(${START} ${CX} ${CX})`} opacity="0.6" />
            <circle cx={CX} cy={CX} r={R_IN} fill="none" stroke="var(--accent-coral)" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${dashIn} ${circ(R_IN)}`} transform={`rotate(${START} ${CX} ${CX})`} />
            {hasSalary && <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke="var(--neutral-500)" strokeWidth="2.5" strokeLinecap="round" />}
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center', top: '50%', left: '50%', transform: 'translate(-50%,-46%)' }}>
            <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{pct(ratioWith)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{hasSalary ? 'בהמשך הפקדות' : 'אין שכר'}</div>
            {hasSalary && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 'var(--radius-full)', background: meetsTarget ? 'var(--color-success-bg)' : 'var(--color-danger-bg)', color: meetsTarget ? 'var(--color-success-dark)' : 'var(--color-danger-dark)' }}>
                {meetsTarget ? '▲ מעל היעד' : '▼ מתחת ליעד'}
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ paddingInlineStart: 6 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
            יחס תחלופה — הקצבה ביחס לשכר
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--color-text-secondary)', maxWidth: '52ch', lineHeight: 1.6 }}>
            {hasSalary
              ? `הקצבה החודשית הצפויה כאחוז מהשכר הנוכחי (${formatCurrency(salary)}), מול יעד מקובל של ${Math.round(target * 100)}%.`
              : 'לא הוזן שכר נוכחי — הזן שכר באזור היועץ כדי לחשב את יחס התחלופה. בינתיים מוצגים סכומי הקצבה בלבד.'}
          </p>
          <div style={{ display: 'grid', gap: 12 }}>
            <ScenarioRow color="var(--accent-navy)" name="בהמשך הפקדות" ratio={ratioWith} amount={withDeposits} target={target} />
            <ScenarioRow color="var(--accent-coral)" name="ללא הפקדות" ratio={ratioWithout} amount={withoutDeposits} target={target} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function ScenarioRow({ color, name, ratio, amount, target }: { color: string; name: string; ratio: number | null; amount: number; target: number }) {
  const pctWidth = ratio !== null ? Math.max(0, Math.min(100, ratio * 100)) : 0
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr auto', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
        {name}
      </div>
      <div style={{ height: 9, borderRadius: 5, background: 'var(--neutral-200)', position: 'relative' }}>
        {ratio !== null && <span style={{ position: 'absolute', insetInlineEnd: 0, top: 0, bottom: 0, width: `${pctWidth}%`, borderRadius: 5, background: color, display: 'block' }} />}
        {ratio !== null && <span style={{ position: 'absolute', top: -4, bottom: -4, insetInlineEnd: `${target * 100}%`, width: 2, background: 'var(--neutral-500)', borderRadius: 2 }} />}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
        {ratio !== null ? `${Math.round(ratio * 100)}%` : ''} <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontWeight: 600 }}>· {formatCurrency(amount)}</span>
      </div>
    </div>
  )
}

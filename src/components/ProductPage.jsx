import React, { useState } from 'react'
import PolicyCard from './PolicyCard.jsx'

const PRODUCT_LABELS = {
  pension:           'קרן פנסיה',
  bituach_menahalim: 'ביטוח מנהלים',
  gemel:             'קופת גמל',
  hishtalmut:        'קרן השתלמות',
}

// Product types where time-horizon question is relevant
const SHOW_HORIZON = ['hishtalmut', 'gemel']

const HORIZON_OPTIONS = [
  { value: 'short',  label: 'עד 3 שנים',       sub: 'נזילות בקרוב' },
  { value: 'mid',    label: '3–6 שנים',          sub: 'אופק בינוני' },
  { value: 'long',   label: '6 שנים ומעלה',     sub: 'לטווח ארוך' },
]

const HORIZON_REC = {
  short: 'מומלץ מסלול שמרני / כספי — נזילות קרובה דורשת יציבות.',
  mid:   'ניתן לשקול מסלול מאוזן (40–60% מניות) — טווח בינוני מאפשר גמישות.',
  long:  'ניתן להגביר חשיפה למניות (+70%). זמן ארוך מאפשר ספיגת תנודות.',
}

export default function ProductPage({ type, rows, onSelectPolicy }) {
  const [horizon, setHorizon] = useState('long')

  const label = PRODUCT_LABELS[type] || type
  const activeRows   = rows.filter(r => r.status === 'active')
  const inactiveRows = rows.filter(r => r.status !== 'active')

  const totalAccum = rows.reduce((s, r) => s + (r.accumulation || 0), 0)
  const avgFeeAccum = rows.filter(r => r.feeFromAccumulation != null).map(r => r.feeFromAccumulation)
  const displayFee = avgFeeAccum.length ? Math.min(...avgFeeAccum) : null

  // Equity exposure (weighted)
  const withAccum = rows.filter(r => r.accumulation > 0)
  const equityRows = withAccum.filter(r => ['STOCKS', 'SP500', 'INDEX'].includes(r.trackCategory))
  const equityPct = withAccum.length
    ? Math.round(equityRows.reduce((s, r) => s + r.accumulation, 0) / totalAccum * 100)
    : null

  // Findings per active policy
  const withFindings = activeRows.filter(r => r.findings?.some(f => f.status === 'warn' || f.status === 'danger'))

  return (
    <div style={{ padding: '28px 40px', direction: 'rtl' }}>
      {/* Breadcrumb */}
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
        <span style={{ cursor: 'pointer' }}>דשבורד</span>
        <span style={{ margin: '0 6px' }}>←</span>
        <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="סה״כ צבירה" value={`₪${Math.round(totalAccum).toLocaleString()}`} large />
        <StatCard label="מספר פוליסות" value={rows.length} />
        {equityPct != null && <StatCard label="חשיפה למניות (משוקלל)" value={`${equityPct}%`} />}
        {displayFee != null && (
          <StatCard label="דמי ניהול" value={<><span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>מצבירה: </span><strong>{displayFee}%</strong></>} />
        )}
      </div>

      {/* Time horizon widget */}
      {SHOW_HORIZON.includes(type) && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', marginBottom: 24, border: '1px solid var(--color-border)' }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
            מה אופק הזמן לכספי ה{label}?
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            הבחירה תסייע בהמלצה על מסלול השקעה מתאים
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            {HORIZON_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setHorizon(opt.value)}
                style={{
                  flex: 1, padding: '12px 8px', borderRadius: 8, border: '1px solid var(--color-border)',
                  background: horizon === opt.value ? 'var(--color-navy)' : '#fff',
                  color: horizon === opt.value ? '#fff' : 'var(--color-text)',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div>{opt.label}</div>
                <div style={{ fontSize: 11, fontWeight: 400, marginTop: 2, opacity: 0.8 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>המלצת מסלול</div>
            <div style={{ fontSize: 13 }}>{HORIZON_REC[horizon]}</div>
          </div>
        </div>
      )}

      {/* Policies */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: 'var(--color-text)' }}>הפוליסות</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[...activeRows, ...inactiveRows].map((row, i) => (
            <PolicyCard key={i} row={row} onSelect={onSelectPolicy} />
          ))}
        </div>
      </div>

      {/* Findings section */}
      {withFindings.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>ממצאים לפי פוליסה</div>
          {withFindings.map((row, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 12, border: '1px solid var(--color-border)' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{row.planName || row.issuer}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                {row.issuer}{row.policyNumber ? ` · ${row.policyNumber}` : ''}
              </div>
              {row.findings.filter(f => f.status === 'warn' || f.status === 'danger').map((f, j) => (
                <FindingRow key={j} {...f} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, large }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 22 : 20, fontWeight: 800, color: 'var(--color-navy)' }}>{value}</div>
    </div>
  )
}

function FindingRow({ type, status, title, message }) {
  const borderColor = status === 'danger' ? '#EF4444' : '#F59E0B'
  const bg          = status === 'danger' ? '#FEF2F2' : '#FFFBEB'
  const TYPE_LABELS = { finding: 'ממצא', information: 'מידע', limitation: 'מגבלה', recommendation: 'המלצה' }

  return (
    <div style={{ borderRight: `3px solid ${borderColor}`, background: bg, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: message ? 4 : 0 }}>
        <span className="badge badge-info" style={{ fontSize: 11 }}>{TYPE_LABELS[type] || type}</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
      </div>
      {message && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6 }}>{message}</div>}
    </div>
  )
}

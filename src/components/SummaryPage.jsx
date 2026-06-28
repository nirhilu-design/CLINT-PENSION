import React from 'react'

const PRODUCT_LABELS = {
  pension:           'פנסיה',
  bituach_menahalim: 'ביטוח מנהלים',
  gemel:             'גמל',
  hishtalmut:        'השתלמות',
}
const PRODUCT_ORDER = ['pension', 'bituach_menahalim', 'gemel', 'hishtalmut']

export default function SummaryPage({ analytics, clientInfo, clientProfile, onSelectProduct }) {
  const { byType, summary, globalFindings } = analytics
  const { totalAccumulation, maxSalary, activeCount } = summary

  const availableTypes = PRODUCT_ORDER.filter(t => byType[t]?.length > 0)

  // Equity exposure across all
  const allRows = analytics.rows || []
  const activeRows = allRows.filter(r => r.status === 'active' && r.accumulation > 0)
  const total = activeRows.reduce((s, r) => s + r.accumulation, 0)
  const equityRows = activeRows.filter(r => ['STOCKS', 'SP500', 'INDEX'].includes(r.trackCategory))
  const equityPct = total > 0 ? Math.round(equityRows.reduce((s, r) => s + r.accumulation, 0) / total * 100) : null

  // Monthly pension estimate (rough)
  const pensionAccum = summary.byType?.pension?.accumulation || 0
  const bitmAccum    = summary.byType?.bituach_menahalim?.accumulation || 0
  const totalPension = pensionAccum + bitmAccum
  const monthlyEst   = totalPension > 0 ? Math.round(totalPension / (20 * 12)) : null // ~20yr drawdown

  return (
    <div style={{ padding: '28px 40px', direction: 'rtl' }}>
      {/* Client card */}
      <div style={{
        background: 'var(--color-navy)', color: '#fff',
        borderRadius: 14, padding: '20px 28px', marginBottom: 24,
      }}>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
          {clientInfo?.clientName || 'לקוח'}
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8' }}>
          {[
            clientInfo?.clientId ? `ת.ז. ${clientInfo.clientId}` : null,
            clientInfo?.age ? `גיל ${clientInfo.age}` : null,
            clientProfile?.gender === 'male' ? 'זכר' : clientProfile?.gender === 'female' ? 'נקבה' : null,
            clientProfile?.marital ? MARITAL_LABELS[clientProfile.marital] : null,
            maxSalary ? `שכר: ₪${maxSalary.toLocaleString()}` : null,
          ].filter(Boolean).join(' | ')}
        </div>
      </div>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="סה״כ צבירה" value={`₪${formatNum(totalAccumulation)}`} large />
        {monthlyEst && <StatCard label="קצבה חודשית צפויה" value={`₪${monthlyEst.toLocaleString()}`} />}
        <StatCard label="מוצרים פעילים" value={activeCount} />
        {equityPct != null && <StatCard label="חשיפה למניות (משוקלל)" value={`${equityPct}%`} />}
      </div>

      {/* Global findings */}
      {globalFindings?.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>ממצאים כלל-תיק</div>
          <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid var(--color-border)' }}>
            {globalFindings.map((f, i) => <GlobalFindingRow key={i} {...f} />)}
          </div>
        </div>
      )}

      {/* Products breakdown */}
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>מוצרים לפי סוג</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {availableTypes.map(type => {
          const typeRows = byType[type]
          const typeAccum = typeRows.reduce((s, r) => s + (r.accumulation || 0), 0)
          const activeCount = typeRows.filter(r => r.status === 'active').length
          const warningCount = typeRows.filter(r => r.findings?.some(f => f.status === 'warn' || f.status === 'danger')).length

          return (
            <button
              key={type}
              onClick={() => onSelectProduct(type)}
              style={{
                background: '#fff', borderRadius: 12, padding: '18px 20px',
                border: '1px solid var(--color-border)', cursor: 'pointer',
                textAlign: 'right', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'box-shadow 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-navy)' }}>
                  {PRODUCT_LABELS[type]}
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>
                  {typeRows.length} פוליסות ←
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-navy)', marginBottom: 8 }}>
                ₪{formatNum(typeAccum)}
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span>{activeCount} פעילים</span>
                {warningCount > 0 && (
                  <span style={{ color: 'var(--color-warn)', fontWeight: 600 }}>{warningCount} ממצאים</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const MARITAL_LABELS = { single: 'רווק/ה', married: 'נשוי/אה', divorced: 'גרוש/ה', widowed: 'אלמן/ה' }

function formatNum(n) {
  if (!n || n < 1000) return (n || 0).toLocaleString()
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  return Math.round(n).toLocaleString()
}

function StatCard({ label, value, large }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', border: '1px solid var(--color-border)' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: large ? 22 : 20, fontWeight: 800, color: 'var(--color-navy)' }}>{value}</div>
    </div>
  )
}

function GlobalFindingRow({ type, status, title, message }) {
  const borderColor = status === 'danger' ? '#EF4444' : status === 'warn' ? '#F59E0B' : status === 'ok' ? '#22C55E' : '#94A3B8'
  const bg          = status === 'danger' ? '#FEF2F2' : status === 'warn' ? '#FFFBEB' : status === 'ok' ? '#F0FDF4' : '#F8FAFC'
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

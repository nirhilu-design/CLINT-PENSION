import React, { useState } from 'react'
import FindingCard from './FindingCard.jsx'

const PRODUCT_LABELS = {
  pension:           'פנסיה',
  bituach_menahalim: 'ביטוח מנהלים',
  gemel:             'גמל',
  hishtalmut:        'השתלמות',
}

const PRODUCT_ORDER = ['pension', 'bituach_menahalim', 'gemel', 'hishtalmut']

export default function Dashboard({ analytics, clientProfile = {}, onReset }) {
  const { byType, globalFindings, summary, totalRows } = analytics
  const clientInfo = analytics.clientInfo || {}

  const availableTypes = PRODUCT_ORDER.filter(t => byType[t]?.length > 0)
  const tabs = ['overview', ...availableTypes]
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', direction: 'rtl' }}>
      {/* Top header */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0 0' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
                {clientInfo.clientName || 'לקוח'}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {[
                  clientInfo.age ? `גיל ${clientInfo.age}` : null,
                  clientInfo.clientId ? `ת.ז. ${clientInfo.clientId}` : null,
                  clientInfo.birthDate ? `נולד ${clientInfo.birthDate}` : null,
                  clientProfile.gender === 'male' ? 'זכר' : clientProfile.gender === 'female' ? 'נקבה' : null,
                  clientProfile.marital ? MARITAL_LABELS[clientProfile.marital] : null,
                  clientProfile.children > 0 ? `${clientProfile.children} ילדים` : null,
                ].filter(Boolean).join(' | ')}
              </div>
            </div>
            <button
              onClick={onReset}
              style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              העלה קבצים חדשים
            </button>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                padding: '10px 20px', border: 'none', background: 'none',
                fontWeight: activeTab === t ? 700 : 400,
                color: activeTab === t ? 'var(--color-primary)' : '#6b7280',
                borderBottom: `2px solid ${activeTab === t ? 'var(--color-primary)' : 'transparent'}`,
                cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap',
              }}>
                {t === 'overview' ? 'סקירה כללית' : PRODUCT_LABELS[t]}
                {t !== 'overview' && (
                  <span style={{ marginRight: 6, fontSize: 11, color: '#9ca3af' }}>({byType[t]?.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
        {activeTab === 'overview' && (
          <OverviewTab summary={summary} globalFindings={globalFindings} byType={byType} />
        )}
        {availableTypes.map(type => (
          activeTab === type && (
            <ProductTab key={type} rows={byType[type]} label={PRODUCT_LABELS[type]} />
          )
        ))}
      </div>
    </div>
  )
}

const MARITAL_LABELS = { single: 'רווק/ה', married: 'נשוי/אה', divorced: 'גרוש/ה', widowed: 'אלמן/ה' }

// ─── Overview Tab ─────────────────────────────────────────────────
function OverviewTab({ summary, globalFindings, byType }) {
  const { totalAccumulation, maxSalary, byType: typeStats, activeCount, totalCount } = summary

  return (
    <div>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard label="סה״כ צבירה" value={totalAccumulation > 0 ? `₪${Math.round(totalAccumulation).toLocaleString()}` : '—'} />
        <StatCard label="מוצרים פעילים" value={activeCount} />
        {maxSalary && <StatCard label="שכר מבוטח" value={`₪${maxSalary.toLocaleString()}`} />}
        {PRODUCT_ORDER.filter(t => typeStats[t]).map(t => (
          <StatCard
            key={t}
            label={PRODUCT_LABELS[t]}
            value={typeStats[t]?.accumulation > 0 ? `₪${Math.round(typeStats[t].accumulation).toLocaleString()}` : `${typeStats[t]?.count} מוצרים`}
          />
        ))}
      </div>

      {/* Global findings */}
      {globalFindings?.length > 0 && (
        <Section title="ממצאים כלל-תיק">
          {globalFindings.map((f, i) => <FindingCard key={i} {...f} />)}
        </Section>
      )}

      {/* Quick product summary */}
      <Section title="סקירת מוצרים">
        {PRODUCT_ORDER.filter(t => byType[t]).map(type => (
          <div key={type} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#374151' }}>{PRODUCT_LABELS[type]}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {byType[type].map((row, i) => <ProductMiniCard key={i} row={row} />)}
            </div>
          </div>
        ))}
      </Section>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  )
}

function ProductMiniCard({ row }) {
  const hasDanger  = row.findings?.some(f => f.status === 'danger')
  const hasWarn    = row.findings?.some(f => f.status === 'warn')
  const dotColor   = hasDanger ? '#ef4444' : hasWarn ? '#f59e0b' : '#22c55e'

  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 8, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: 13 }}>{row.issuer || '—'}</span>
        <span style={{ fontSize: 11, color: '#9ca3af', marginRight: 'auto' }}>
          {row.status === 'active' ? 'פעיל' : 'לא פעיל'}
        </span>
      </div>
      {row.planName && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{row.planName}</div>}
      {row.accumulation > 0 && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>
          ₪{Math.round(row.accumulation).toLocaleString()}
        </div>
      )}
    </div>
  )
}

// ─── Product Tab ──────────────────────────────────────────────────
function ProductTab({ rows, label }) {
  const activeRows   = rows.filter(r => r.status === 'active')
  const inactiveRows = rows.filter(r => r.status !== 'active')

  return (
    <div>
      {activeRows.length > 0 && (
        <Section title={`מוצרים פעילים (${activeRows.length})`}>
          {activeRows.map((row, i) => <ProductCard key={i} row={row} />)}
        </Section>
      )}
      {inactiveRows.length > 0 && (
        <Section title={`מוצרים לא פעילים (${inactiveRows.length})`}>
          {inactiveRows.map((row, i) => <ProductCard key={i} row={row} />)}
        </Section>
      )}
    </div>
  )
}

function ProductCard({ row }) {
  const [open, setOpen] = useState(true)

  const findingCount = row.findings?.filter(f => f.status === 'danger' || f.status === 'warn').length || 0
  const statusColor  = findingCount > 0 ? (row.findings?.some(f => f.status === 'danger') ? '#ef4444' : '#f59e0b') : '#22c55e'

  return (
    <div style={{
      background: '#fff', border: '1px solid var(--color-border)',
      borderRadius: 10, marginBottom: 12, overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px',
          cursor: 'pointer', borderBottom: open ? '1px solid var(--color-border)' : 'none',
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{row.issuer || '—'}</span>
          {row.planName && <span style={{ fontSize: 13, color: '#6b7280', marginRight: 10 }}>{row.planName}</span>}
        </div>
        <span style={{ fontSize: 11, color: row.status === 'active' ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
          {row.status === 'active' ? 'פעיל' : 'לא פעיל'}
        </span>
        {row.policyNumber && (
          <span style={{ fontSize: 11, color: '#9ca3af' }}>מס׳ {row.policyNumber}</span>
        )}
        <span style={{ color: '#9ca3af', fontSize: 12 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left: data fields */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase' }}>פרטי מוצר</div>
            <DataGrid rows={[
              ['יצרן', row.issuer],
              ['שכר', row.salary ? `₪${row.salary.toLocaleString()}` : null],
              ['צבירה', row.accumulation > 0 ? `₪${Math.round(row.accumulation).toLocaleString()}` : null],
              ['תשואה נטו', row.returnNet != null ? `${row.returnNet}%` : null],
              ['מסלול השקעה', row.investmentTrack],
              ['מעסיק', row.employerName],
            ]} />
          </div>

          {/* Right: findings */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', marginBottom: 10, textTransform: 'uppercase' }}>ממצאים</div>
            {row.findings?.length > 0
              ? row.findings.map((f, i) => <FindingCard key={i} {...f} />)
              : <div style={{ fontSize: 12, color: '#9ca3af' }}>אין ממצאים</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function DataGrid({ rows }) {
  return (
    <div>
      {rows.filter(([, v]) => v != null && v !== '').map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ color: '#6b7280' }}>{label}</span>
          <span style={{ fontWeight: 500, color: '#111827', maxWidth: '60%', textAlign: 'left' }}>{value}</span>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

import React from 'react'

export default function PolicyCard({ row, onSelect }) {
  const isActive = row.status === 'active'

  return (
    <div style={{
      background: '#fff', borderRadius: 12,
      padding: '16px 18px', border: '1px solid var(--color-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)', marginBottom: 2 }}>
            {row.planName || row.issuer}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {row.issuer}{row.policyNumber ? ` · ${row.policyNumber}` : ''}
          </div>
        </div>
        <span className={isActive ? 'badge badge-active' : 'badge badge-inactive'}>
          {isActive ? 'פעיל' : 'לא פעיל'}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', marginBottom: 10 }}>
        {row.accumulation > 0 && (
          <Stat label="צבירה" value={`₪${Math.round(row.accumulation).toLocaleString()}`} />
        )}
        {row.salary > 0 && (
          <Stat label="שכר מבוטח" value={`₪${row.salary.toLocaleString()}`} />
        )}
        {row.returnNet != null && (
          <Stat label="תשואה נטו" value={`${row.returnNet}%`} valueColor="var(--color-return)" />
        )}
      </div>

      {/* Investment track */}
      {row.investmentTrack && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 10 }}>
          {row.investmentTrack}
          {row.trackLabel && row.trackLabel !== 'לא ידוע' && (
            <span style={{ marginRight: 6, color: '#9CA3AF' }}>· {row.trackLabel}</span>
          )}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => onSelect(row)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'var(--color-primary)', fontSize: 12, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        לחץ לפרטים מלאים ←
      </button>
    </div>
  )
}

function Stat({ label, value, valueColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 1 }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 14, color: valueColor || 'var(--color-text)' }}>{value}</div>
    </div>
  )
}

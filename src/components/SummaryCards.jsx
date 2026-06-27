import React from 'react'

export default function SummaryCards({ cards }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          background: c.bg || 'var(--color-surface)',
          border: `1px solid ${c.border || 'var(--color-border)'}`,
          borderRadius: 10, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: c.color || 'var(--color-text)' }}>{c.value}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.label}</div>
        </div>
      ))}
    </div>
  )
}

import React from 'react'

const CONFIG = {
  ok:      { border: '#22c55e', bg: '#f0fdf4', icon: '✓',  labelColor: '#16a34a' },
  warn:    { border: '#f59e0b', bg: '#fffbeb', icon: '⚠',  labelColor: '#d97706' },
  danger:  { border: '#ef4444', bg: '#fef2f2', icon: '!',  labelColor: '#dc2626' },
  info:    { border: '#3b82f6', bg: '#eff6ff', icon: 'i',  labelColor: '#2563eb' },
}

const TYPE_LABELS = {
  finding:        'ממצא',
  information:    'מידע',
  limitation:     'מגבלת ניתוח',
  recommendation: 'המלצה',
}

export default function FindingCard({ type = 'information', status = 'ok', title, message }) {
  const cfg = CONFIG[status] || CONFIG.info

  return (
    <div style={{
      borderRight: `3px solid ${cfg.border}`,
      background: cfg.bg,
      borderRadius: '0 6px 6px 0',
      padding: '10px 12px',
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: message ? 3 : 0 }}>
        <span style={{
          width: 16, height: 16, borderRadius: '50%',
          background: cfg.border, color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 900, flexShrink: 0,
        }}>
          {cfg.icon}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: cfg.labelColor }}>
          {TYPE_LABELS[type] || type}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{title}</span>
      </div>
      {message && (
        <div style={{ fontSize: 12, color: '#374151', paddingRight: 22, lineHeight: 1.5 }}>{message}</div>
      )}
    </div>
  )
}

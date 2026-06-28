import React from 'react'

export default function Navbar({ clientName, onReset }) {
  return (
    <div style={{
      background: 'var(--color-navy)', color: '#fff',
      padding: '0 28px', height: 52, display: 'flex',
      alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 50,
      direction: 'rtl',
    }}>
      {/* Right: title */}
      <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: 0.3 }}>ניתוח פנסיוני</div>

      {/* Center: client name */}
      <div style={{ fontSize: 14, color: '#CBD5E1' }}>{clientName}</div>

      {/* Left: actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <button
          onClick={onReset}
          style={{
            background: 'none', border: 'none', color: '#94A3B8',
            fontSize: 13, cursor: 'pointer', padding: 0,
          }}
        >
          התחל מחדש
        </button>
        <span style={{ color: '#475569', fontSize: 18 }}>⚙</span>
      </div>
    </div>
  )
}

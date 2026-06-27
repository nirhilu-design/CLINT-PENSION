import React from 'react'

const CONFIG = {
  ok:                 { label: 'תקין',            cls: 'badge-ok',     icon: '✓' },
  overpaying:         { label: 'משלם יתר',        cls: 'badge-danger', icon: '⚠' },
  no_agreement:       { label: 'אין הסכם',        cls: 'badge-warn',   icon: '?' },
  invalid:            { label: 'לא תקין',         cls: 'badge-danger', icon: '✗' },
  suspicious:         { label: 'חשוד',            cls: 'badge-warn',   icon: '⚠' },
  missing:            { label: 'חסר מידע',        cls: 'badge-warn',   icon: '?' },
  not_applicable:     { label: 'לא רלוונטי',     cls: 'badge-muted',  icon: '—' },
  missing_section14:  { label: 'נדרש בירור',      cls: 'badge-info',   icon: 'ℹ' },
}

export default function StatusBadge({ status }) {
  const cfg = CONFIG[status] || { label: status || '—', cls: 'badge-muted', icon: '?' }
  return <span className={`badge ${cfg.cls}`}>{cfg.icon} {cfg.label}</span>
}

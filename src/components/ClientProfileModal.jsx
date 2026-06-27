import React, { useState } from 'react'

const OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 100, direction: 'rtl',
}

const CARD = {
  background: '#fff', borderRadius: 16, padding: '40px 36px',
  width: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
}

const ROW = { marginBottom: 20 }
const LABEL = { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 6, color: '#374151' }
const SELECT = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, background: '#fff',
}
const BTN = {
  width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
  background: 'var(--color-primary)', color: '#fff',
  fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 8,
}

export default function ClientProfileModal({ clientInfo, onConfirm }) {
  const [gender,  setGender]  = useState('')
  const [marital, setMarital] = useState('')
  const [children, setChildren] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onConfirm({ gender, marital, children: parseInt(children) || 0 })
  }

  return (
    <div style={OVERLAY}>
      <div style={CARD}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>פרופיל לקוח</h2>
        <p style={{ margin: '0 0 28px', fontSize: 13, color: '#6b7280' }}>
          מידע נוסף לניתוח מדויק יותר
        </p>

        {/* Info from XML */}
        {clientInfo?.clientName && (
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: '12px 16px', marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{clientInfo.clientName}</div>
            <div style={{ fontSize: 12, color: '#0369a1', marginTop: 2 }}>
              {clientInfo.age ? `גיל ${clientInfo.age}` : ''}
              {clientInfo.birthDate ? ` | נולד: ${clientInfo.birthDate}` : ''}
              {clientInfo.clientId ? ` | ת.ז.: ${clientInfo.clientId}` : ''}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={ROW}>
            <label style={LABEL}>מגדר</label>
            <select value={gender} onChange={e => setGender(e.target.value)} style={SELECT}>
              <option value="">בחר/י מגדר</option>
              <option value="male">זכר</option>
              <option value="female">נקבה</option>
            </select>
          </div>

          <div style={ROW}>
            <label style={LABEL}>מצב משפחתי</label>
            <select value={marital} onChange={e => setMarital(e.target.value)} style={SELECT}>
              <option value="">בחר/י מצב</option>
              <option value="single">רווק/ה</option>
              <option value="married">נשוי/אה</option>
              <option value="divorced">גרוש/ה</option>
              <option value="widowed">אלמן/ה</option>
            </select>
          </div>

          <div style={ROW}>
            <label style={LABEL}>מספר ילדים תלויים</label>
            <select value={children} onChange={e => setChildren(e.target.value)} style={SELECT}>
              <option value="">בחר/י</option>
              {[0, 1, 2, 3, 4, 5, '6+'].map(n => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>

          <button type="submit" style={BTN}>המשך לניתוח</button>

          <button
            type="button"
            onClick={() => onConfirm({ gender: '', marital: '', children: 0 })}
            style={{ width: '100%', padding: '10px 0', marginTop: 10, border: 'none', background: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}
          >
            דלג — נתח ללא מידע נוסף
          </button>
        </form>
      </div>
    </div>
  )
}

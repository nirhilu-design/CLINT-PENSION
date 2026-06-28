import React from 'react'

export default function PolicyDrawer({ row, onClose }) {
  if (!row) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 80 }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: 380, background: '#fff', zIndex: 90,
        display: 'flex', flexDirection: 'column',
        direction: 'rtl', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--color-navy)', color: '#fff',
          padding: '14px 20px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{row.planName || row.issuer}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', padding: '0 4px' }}>×</button>
        </div>

        <div style={{ padding: 20 }}>
          {/* פרטי הפוליסה */}
          <DrawerSection title="פרטי הפוליסה">
            <DrawerRow label="סוג מוצר"     value={PRODUCT_LABELS[row.productType] || row.productType} highlight />
            <DrawerRow label="מספר פוליסה"  value={row.policyNumber} highlight />
            <DrawerRow label="חברה מנהלת"  value={row.issuer} highlight />
            <DrawerRow label="סטטוס"        value={row.status === 'active' ? 'פעיל' : 'לא פעיל'} highlight statusColor={row.status === 'active' ? '#16A34A' : '#9CA3AF'} />
            {row.salary && <DrawerRow label="שכר מבוטח (מסלקה)" value={`₪${row.salary.toLocaleString()}`} highlight />}
          </DrawerSection>

          {/* מידע פיננסי */}
          <DrawerSection title="מידע פיננסי">
            {row.accumulation > 0 && <DrawerRow label="שווי צבירה" value={`₪${Math.round(row.accumulation).toLocaleString()}`} highlight />}
            {row.returnNet != null && <DrawerRow label="תשואה נטו" value={`${row.returnNet}%`} highlight valueColor="var(--color-return)" />}
            {row.feeFromAccumulation != null && <DrawerRow label="דמי ניהול מצבירה" value={`${row.feeFromAccumulation}%`} highlight />}
            {row.feeFromPremium != null && <DrawerRow label="דמי ניהול מפרמיה" value={`${row.feeFromPremium}%`} highlight />}

            {/* Investment tracks */}
            {row.investmentTracks?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>מסלולי השקעה</div>
                {row.investmentTracks.map((t, i) => (
                  <div key={i} style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                      {t.depositPercent != null ? `${t.depositPercent}% מהפקדה למסלול` : ''}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {t.accumulation > 0 ? `צבירה: ₪${Math.round(t.accumulation).toLocaleString()}` : ''}
                      {t.feeFromAccumulation != null ? ` | ד.נ מצבירה: ${t.feeFromAccumulation}%` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DrawerSection>

          {/* הפקדות */}
          {(row.depositEmployeePercent != null || row.depositEmployerPercent != null) && (
            <DrawerSection title="הפקדות">
              {row.depositEmployeePercent != null && (
                <DrawerRow
                  label="תגמולי עובד (עובד)"
                  value={`${row.depositEmployeePercent}%${row.salary ? ` | ₪${Math.round(row.salary * row.depositEmployeePercent / 100).toLocaleString()}` : ''}`}
                  highlight
                />
              )}
              {row.depositEmployerPercent != null && (
                <DrawerRow
                  label="תגמולי מעסיק (מעסיק)"
                  value={`${row.depositEmployerPercent}%${row.salary ? ` | ₪${Math.round(row.salary * row.depositEmployerPercent / 100).toLocaleString()}` : ''}`}
                  highlight
                />
              )}
              {row.depositPitzuimPercent != null && (
                <DrawerRow label="פיצויים" value={`${row.depositPitzuimPercent}%`} highlight />
              )}
              {row.salary && (row.depositEmployeePercent != null || row.depositEmployerPercent != null) && (
                <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '10px 12px', marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>סה״כ פרמיה חודשית</span>
                  <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-navy)' }}>
                    ₪{Math.round(row.salary * ((row.depositEmployeePercent || 0) + (row.depositEmployerPercent || 0) + (row.depositPitzuimPercent || 0)) / 100).toLocaleString()}
                  </span>
                </div>
              )}
            </DrawerSection>
          )}

          {/* ממצאים */}
          {row.findings?.length > 0 && (
            <DrawerSection title="ממצאים">
              {row.findings.map((f, i) => <DrawerFindingCard key={i} {...f} />)}
            </DrawerSection>
          )}
        </div>
      </div>
    </>
  )
}

const PRODUCT_LABELS = {
  pension: 'קרן פנסיה', bituach_menahalim: 'ביטוח מנהלים',
  gemel: 'קופת גמל', hishtalmut: 'קרן השתלמות',
}

function DrawerSection({ title, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-navy)', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--color-border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function DrawerRow({ label, value, highlight, valueColor, statusColor }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 400, color: statusColor || valueColor || 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function DrawerFindingCard({ type, status, title, message }) {
  const borderColor = status === 'danger' ? '#EF4444' : status === 'warn' ? '#F59E0B' : status === 'ok' ? '#22C55E' : '#94A3B8'
  const bg          = status === 'danger' ? '#FEF2F2' : status === 'warn' ? '#FFFBEB' : status === 'ok' ? '#F0FDF4' : '#F8FAFC'
  const TYPE_LABELS = { finding: 'ממצא', information: 'מידע', limitation: 'מגבלה', recommendation: 'המלצה' }

  return (
    <div style={{ borderRight: `3px solid ${borderColor}`, background: bg, borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: message ? 4 : 0 }}>
        <span className="badge badge-info" style={{ fontSize: 11 }}>{TYPE_LABELS[type] || type}</span>
        <span style={{ fontWeight: 700, fontSize: 13 }}>{title}</span>
      </div>
      {message && <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{message}</div>}
    </div>
  )
}

import React, { useState } from 'react'
import StatusBadge from './StatusBadge.jsx'
import SummaryCards from './SummaryCards.jsx'

const TABS = [
  { id: 'fees', label: 'דמי ניהול' },
  { id: 'insurance', label: 'מסלול ביטוחי' },
  { id: 'investment', label: 'מסלול השקעה' },
  { id: 'endage', label: 'תום תקופת ביטוח' },
]

export default function Dashboard({ analytics, onReset }) {
  const [activeTab, setActiveTab] = useState('fees')

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20 }}>דוח בקרת פנסיה</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            {analytics.totalRows} שורות נותחו
          </p>
        </div>
        <button
          onClick={onReset}
          style={{ padding: '8px 16px', border: '1px solid var(--color-border)', borderRadius: 8, background: '#fff', fontSize: 13 }}
        >
          העלה קובץ חדש
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--color-border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', fontWeight: activeTab === t.id ? 700 : 400,
              color: activeTab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer', fontSize: 14, marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'fees'       && <FeesTab data={analytics.managementFees} />}
      {activeTab === 'insurance'  && <InsuranceTab data={analytics.insuranceTrack} />}
      {activeTab === 'investment' && <InvestmentTab data={analytics.investmentTrack} />}
      {activeTab === 'endage'     && <EndAgeTab data={analytics.insuranceEndAge} />}
    </div>
  )
}

// ─── Fees Tab ────────────────────────────────────────────────
function FeesTab({ data }) {
  const { rows, summary } = data
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? rows : rows.filter(r => r.feeStatus === filter)

  const cards = [
    { value: summary.ok || 0,           label: 'תקין',        color: 'var(--color-ok)',     bg: 'var(--color-ok-bg)',     border: '#bbf7d0' },
    { value: summary.overpaying || 0,   label: 'משלם יתר',   color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: '#fecaca' },
    { value: summary.no_agreement || 0, label: 'ללא הסכם',   color: 'var(--color-warn)',   bg: 'var(--color-warn-bg)',   border: '#fde68a' },
  ]

  return (
    <div>
      <SummaryCards cards={cards} />
      <FilterBar value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'הכל' },
        { value: 'overpaying', label: 'משלם יתר' },
        { value: 'no_agreement', label: 'ללא הסכם' },
        { value: 'ok', label: 'תקין' },
      ]} />
      <TableCard>
        <table>
          <thead>
            <tr>
              <th>עובד</th><th>יצרן</th><th>דמ מפרמיה</th><th>הסכם פרמיה</th>
              <th>דמ מצבירה</th><th>הסכם צבירה</th><th>סטטוס</th><th>הערה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>אין נתונים</td></tr>}
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.employeeName || r.employeeCode || '—'}</td>
                <td>{r.issuer || '—'}</td>
                <td>{r.feeFromPremium != null ? `${r.feeFromPremium}%` : '—'}</td>
                <td>{r.agreedPremium != null ? `${r.agreedPremium}%` : '—'}</td>
                <td>{r.feeFromAccumulation != null ? `${r.feeFromAccumulation}%` : '—'}</td>
                <td>{r.agreedAccum != null ? `${r.agreedAccum}%` : '—'}</td>
                <td><StatusBadge status={r.feeStatus} /></td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.feeReason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}

// ─── Insurance Track Tab ─────────────────────────────────────
function InsuranceTab({ data }) {
  const { rows, summary } = data
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? rows : rows.filter(r => r.insuranceStatus === filter)

  const cards = [
    { value: summary.ok || 0,            label: 'תקין',        color: 'var(--color-ok)',     bg: 'var(--color-ok-bg)',     border: '#bbf7d0' },
    { value: summary.suspicious || 0,    label: 'חשוד',        color: 'var(--color-warn)',   bg: 'var(--color-warn-bg)',   border: '#fde68a' },
    { value: summary.missing || 0,       label: 'חסר מידע',   color: 'var(--color-info)',   bg: 'var(--color-info-bg)',   border: '#bae6fd' },
    { value: summary.not_applicable || 0,label: 'לא רלוונטי', color: 'var(--color-text-muted)', bg: '#f1f5f9', border: '#e2e8f0' },
  ]

  return (
    <div>
      <SummaryCards cards={cards} />
      <FilterBar value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'הכל' },
        { value: 'suspicious', label: 'חשוד' },
        { value: 'missing', label: 'חסר מידע' },
        { value: 'ok', label: 'תקין' },
        { value: 'not_applicable', label: 'לא רלוונטי' },
      ]} />
      <TableCard>
        <table>
          <thead>
            <tr><th>עובד</th><th>יצרן</th><th>מס׳ קרנות</th><th>סטטוס</th><th>הערה</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>אין נתונים</td></tr>}
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.employeeName || r.employeeCode || '—'}</td>
                <td>{r.issuer || '—'}</td>
                <td>{r.fundCount || 1}</td>
                <td><StatusBadge status={r.insuranceStatus} /></td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.insuranceReason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}

// ─── Investment Track Tab ─────────────────────────────────────
function InvestmentTab({ data }) {
  const { rows, summary, categoryBreakdown } = data
  const [filter, setFilter] = useState('all')
  const filtered = filter === 'all' ? rows : rows.filter(r => r.trackStatus === filter)

  const cards = [
    { value: summary.ok || 0,                label: 'תקין',           color: 'var(--color-ok)',     bg: 'var(--color-ok-bg)',     border: '#bbf7d0' },
    { value: summary.suspicious || 0,         label: 'חשוד',           color: 'var(--color-warn)',   bg: 'var(--color-warn-bg)',   border: '#fde68a' },
    { value: summary.missing_section14 || 0,  label: 'נדרש בירור',    color: 'var(--color-info)',   bg: 'var(--color-info-bg)',   border: '#bae6fd' },
    { value: summary.missing || 0,            label: 'חסר מסלול',     color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: '#fecaca' },
  ]

  const CATEGORY_LABELS = {
    AGE_BASED: 'מבוסס גיל', STOCKS: 'מניות', SP500: 'S&P500',
    INDEX: 'מחקה מדד', BONDS: "אג\"ח", SHEKEL: 'שקלי', GENERAL: 'כללי', unknown: 'לא ידוע',
  }

  return (
    <div>
      <SummaryCards cards={cards} />

      {/* Category breakdown */}
      {categoryBreakdown && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>פילוח מסלולים</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(categoryBreakdown).map(([cat, cnt]) => (
              <div key={cat} style={{ background: '#f8fafc', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
                <span style={{ fontWeight: 700 }}>{cnt}</span>
                <span style={{ color: 'var(--color-text-muted)', marginRight: 6 }}>{CATEGORY_LABELS[cat] || cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <FilterBar value={filter} onChange={setFilter} options={[
        { value: 'all', label: 'הכל' },
        { value: 'suspicious', label: 'חשוד' },
        { value: 'missing_section14', label: 'נדרש בירור' },
        { value: 'ok', label: 'תקין' },
      ]} />
      <TableCard>
        <table>
          <thead>
            <tr><th>עובד</th><th>יצרן</th><th>מסלול</th><th>קטגוריה</th><th>סטטוס</th><th>הערה</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>אין נתונים</td></tr>}
            {filtered.map((r, i) => (
              <tr key={i}>
                <td>{r.employeeName || r.employeeCode || '—'}</td>
                <td>{r.issuer || '—'}</td>
                <td style={{ fontSize: 12 }}>{r.investmentTrack || '—'}</td>
                <td>{r.trackLabel || '—'}</td>
                <td><StatusBadge status={r.trackStatus} /></td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.trackReason || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}

// ─── Insurance End Age Tab ───────────────────────────────────
function EndAgeTab({ data }) {
  const { rows, totalChecked, flaggedCount } = data

  const cards = [
    { value: totalChecked,  label: 'סה"כ נבדקו',     color: 'var(--color-text)' },
    { value: flaggedCount,  label: 'גיל תום < 67',   color: 'var(--color-danger)', bg: 'var(--color-danger-bg)', border: '#fecaca' },
    { value: totalChecked - flaggedCount, label: 'תקין', color: 'var(--color-ok)', bg: 'var(--color-ok-bg)', border: '#bbf7d0' },
  ]

  return (
    <div>
      <SummaryCards cards={cards} />
      <TableCard>
        <table>
          <thead>
            <tr><th>עובד</th><th>יצרן</th><th>גיל תום ביטוח</th><th>הערה</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-ok)' }}>✓ אין עובדים עם גיל תום ביטוח מתחת ל-67</td></tr>}
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.employeeName || r.employeeCode || '—'}</td>
                <td>{r.issuer || '—'}</td>
                <td style={{ color: 'var(--color-danger)', fontWeight: 700 }}>{r.insuranceEndAge}</td>
                <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{r.insuranceEndAgeReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </div>
  )
}

// ─── Shared helpers ──────────────────────────────────────────
function TableCard({ children }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

function FilterBar({ value, onChange, options }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: '5px 14px', borderRadius: 999, border: '1px solid',
            borderColor: value === o.value ? 'var(--color-primary)' : 'var(--color-border)',
            background: value === o.value ? 'var(--color-primary-light)' : '#fff',
            color: value === o.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontWeight: value === o.value ? 700 : 400, fontSize: 12,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

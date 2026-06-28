import React, { useState } from 'react'
import Navbar from './Navbar.jsx'
import SummaryPage from './SummaryPage.jsx'
import ProductPage from './ProductPage.jsx'
import PolicyDrawer from './PolicyDrawer.jsx'

export default function Dashboard({ analytics, clientProfile = {}, onReset }) {
  const [view, setView] = useState('summary')          // 'summary' | product type key
  const [drawerRow, setDrawerRow] = useState(null)

  const { byType } = analytics
  const clientInfo = analytics.clientInfo || {}

  const clientName = clientInfo.clientName || 'לקוח'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', direction: 'rtl' }}>
      <Navbar clientName={clientName} onReset={onReset} />

      {/* Sub-nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 40px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          <NavTab label="סיכום מנהלים" active={view === 'summary'} onClick={() => setView('summary')} primary />
          {Object.keys(byType).map(type => (
            <NavTab
              key={type}
              label={PRODUCT_LABELS[type] || type}
              active={view === type}
              onClick={() => setView(type)}
              count={byType[type]?.length}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      {view === 'summary' && (
        <SummaryPage
          analytics={analytics}
          clientInfo={clientInfo}
          clientProfile={clientProfile}
          onSelectProduct={setView}
        />
      )}
      {Object.keys(byType).map(type =>
        view === type && (
          <ProductPage
            key={type}
            type={type}
            rows={byType[type]}
            onSelectPolicy={setDrawerRow}
          />
        )
      )}

      {/* Policy detail drawer */}
      <PolicyDrawer row={drawerRow} onClose={() => setDrawerRow(null)} />
    </div>
  )
}

const PRODUCT_LABELS = {
  pension:           'פנסיה',
  bituach_menahalim: 'ביטוח מנהלים',
  gemel:             'גמל',
  hishtalmut:        'השתלמות',
}

function NavTab({ label, active, onClick, primary, count }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 20px', border: 'none', cursor: 'pointer',
        fontWeight: active ? 700 : 500, fontSize: 13,
        background: active && primary ? 'var(--color-primary)' : 'none',
        color: active && primary ? '#fff' : active ? 'var(--color-navy)' : 'var(--color-text-muted)',
        borderBottom: active && !primary ? '2px solid var(--color-navy)' : '2px solid transparent',
        borderRadius: primary && active ? 6 : 0,
        margin: primary ? '6px 8px 6px 0' : 0,
        transition: 'all 0.15s',
      }}
    >
      {label}
      {count != null && !active && (
        <span style={{ marginRight: 5, fontSize: 11, color: '#9CA3AF' }}>({count})</span>
      )}
    </button>
  )
}

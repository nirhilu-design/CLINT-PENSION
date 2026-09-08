import type { ReactNode } from 'react'
import { Shield, RefreshCw } from 'lucide-react'
import { useApp } from '../hooks/useAppState'
import { NAV } from './Sidebar'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

const NAV_H = 62

/** Phone shell: a compact sticky top bar and a fixed bottom tab bar, replacing
 *  the desktop sidebar. Desktop keeps <Sidebar/> (see App). */
export default function MobileShell({ children }: { children: ReactNode }) {
  const { state, dispatch } = useApp()
  const client = state.analysis?.client
  if (!client) return null

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page)', fontFamily: 'var(--font-ui)' }}>
      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 14px',
          background: 'linear-gradient(180deg,#001a45,#000f2b)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span style={{ width: 28, height: 28, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,var(--teal-400),var(--clint-500))', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Shield size={15} color="#fff" />
        </span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>clint</span>
        <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '42vw' }}>
            {client.fullName}
          </span>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal-500),var(--teal-700))', display: 'grid', placeItems: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {initials(client.fullName)}
          </span>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            aria-label="ניתוח חדש"
            style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Scrollable content */}
      <main data-app-main className="clint-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: NAV_H + 8 }}>
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav
        style={{
          position: 'fixed',
          insetInline: 0,
          bottom: 0,
          zIndex: 20,
          height: NAV_H,
          display: 'flex',
          background: 'linear-gradient(180deg,#001a45,#000f2b)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV.map((item) => {
          const active = item.isActive(state.step)
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => dispatch(item.action)}
              aria-current={active ? 'page' : undefined}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                padding: '6px 2px',
              }}
            >
              <Icon size={19} color={active ? 'var(--accent-coral)' : 'rgba(255,255,255,0.55)'} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500 }}>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

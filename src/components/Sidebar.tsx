import { Shield, LayoutDashboard, FileText, Briefcase, SlidersHorizontal, RefreshCw, Eye, UserCog } from 'lucide-react'
import { useApp, type Step, type ViewMode } from '../hooks/useAppState'
import type { AppAction } from '../hooks/useAppState'

type NavItem = {
  label: string
  icon: typeof Shield
  action: AppAction
  isActive: (step: Step) => boolean
}

const NAV: NavItem[] = [
  {
    label: 'דשבורד',
    icon: LayoutDashboard,
    action: { type: 'GO_DASHBOARD' },
    isActive: (s) => s === 'dashboard' || s === 'product',
  },
  { label: 'סיכום מנהלים', icon: FileText, action: { type: 'GO_SUMMARY' }, isActive: (s) => s === 'summary' },
  { label: 'אזור יועץ', icon: Briefcase, action: { type: 'GO_ADVISOR' }, isActive: (s) => s === 'advisor' },
  { label: 'אזור לוגיקות', icon: SlidersHorizontal, action: { type: 'GO_LOGIC' }, isActive: (s) => s === 'logic' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

export default function Sidebar() {
  const { state, dispatch } = useApp()
  const client = state.analysis?.client
  if (!client) return null

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: 'var(--clint-950)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '22px 20px 18px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg,var(--teal-400),var(--clint-500))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Shield size={16} color="#fff" />
        </span>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 16, letterSpacing: '-0.01em' }}>clint</span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px' }}>
        {NAV.map((item) => {
          const active = item.isActive(state.step)
          const Icon = item.icon
          return (
            <button
              key={item.label}
              onClick={() => dispatch(item.action)}
              style={{
                width: '100%',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                marginBottom: 2,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* View mode: advisor sees everything (notes collapsed); client view hides background notes */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>
          תצוגה
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-md)', padding: 3 }}>
          {([
            { mode: 'advisor', label: 'יועץ', icon: UserCog },
            { mode: 'client', label: 'לקוח', icon: Eye },
          ] as { mode: ViewMode; label: string; icon: typeof Eye }[]).map(({ mode, label, icon: Icon }) => {
            const on = state.viewMode === mode
            return (
              <button
                key={mode}
                onClick={() => dispatch({ type: 'SET_VIEW_MODE', viewMode: mode })}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: 'calc(var(--radius-md) - 3px)',
                  background: on ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: on ? '#fff' : 'rgba(255,255,255,0.55)',
                  fontSize: 12.5,
                  fontWeight: on ? 700 : 500,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Icon size={14} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Client footer + new analysis */}
      <div style={{ padding: '14px 16px 22px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,var(--teal-500),var(--teal-700))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials(client.fullName)}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {client.fullName}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
              {client.id}
            </div>
          </div>
        </div>
        <button
          onClick={() => dispatch({ type: 'RESET' })}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            padding: '8px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.7)',
            fontSize: 12.5,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={13} />
          ניתוח חדש
        </button>
      </div>
    </aside>
  )
}

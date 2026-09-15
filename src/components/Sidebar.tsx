import {
  Shield,
  Home,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Compass,
  Flag,
  FolderOpen,
  Users,
  FileText,
  Settings,
  RefreshCw,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useApp, type Step } from '../hooks/useAppState'
import type { AppAction } from '../hooks/useAppState'
import HealthMeter from './HealthMeter'
import { computeHealthScore } from '../services/healthScoreService'

/**
 * Sidebar topics mirror the V2 mockup. Items are of three kinds:
 *  - route:   navigates to a real app screen (dashboard / advisor / summary / logic)
 *  - section: scrolls to a section of the dashboard (products / allocation / …)
 *  - soon:    a mockup topic with no backing screen yet (shown, disabled)
 * The extras we already have — portfolio-health meter, client footer, "ניתוח חדש" —
 * are kept below/above the nav.
 */
type RouteItem = { kind: 'route'; label: string; icon: LucideIcon; action: AppAction; isActive: (s: Step) => boolean }
type SectionItem = { kind: 'section'; label: string; icon: LucideIcon; sectionId: string; badgeKind?: 'findings' }
type SoonItem = { kind: 'soon'; label: string; icon: LucideIcon }
type NavItem = RouteItem | SectionItem | SoonItem

const NAV: NavItem[] = [
  { kind: 'route', label: 'תמונת מצב', icon: Home, action: { type: 'GO_DASHBOARD' }, isActive: (s) => s === 'dashboard' || s === 'product' },
  { kind: 'section', label: 'מוצרים', icon: Wallet, sectionId: 'products' },
  { kind: 'section', label: 'השקעות', icon: TrendingUp, sectionId: 'portfolio' },
  { kind: 'section', label: 'ביטוחים', icon: ShieldCheck, sectionId: 'insurance' },
  { kind: 'section', label: 'תחזית פרישה', icon: Compass, sectionId: 'portfolio' },
  { kind: 'section', label: 'נקודות לטיפול', icon: Flag, sectionId: 'key-findings', badgeKind: 'findings' },
  { kind: 'soon', label: 'מסמכים', icon: FolderOpen },
  { kind: 'route', label: 'לקוחות', icon: Users, action: { type: 'GO_ADVISOR' }, isActive: (s) => s === 'advisor' },
  { kind: 'route', label: 'דוחות', icon: FileText, action: { type: 'GO_SUMMARY' }, isActive: (s) => s === 'summary' },
  { kind: 'route', label: 'הגדרות', icon: Settings, action: { type: 'GO_LOGIC' }, isActive: (s) => s === 'logic' },
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—'
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { state, dispatch } = useApp()
  const analysis = state.analysis
  const client = analysis?.client
  if (!analysis || !client) return null

  const health = computeHealthScore(analysis, state.logicConfig.healthWeights)
  const actionableCount = analysis.findings.filter((f) => f.severity !== 'info').length
  const gapCount = analysis.findings.filter((f) => f.severity === 'gap').length

  // Scroll to a dashboard section, navigating to the dashboard first if needed.
  const goToSection = (id: string) => {
    dispatch({ type: 'GO_DASHBOARD' })
    onNavigate?.()
    requestAnimationFrame(() =>
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60),
    )
  }

  const handle = (item: NavItem) => {
    if (item.kind === 'route') {
      dispatch(item.action)
      onNavigate?.()
    } else if (item.kind === 'section') {
      goToSection(item.sectionId)
    }
  }

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: 'linear-gradient(180deg,#001a45,#000f2b)',
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
            background: 'linear-gradient(135deg,var(--cyan-500),var(--clint-600))',
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

      {/* Portfolio health (kept from our version) */}
      <div style={{ padding: '14px 12px 4px' }}>
        <HealthMeter health={health} />
      </div>

      {/* Nav — topics per the mockup */}
      <nav style={{ flex: 1, padding: '14px 10px', overflowY: 'auto' }} className="clint-scroll">
        {NAV.map((item) => {
          const active = item.kind === 'route' && item.isActive(state.step)
          const disabled = item.kind === 'soon'
          const Icon = item.icon
          const badge = item.kind === 'section' && item.badgeKind === 'findings' ? actionableCount : 0
          return (
            <button
              key={item.label}
              onClick={() => handle(item)}
              disabled={disabled}
              title={disabled ? 'בקרוב' : undefined}
              style={{
                position: 'relative',
                width: '100%',
                textAlign: 'right',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'rgba(255,255,255,0.09)' : 'transparent',
                color: active ? '#fff' : disabled ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.62)',
                fontSize: 14,
                fontWeight: active ? 700 : 500,
                marginBottom: 2,
                border: 'none',
                cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 160ms, color 160ms',
              }}
            >
              {active && (
                <span
                  style={{
                    position: 'absolute',
                    insetInlineStart: -10,
                    top: 9,
                    bottom: 9,
                    width: 3,
                    borderRadius: 3,
                    background: 'var(--cyan-500)',
                  }}
                />
              )}
              <Icon size={17} style={{ flexShrink: 0, color: active ? 'var(--cyan-400)' : 'rgba(255,255,255,0.5)' }} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {disabled && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>בקרוב</span>}
              {badge > 0 && (
                <span
                  style={{
                    minWidth: 19,
                    height: 19,
                    padding: '0 5px',
                    borderRadius: 'var(--radius-full)',
                    background: gapCount > 0 ? 'var(--color-danger)' : 'var(--color-warning)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Client footer + new analysis (kept from our version) */}
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
          onClick={() => {
            dispatch({ type: 'RESET' })
            onNavigate?.()
          }}
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

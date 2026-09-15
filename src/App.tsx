import { useEffect, useState } from 'react'
import { Menu, Shield, Bell } from 'lucide-react'
import { useApp, type Step } from './hooks/useAppState'
import { useIsMobile } from './hooks/useMediaQuery'
import UploadPage from './pages/UploadPage'
import DashboardPage from './pages/DashboardPage'
import ProductPage from './pages/ProductPage'
import ExecutiveSummaryPage from './pages/ExecutiveSummaryPage'
import AdvisorPage from './pages/AdvisorPage'
import LogicEditorPage from './pages/LogicEditorPage'
import PolicyDrawer from './components/PolicyDrawer'
import Sidebar from './components/Sidebar'

// Screens that live inside the sidebar app shell.
const SHELL_STEPS: Step[] = ['dashboard', 'product', 'summary', 'advisor', 'logic']

export default function App() {
  const { state, dispatch } = useApp()
  const mobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)

  const selectedPolicy = state.analysis?.policies.find(
    (p) => p.id === state.selectedPolicyId,
  )

  // SPA screen changes keep the previous scroll position — reset it, close menu
  useEffect(() => {
    document.querySelector('[data-app-main]')?.scrollTo(0, 0)
    window.scrollTo(0, 0)
    setMenuOpen(false)
  }, [state.step, state.selectedProduct])

  const inShell = SHELL_STEPS.includes(state.step) && state.analysis

  const page = (
    <>
      {state.step === 'upload' && <UploadPage />}
      {state.step === 'dashboard' && state.analysis && <DashboardPage />}
      {state.step === 'product' && state.analysis && state.selectedProduct && <ProductPage />}
      {state.step === 'summary' && state.analysis && <ExecutiveSummaryPage />}
      {state.step === 'advisor' && state.analysis && <AdvisorPage />}
      {state.step === 'logic' && <LogicEditorPage />}
    </>
  )

  return (
    <>
      {inShell ? (
        mobile ? (
          <div
            dir="rtl"
            style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-page)', fontFamily: 'var(--font-ui)', overflow: 'hidden' }}
          >
            {/* Mobile top bar */}
            <header
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'linear-gradient(120deg,#0f2647,var(--clint-800))', color: '#fff' }}
            >
              <button
                onClick={() => setMenuOpen(true)}
                aria-label="פתיחת תפריט"
                style={{ display: 'grid', placeItems: 'center', width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <Menu size={19} />
              </button>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 16 }}>
                <span style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,var(--cyan-500),var(--clint-600))', display: 'grid', placeItems: 'center' }}>
                  <Shield size={14} color="#fff" />
                </span>
                clint
              </span>
              {(() => {
                const fs = state.analysis?.findings ?? []
                const count = fs.filter((f) => f.severity !== 'info').length
                const gaps = fs.filter((f) => f.severity === 'gap').length
                return (
                  <button
                    onClick={() => document.getElementById('key-findings')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    aria-label={`${count} נקודות לטיפול`}
                    style={{ marginInlineStart: 'auto', position: 'relative', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                  >
                    <Bell size={17} />
                    {count > 0 && (
                      <span style={{ position: 'absolute', top: -2, insetInlineStart: -2, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 'var(--radius-full)', background: gaps > 0 ? 'var(--color-danger)' : 'var(--color-warning)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'grid', placeItems: 'center', border: '2px solid #0f2647' }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })()}
            </header>
            <main data-app-main className="clint-scroll" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
              {page}
            </main>
            {/* Slide-in nav drawer */}
            {menuOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, background: 'var(--color-bg-overlay)' }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0 }}>
                  <Sidebar onNavigate={() => setMenuOpen(false)} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            dir="rtl"
            style={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'row-reverse',
              background: 'var(--color-bg-page)',
              fontFamily: 'var(--font-ui)',
              overflow: 'hidden',
            }}
          >
            <Sidebar />
            <main data-app-main className="clint-scroll" style={{ flex: 1, overflowY: 'auto', height: '100vh', position: 'relative' }}>
              {page}
            </main>
          </div>
        )
      ) : (
        page
      )}

      {selectedPolicy && state.analysis && (
        <PolicyDrawer
          policy={selectedPolicy}
          findings={state.analysis.findings}
          allocation={state.analysis.supplementary.treasuryAllocations.find(
            (a) => a.mofid === selectedPolicy.mofid,
          )}
          onClose={() => dispatch({ type: 'CLOSE_POLICY' })}
        />
      )}
    </>
  )
}

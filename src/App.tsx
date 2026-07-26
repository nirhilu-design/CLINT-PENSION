import { useEffect } from 'react'
import { useApp, type Step } from './hooks/useAppState'
import UploadPage from './pages/UploadPage'
import SupplementaryFormPage from './pages/SupplementaryFormPage'
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

  const selectedPolicy = state.analysis?.policies.find(
    (p) => p.policyNumber === state.selectedPolicyNumber,
  )

  // SPA screen changes keep the previous scroll position — reset it
  useEffect(() => {
    document.querySelector('[data-app-main]')?.scrollTo(0, 0)
    window.scrollTo(0, 0)
  }, [state.step, state.selectedProduct])

  const inShell = SHELL_STEPS.includes(state.step) && state.analysis

  const page = (
    <>
      {state.step === 'upload' && <UploadPage />}
      {state.step === 'form' && <SupplementaryFormPage />}
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

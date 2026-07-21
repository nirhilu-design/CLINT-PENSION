import { useEffect } from 'react'
import { useApp } from './hooks/useAppState'
import UploadPage from './pages/UploadPage'
import SupplementaryFormPage from './pages/SupplementaryFormPage'
import DashboardPage from './pages/DashboardPage'
import ProductPage from './pages/ProductPage'
import ExecutiveSummaryPage from './pages/ExecutiveSummaryPage'
import AdvisorPage from './pages/AdvisorPage'
import RulesPage from './pages/RulesPage'
import PersonalDetailsPage from './pages/PersonalDetailsPage'
import PolicyDrawer from './components/PolicyDrawer'
import Navbar from './components/Navbar'

export default function App() {
  const { state, dispatch } = useApp()

  const selectedPolicy = state.analysis?.policies.find(
    (p) => p.policyNumber === state.selectedPolicyNumber,
  )

  // SPA screen changes keep the previous scroll position — reset it
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [state.step, state.selectedProduct])

  const showNavbar = ['dashboard', 'product', 'summary', 'advisor', 'rules', 'personal'].includes(state.step)

  return (
    <>
      {showNavbar && <Navbar />}
      {state.step === 'upload' && <UploadPage />}
      {state.step === 'form' && <SupplementaryFormPage />}
      {state.step === 'dashboard' && state.analysis && <DashboardPage />}
      {state.step === 'product' && state.analysis && state.selectedProduct && <ProductPage />}
      {state.step === 'summary' && state.analysis && <ExecutiveSummaryPage />}
      {state.step === 'advisor' && state.analysis && <AdvisorPage />}
      {state.step === 'rules' && state.analysis && <RulesPage />}
      {state.step === 'personal' && state.analysis && <PersonalDetailsPage />}

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

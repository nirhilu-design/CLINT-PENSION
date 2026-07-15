import { useApp } from './hooks/useAppState'
import UploadPage from './pages/UploadPage'
import SupplementaryFormPage from './pages/SupplementaryFormPage'
import DashboardPage from './pages/DashboardPage'
import ProductPage from './pages/ProductPage'
import ExecutiveSummaryPage from './pages/ExecutiveSummaryPage'
import PolicyDrawer from './components/PolicyDrawer'

export default function App() {
  const { state, dispatch } = useApp()

  const selectedPolicy = state.analysis?.policies.find(
    (p) => p.policyNumber === state.selectedPolicyNumber,
  )

  return (
    <>
      {state.step === 'upload' && <UploadPage />}
      {state.step === 'form' && <SupplementaryFormPage />}
      {state.step === 'dashboard' && state.analysis && <DashboardPage />}
      {state.step === 'product' && state.analysis && state.selectedProduct && <ProductPage />}
      {state.step === 'summary' && state.analysis && <ExecutiveSummaryPage />}

      {selectedPolicy && state.analysis && (
        <PolicyDrawer
          policy={selectedPolicy}
          findings={state.analysis.findings}
          onClose={() => dispatch({ type: 'CLOSE_POLICY' })}
        />
      )}
    </>
  )
}

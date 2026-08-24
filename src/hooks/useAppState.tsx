import { createContext, useContext, useReducer, type ReactNode, type Dispatch } from 'react'
import type { Analysis, ProductType, SupplementaryInfo } from '../models/types'
import type { ParsedFile } from '../parser/parsePensionXml'
import { defaultLogicConfig, type LogicConfig } from '../config/logicConfig'

export type Step = 'upload' | 'dashboard' | 'product' | 'summary' | 'advisor' | 'logic'

export interface AppState {
  step: Step
  parsedFiles: ParsedFile[]
  analysis: Analysis | null
  logicConfig: LogicConfig
  selectedProduct: ProductType | null
  selectedPolicyNumber: string | null
  error: string | null
}

export type AppAction =
  | { type: 'FILES_PARSED'; parsedFiles: ParsedFile[] }
  | { type: 'PARSE_ERROR'; error: string }
  | { type: 'ANALYSIS_READY'; analysis: Analysis }
  | { type: 'OPEN_PRODUCT'; productType: ProductType }
  | { type: 'OPEN_POLICY'; policyNumber: string }
  | { type: 'CLOSE_POLICY' }
  | { type: 'GO_DASHBOARD' }
  | { type: 'GO_SUMMARY' }
  | { type: 'GO_ADVISOR' }
  | { type: 'GO_LOGIC' }
  | { type: 'ANALYSIS_UPDATED'; analysis: Analysis }
  | { type: 'LOGIC_UPDATED'; logicConfig: LogicConfig; analysis: Analysis }
  | { type: 'RESET' }

const initialState: AppState = {
  step: 'upload',
  parsedFiles: [],
  analysis: null,
  logicConfig: defaultLogicConfig(),
  selectedProduct: null,
  selectedPolicyNumber: null,
  error: null,
}

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'FILES_PARSED':
      // Store the parsed files; the dashboard is reached via ANALYSIS_READY,
      // which runs immediately after upload with empty context info.
      return { ...state, parsedFiles: action.parsedFiles, error: null }
    case 'PARSE_ERROR':
      return { ...state, error: action.error }
    case 'ANALYSIS_READY':
      return { ...state, analysis: action.analysis, step: 'dashboard', error: null }
    case 'OPEN_PRODUCT':
      return { ...state, selectedProduct: action.productType, step: 'product' }
    case 'OPEN_POLICY':
      return { ...state, selectedPolicyNumber: action.policyNumber }
    case 'CLOSE_POLICY':
      return { ...state, selectedPolicyNumber: null }
    case 'GO_DASHBOARD':
      return { ...state, step: 'dashboard', selectedProduct: null, selectedPolicyNumber: null }
    case 'GO_SUMMARY':
      return { ...state, step: 'summary', selectedPolicyNumber: null }
    case 'GO_ADVISOR':
      return { ...state, step: 'advisor', selectedPolicyNumber: null }
    case 'GO_LOGIC':
      return { ...state, step: 'logic', selectedPolicyNumber: null }
    case 'ANALYSIS_UPDATED':
      return { ...state, analysis: action.analysis }
    case 'LOGIC_UPDATED':
      return { ...state, logicConfig: action.logicConfig, analysis: action.analysis }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<AppAction> } | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export type { SupplementaryInfo }

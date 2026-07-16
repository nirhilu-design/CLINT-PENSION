import { useApp } from '../hooks/useAppState'

export default function Navbar() {
  const { state, dispatch } = useApp()
  const client = state.analysis?.client
  if (!client) return null

  const navButton = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-blue-600 text-white grid place-items-center font-bold text-sm">
            פ
          </span>
          <div className="leading-tight">
            <div className="font-semibold text-slate-800 text-sm">{client.fullName}</div>
            <div className="text-xs text-slate-400">ת.ז. {client.id}</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {navButton('דשבורד', state.step === 'dashboard' || state.step === 'product', () =>
            dispatch({ type: 'GO_DASHBOARD' }),
          )}
          {navButton('סיכום מנהלים', state.step === 'summary', () => dispatch({ type: 'GO_SUMMARY' }))}
          <span className="w-px h-6 bg-slate-200 mx-1" />
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100"
          >
            ניתוח חדש
          </button>
        </nav>
      </div>
    </header>
  )
}

import { useApp } from '../hooks/useAppState'

export default function Navbar() {
  const { state, dispatch } = useApp()
  const client = state.analysis?.client
  if (!client) return null

  const navButton = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition ${
        active ? 'bg-white/15 text-white' : 'text-slate-300 hover:text-white hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  )

  return (
    <header className="sticky top-0 z-30 bg-[#0c1f38] shadow-md shadow-slate-900/10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#16ab99] to-[#0e9484] text-white grid place-items-center font-bold text-sm shadow-inner">
            פ
          </span>
          <div className="leading-tight">
            <div className="font-semibold text-white text-sm">{client.fullName}</div>
            <div className="text-xs text-slate-400 tabular">ת.ז. {client.id}</div>
          </div>
        </div>
        <nav className="flex items-center gap-1">
          {navButton('דשבורד', state.step === 'dashboard' || state.step === 'product', () =>
            dispatch({ type: 'GO_DASHBOARD' }),
          )}
          {navButton('סיכום מנהלים', state.step === 'summary', () => dispatch({ type: 'GO_SUMMARY' }))}
          {navButton('אזור יועץ', state.step === 'advisor', () => dispatch({ type: 'GO_ADVISOR' }))}
          <span className="w-px h-5 bg-white/15 mx-2" />
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="px-3.5 py-1.5 rounded-full text-sm text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            ניתוח חדש
          </button>
        </nav>
      </div>
    </header>
  )
}

import { useApp } from '../hooks/useAppState'
import FindingCard from '../components/FindingCard'

export default function ExecutiveSummaryPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { executiveSummary, client } = analysis

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
        className="text-sm text-blue-600 hover:underline mb-4"
      >
        → חזרה לדשבורד
      </button>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">סיכום מנהלים</h1>
      <p className="text-sm text-slate-500 mb-6">{client.fullName} · ת.ז. {client.id}</p>

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">ממצאים עיקריים</h2>
        {executiveSummary.topFindings.length === 0 ? (
          <p className="text-sm text-slate-400">לא נמצאו ממצאים הדורשים בדיקה</p>
        ) : (
          <div className="space-y-2">
            {executiveSummary.topFindings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        )}
      </section>

      {(() => {
        const clientInfo = analysis.findings.filter(
          (f) => f.level === 'client' && f.severity === 'info' && f.category !== 'limitation',
        )
        return clientInfo.length > 0 ? (
          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3">תמונה מרוכזת</h2>
            <div className="space-y-2">
              {clientInfo.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          </section>
        ) : null
      })()}

      <section className="mb-6">
        <h2 className="text-lg font-bold text-slate-800 mb-3">נקודות חוזק</h2>
        <ul className="space-y-1.5">
          {executiveSummary.strengths.map((s, i) => (
            <li key={i} className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              ✓ {s}
            </li>
          ))}
        </ul>
      </section>

      {executiveSummary.limitations.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-3">מגבלות הניתוח</h2>
          <ul className="space-y-1.5">
            {executiveSummary.limitations.map((l, i) => (
              <li key={i} className="rounded-lg bg-slate-100 border border-slate-200 p-3 text-sm text-slate-600">
                {l}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

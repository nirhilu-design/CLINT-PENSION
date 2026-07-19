import { Component, type ReactNode } from 'react'

interface State {
  hasError: boolean
}

// Last-resort guard: a runtime error shows a friendly recovery screen
// instead of a blank page. Client-side only — no data leaves the browser.
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center rounded-2xl bg-white border border-slate-200/70 shadow-sm p-8">
          <h1 className="text-xl font-bold text-slate-800 mb-2">משהו השתבש</h1>
          <p className="text-sm text-slate-500 mb-5 leading-relaxed">
            אירעה שגיאה בלתי צפויה בהצגת המסך. הנתונים שלך לא נשלחו לשום מקום —
            אפשר לרענן ולהתחיל ניתוח חדש.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl bg-brand-800 text-white font-semibold py-2.5 px-8 hover:bg-brand-700"
          >
            רענון והתחלה מחדש
          </button>
        </div>
      </div>
    )
  }
}

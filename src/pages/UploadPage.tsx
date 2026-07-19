import { useRef, useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { parseFiles, XmlParseError } from '../services/analysisService'
import StepsIndicator from '../components/StepsIndicator'
import Spinner from '../components/Spinner'

export default function UploadPage() {
  const { state, dispatch } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setBusy(true)
    try {
      const files = await Promise.all(
        [...fileList].map(async (f) => ({ name: f.name, text: await f.text() })),
      )
      const parsed = parseFiles(files)
      dispatch({ type: 'FILES_PARSED', parsedFiles: parsed })
    } catch (e) {
      const message =
        e instanceof XmlParseError ? e.message : 'אירעה שגיאה בלתי צפויה בקריאת הקבצים'
      dispatch({ type: 'PARSE_ERROR', error: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-xl text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">מערכת ניתוח פנסיוני</h1>
        <p className="text-slate-500 mb-6">העלאת קבצי XML מהמסלקה הפנסיונית לניתוח מרוכז של התיק</p>
        <StepsIndicator current={1} />

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-12 transition-colors ${
            dragOver ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-600/60'
          }`}
        >
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-800 to-brand-700 grid place-items-center shadow-md shadow-brand-800/20">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4" />
              <path d="m7 9 5-5 5 5" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
          </div>
          <p className="font-semibold text-slate-700">גרירת קבצי XML לכאן או לחיצה לבחירה</p>
          <p className="text-sm text-slate-400 mt-1">ניתן להעלות מספר קבצים — כולם של אותו לקוח</p>
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {busy && (
          <div className="mt-4 flex justify-center">
            <Spinner label="קורא ומנתח את הקבצים…" />
          </div>
        )}

        {state.error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 text-sm text-right">
            {state.error}
          </div>
        )}

        <div className="mt-8 grid grid-cols-3 gap-3 text-center">
          {[
            {
              title: 'פרטי בלבד',
              text: 'הקבצים מנותחים בדפדפן ואינם נשלחים לשום שרת',
              path: (
                <>
                  <rect x="5" y="10" width="14" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </>
              ),
            },
            {
              title: 'תמונה מאוחדת',
              text: 'כל המוצרים הפנסיוניים והביטוחיים במקום אחד',
              path: (
                <>
                  <rect x="4" y="4" width="7" height="7" rx="1.5" />
                  <rect x="13" y="4" width="7" height="7" rx="1.5" />
                  <rect x="4" y="13" width="7" height="7" rx="1.5" />
                  <rect x="13" y="13" width="7" height="7" rx="1.5" />
                </>
              ),
            },
            {
              title: 'הארות, לא המלצות',
              text: 'המערכת מציפה נקודות לתשומת לב — לא מחליפה בעל רישיון',
              path: (
                <>
                  <path d="M9 18h6" />
                  <path d="M10 21h4" />
                  <path d="M12 3a6 6 0 0 1 3.5 10.9c-.6.5-1 1.2-1.2 2.1h-4.6c-.2-.9-.6-1.6-1.2-2.1A6 6 0 0 1 12 3Z" />
                </>
              ),
            },
          ].map(({ title, text, path }) => (
            <div key={title} className="rounded-2xl bg-white border border-slate-200/70 p-4 shadow-sm">
              <div className="mx-auto w-9 h-9 rounded-xl bg-brand-50 grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a4270" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {path}
                </svg>
              </div>
              <div className="text-sm font-semibold text-slate-700 mt-2">{title}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

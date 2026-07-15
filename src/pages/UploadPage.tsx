import { useRef, useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { parseFiles, XmlParseError } from '../services/analysisService'

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
        <p className="text-slate-500 mb-8">העלאת קבצי XML מהמסלקה הפנסיונית לניתוח מרוכז של התיק</p>

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
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'
          }`}
        >
          <div className="text-5xl mb-3">📄</div>
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

        {busy && <p className="mt-4 text-blue-600">קורא את הקבצים…</p>}

        {state.error && (
          <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 text-sm">
            {state.error}
          </div>
        )}
      </div>
    </div>
  )
}

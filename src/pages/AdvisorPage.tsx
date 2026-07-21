import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type {
  FeeAgreement,
  TreasuryAllocation,
  TreasuryFundData,
} from '../models/types'
import { productTypeLabels } from '../models/labels'
import { parseTreasuryXml } from '../parser/parseTreasuryXml'
import { parseFeeAgreementsXlsx } from '../parser/parseFeeAgreementsXlsx'
import Spinner from '../components/Spinner'

export default function AdvisorPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const policies = analysis.policies
  const supplementary = analysis.supplementary

  const [saved, setSaved] = useState(false)
  const [treasuryFunds, setTreasuryFunds] = useState<TreasuryFundData[]>(supplementary.treasuryFunds)
  const [treasuryAllocations, setTreasuryAllocations] = useState<TreasuryAllocation[]>(
    supplementary.treasuryAllocations,
  )
  const [uploadLog, setUploadLog] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)

  // Fee agreements now arrive from an uploaded Excel/CSV rather than manual entry.
  const [feeAgreements, setFeeAgreements] = useState<FeeAgreement[]>(supplementary.feeAgreements)
  const [feeLog, setFeeLog] = useState<{ text: string; ok: boolean }[]>([])
  const [feeParsing, setFeeParsing] = useState(false)

  const policyLabel = (policyNumber: string) => {
    const p = policies.find((pp) => pp.policyNumber === policyNumber)
    return p ? productTypeLabels[p.productType] : 'פוליסה שאינה בתיק'
  }

  async function handleTreasuryFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setParsing(true)
    await new Promise((r) => setTimeout(r, 30)) // let the spinner paint before heavy parsing
    const portfolioMofids = new Set(policies.map((p) => p.mofid).filter((m): m is string => !!m))
    const log: string[] = []
    let nextFunds = [...treasuryFunds]
    let nextAllocs = [...treasuryAllocations]

    for (const file of fileList) {
      const text = await file.text()
      const parsed = parseTreasuryXml(text, file.name, portfolioMofids)
      if (parsed.type === 'unknown') {
        log.push(`${file.name}: הפורמט לא זוהה כקובץ נתוני אוצר`)
        continue
      }
      if (parsed.type === 'returns') {
        nextFunds = [
          ...nextFunds.filter((f) => !parsed.funds.some((n) => n.mofid === f.mofid)),
          ...parsed.funds,
        ]
        log.push(
          `${file.name}: קובץ תשואות — נמצאו נתונים עבור ${parsed.matchedMofids.length} מתוך ${portfolioMofids.size} מספרי אוצר בתיק`,
        )
      } else {
        nextAllocs = [
          ...nextAllocs.filter((a) => !parsed.allocations.some((n) => n.mofid === a.mofid)),
          ...parsed.allocations,
        ]
        log.push(
          `${file.name}: קובץ אפיקי השקעה — נמצאו נתונים עבור ${parsed.matchedMofids.length} מתוך ${portfolioMofids.size} מספרי אוצר בתיק`,
        )
      }
    }

    setTreasuryFunds(nextFunds)
    setTreasuryAllocations(nextAllocs)
    setUploadLog(log)
    setParsing(false)
  }

  async function handleFeeFile(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const file = fileList[0]
    setFeeParsing(true)
    await new Promise((r) => setTimeout(r, 30))
    const portfolioPolicies = new Set(policies.map((p) => p.policyNumber))
    const buffer = await file.arrayBuffer()
    const result = await parseFeeAgreementsXlsx(buffer, portfolioPolicies)
    setFeeParsing(false)

    if (result.error) {
      setFeeLog([{ text: `${file.name}: ${result.error}`, ok: false }])
      return
    }

    setFeeAgreements(result.agreements)
    const log: { text: string; ok: boolean }[] = [
      {
        text: `${file.name}: נקלטו ${result.agreements.length} הסכמים · ${result.matched.length} תואמים לפוליסות בתיק`,
        ok: true,
      },
    ]
    if (result.unmatched.length > 0) {
      log.push({
        text: `${result.unmatched.length} מספרי פוליסה בקובץ אינם בתיק ולא ישמשו את הבדיקה: ${result.unmatched
          .slice(0, 5)
          .join(', ')}${result.unmatched.length > 5 ? '…' : ''}`,
        ok: false,
      })
    }
    setFeeLog(log)
  }

  function save() {
    const updated = { ...supplementary }
    updated.treasuryFunds = treasuryFunds
    updated.treasuryAllocations = treasuryAllocations
    updated.feeAgreements = feeAgreements
    // benchmarks are preserved as loaded — comparison data comes from the
    // uploaded treasury files, no longer entered manually here.

    const rebuilt = buildAnalysis(state.parsedFiles, updated)
    dispatch({ type: 'ANALYSIS_UPDATED', analysis: rebuilt })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <nav className="text-sm text-slate-400 mb-4">
        <button onClick={() => dispatch({ type: 'GO_DASHBOARD' })} className="text-brand-700 hover:underline">
          דשבורד
        </button>
        <span className="mx-1.5">‹</span>
        <span className="text-slate-600">אזור יועץ</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">אזור יועץ</h1>
      <p className="text-slate-500 mb-6 text-sm">
        נתונים מקצועיים שמשפיעים על מנועי הניתוח. שמירה מריצה את הניתוח מחדש.
      </p>

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-1">קבצי נתוני אוצר — גמל-נט / פנסיה-נט</h2>
        <p className="text-xs text-slate-400 mb-3">
          העלאת קבצי ה-XML הרשמיים (תשואות ואפיקי השקעה). המערכת שולפת אוטומטית את הנתונים
          לפי מספרי האוצר (מ"ה) של הקופות בתיק — תשואות, שארפ, דמי ניהול ממוצעים ואפיקים.
        </p>
        <input
          type="file"
          accept=".xml,text/xml"
          multiple
          onChange={(e) => handleTreasuryFiles(e.target.files)}
          className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-50"
        />
        {parsing && (
          <div className="mt-2">
            <Spinner label="מעבד את קובצי הנתונים…" />
          </div>
        )}
        {uploadLog.map((line, i) => (
          <p key={i} className="text-xs text-slate-500 mt-2">✓ {line}</p>
        ))}
        {(treasuryFunds.length > 0 || treasuryAllocations.length > 0) && (
          <div className="mt-3 rounded-xl bg-brand-25 border border-slate-200/70 p-3 text-sm">
            <div className="font-medium text-slate-700 mb-1.5">נתונים טעונים:</div>
            {treasuryFunds.map((f) => (
              <div key={f.mofid} className="text-xs text-slate-500 py-0.5">
                מ"ה {f.mofid} · {f.name} — תשואה 12ח' {f.return12m?.toFixed(2) ?? '—'}% · שארפ{' '}
                {f.sharpe?.toFixed(2) ?? '—'} · ד"נ ממוצע {f.avgFeeFromAccumulation?.toFixed(2) ?? '—'}%
              </div>
            ))}
            {treasuryAllocations.map((a) => (
              <div key={a.mofid} className="text-xs text-slate-500 py-0.5">
                מ"ה {a.mofid} · אפיקי השקעה: {a.groups.length} קבוצות (מובילים:{' '}
                {a.groups.slice(0, 2).map((g) => `${g.name} ${g.percent.toFixed(1)}%`).join(', ')})
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-1">הסכמי דמי ניהול — קובץ אקסל</h2>
        <p className="text-xs text-slate-400 mb-3">
          העלאת קובץ Excel/CSV עם ההסכמים. הקובץ צריך לכלול עמודת "מספר פוליסה" ולפחות אחת
          מעמודות דמי הניהול — "מהפקדה" ו/או "מצבירה". בדיקת הפער מול ההסכם תרוץ לפי הפוליסות שיזוהו.
        </p>
        <input
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          onChange={(e) => handleFeeFile(e.target.files)}
          className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-50"
        />
        {feeParsing && (
          <div className="mt-2">
            <Spinner label="מעבד את קובץ ההסכמים…" />
          </div>
        )}
        {feeLog.map((line, i) => (
          <p key={i} className={`text-xs mt-2 ${line.ok ? 'text-slate-500' : 'text-amber-600'}`}>
            {line.ok ? '✓' : '⚠'} {line.text}
          </p>
        ))}
        {feeAgreements.length > 0 && (
          <div className="mt-3 rounded-xl bg-brand-25 border border-slate-200/70 p-3">
            <div className="font-medium text-slate-700 text-sm mb-1.5">הסכמים טעונים:</div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-xs text-slate-400 pb-1 border-b border-slate-200/70">
              <span>פוליסה</span>
              <span className="tabular">מהפקדה</span>
              <span className="tabular">מצבירה</span>
            </div>
            {feeAgreements.map((a) => {
              const inPortfolio = policies.some((p) => p.policyNumber === a.policyNumber)
              return (
                <div
                  key={a.policyNumber}
                  className={`grid grid-cols-[1fr_auto_auto] gap-x-4 py-1 text-xs ${
                    inPortfolio ? 'text-slate-600' : 'text-slate-300'
                  }`}
                >
                  <span>
                    <span className="font-medium">{policyLabel(a.policyNumber)}</span>{' '}
                    <span className="tabular text-slate-400">{a.policyNumber}</span>
                  </span>
                  <span className="tabular">
                    {a.agreedFeeFromDeposit !== null ? `${a.agreedFeeFromDeposit}%` : '—'}
                  </span>
                  <span className="tabular">
                    {a.agreedFeeFromAccumulation !== null ? `${a.agreedFeeFromAccumulation}%` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-xl bg-gradient-to-l from-brand-800 to-brand-700 text-white font-semibold py-2.5 px-8 hover:opacity-95"
        >
          שמירה והרצת ניתוח מחדש
        </button>
        {saved && <span className="text-sm text-accent-600 font-medium">✓ נשמר — הניתוח עודכן</span>}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type {
  BenchmarkSource,
  FeeAgreement,
  FundBenchmark,
  TreasuryAllocation,
  TreasuryFundData,
} from '../models/types'
import { productTypeLabels } from '../models/labels'
import { parseTreasuryXml } from '../parser/parseTreasuryXml'
import Spinner from '../components/Spinner'

const sourceLabels: Record<BenchmarkSource, string> = {
  gemelnet: 'גמל-נט',
  pensianet: 'פנסיה-נט',
  bituachnet: 'ביטוח-נט',
}

function sourceForProduct(productType: string): BenchmarkSource {
  if (productType === 'pension') return 'pensianet'
  if (productType === 'managers' || productType === 'life' || productType === 'incomeProtection') return 'bituachnet'
  return 'gemelnet'
}

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

  const [fees, setFees] = useState<Record<string, { deposit: string; accum: string }>>(() =>
    Object.fromEntries(
      supplementary.feeAgreements.map((a) => [
        a.policyNumber,
        {
          deposit: a.agreedFeeFromDeposit?.toString() ?? '',
          accum: a.agreedFeeFromAccumulation?.toString() ?? '',
        },
      ]),
    ),
  )
  const [benchmarks, setBenchmarks] = useState<Record<string, { ret: string; sharpe: string }>>(() =>
    Object.fromEntries(
      supplementary.benchmarks.map((b) => [
        b.mofid,
        { ret: b.annualReturn?.toString() ?? '', sharpe: b.sharpe?.toString() ?? '' },
      ]),
    ),
  )

  function num(s: string): number | null {
    if (!s.trim()) return null
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
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

  function save() {
    const updated = { ...supplementary }
    updated.treasuryFunds = treasuryFunds
    updated.treasuryAllocations = treasuryAllocations
    updated.feeAgreements = Object.entries(fees)
      .map(([policyNumber, v]): FeeAgreement => ({
        policyNumber,
        agreedFeeFromDeposit: num(v.deposit),
        agreedFeeFromAccumulation: num(v.accum),
      }))
      .filter((a) => a.agreedFeeFromDeposit !== null || a.agreedFeeFromAccumulation !== null)

    updated.benchmarks = Object.entries(benchmarks)
      .map(([mofid, v]): FundBenchmark => {
        const policy = policies.find((p) => p.mofid === mofid)
        return {
          mofid,
          source: sourceForProduct(policy?.productType ?? 'gemel'),
          annualReturn: num(v.ret),
          sharpe: num(v.sharpe),
        }
      })
      .filter((b) => b.annualReturn !== null || b.sharpe !== null)

    const rebuilt = buildAnalysis(state.parsedFiles, updated)
    dispatch({ type: 'ANALYSIS_UPDATED', analysis: rebuilt })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const uniqueMofids = [...new Map(policies.filter((p) => p.mofid).map((p) => [p.mofid!, p])).values()]

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

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-4 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-1">הסכמי דמי ניהול מפעליים</h2>
        <p className="text-xs text-slate-400 mb-3">
          הסכמים מול היצרן/מעסיק (רובד מפעלי), לפי פוליסה. בדיקת פער מול ההסכם תרוץ רק היכן שהוזן.
        </p>
        {policies.map((p) => (
          <div key={p.policyNumber} className="grid grid-cols-3 gap-3 items-center py-2 border-t border-slate-100 text-sm">
            <div>
              <div className="font-medium text-slate-700">{productTypeLabels[p.productType]}</div>
              <div className="text-xs text-slate-400 tabular">{p.policyNumber}</div>
            </div>
            <input
              type="number"
              step="0.01"
              placeholder="% מהפקדה"
              className="rounded-lg border border-slate-300 p-2"
              value={fees[p.policyNumber]?.deposit ?? ''}
              onChange={(e) =>
                setFees({ ...fees, [p.policyNumber]: { deposit: e.target.value, accum: fees[p.policyNumber]?.accum ?? '' } })
              }
            />
            <input
              type="number"
              step="0.01"
              placeholder="% מצבירה"
              className="rounded-lg border border-slate-300 p-2"
              value={fees[p.policyNumber]?.accum ?? ''}
              onChange={(e) =>
                setFees({ ...fees, [p.policyNumber]: { deposit: fees[p.policyNumber]?.deposit ?? '', accum: e.target.value } })
              }
            />
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-6 shadow-sm">
        <h2 className="font-semibold text-slate-700 mb-1">נתוני השוואה — גמל-נט / פנסיה-נט / ביטוח-נט</h2>
        <p className="text-xs text-slate-400 mb-3">
          לפי מספר אוצר, מהאתרים הרשמיים. משמש את מנוע ההשקעות להשוואת תשואות.
        </p>
        {uniqueMofids.length === 0 ? (
          <p className="text-sm text-slate-400">לא זוהו מספרי אוצר בקבצים</p>
        ) : (
          uniqueMofids.map((p) => (
            <div key={p.mofid} className="grid grid-cols-3 gap-3 items-center py-2 border-t border-slate-100 text-sm">
              <div>
                <div className="font-medium text-slate-700">
                  מספר אוצר {p.mofid}{' '}
                  <span className="text-xs text-slate-400">({sourceLabels[sourceForProduct(p.productType)]})</span>
                </div>
                <div className="text-xs text-slate-400">{p.productName}</div>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="תשואה שנתית %"
                className="rounded-lg border border-slate-300 p-2"
                value={benchmarks[p.mofid!]?.ret ?? ''}
                onChange={(e) =>
                  setBenchmarks({ ...benchmarks, [p.mofid!]: { ret: e.target.value, sharpe: benchmarks[p.mofid!]?.sharpe ?? '' } })
                }
              />
              <input
                type="number"
                step="0.01"
                placeholder="מדד שארפ"
                className="rounded-lg border border-slate-300 p-2"
                value={benchmarks[p.mofid!]?.sharpe ?? ''}
                onChange={(e) =>
                  setBenchmarks({ ...benchmarks, [p.mofid!]: { ret: benchmarks[p.mofid!]?.ret ?? '', sharpe: e.target.value } })
                }
              />
            </div>
          ))
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

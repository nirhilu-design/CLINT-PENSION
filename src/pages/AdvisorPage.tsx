import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type { BenchmarkSource, FeeAgreement, FundBenchmark } from '../models/types'
import { productTypeLabels } from '../models/labels'

// Simple gate code for the advisor area. Client-side MVP only — this is a
// visual separation from the client flow, not real authentication.
const ADVISOR_CODE = '2211'

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

  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [saved, setSaved] = useState(false)

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

  function save() {
    const updated = { ...supplementary }
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

  if (!unlocked) {
    return (
      <div className="p-6 max-w-sm mx-auto mt-16">
        <div className="rounded-2xl bg-white border border-slate-200/70 p-6 shadow-sm text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-[#eef3f9] grid place-items-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a4270" strokeWidth="1.8" strokeLinecap="round">
              <rect x="5" y="10" width="14" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
          </div>
          <h1 className="font-bold text-slate-800 mb-1">אזור יועץ</h1>
          <p className="text-sm text-slate-400 mb-4">הזנת נתונים מקצועיים — גישה ליועץ בלבד</p>
          <input
            type="password"
            inputMode="numeric"
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setCodeError(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (code === ADVISOR_CODE) setUnlocked(true)
                else setCodeError(true)
              }
            }}
            placeholder="קוד גישה"
            className={`w-full rounded-lg border p-2.5 text-center tracking-widest ${
              codeError ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
            }`}
          />
          {codeError && <p className="text-xs text-rose-500 mt-2">קוד שגוי</p>}
          <button
            onClick={() => (code === ADVISOR_CODE ? setUnlocked(true) : setCodeError(true))}
            className="mt-4 w-full rounded-xl bg-[#123054] text-white font-semibold py-2.5 hover:bg-[#1a4270]"
          >
            כניסה
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <nav className="text-sm text-slate-400 mb-4">
        <button onClick={() => dispatch({ type: 'GO_DASHBOARD' })} className="text-[#1a4270] hover:underline">
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
        <h2 className="font-semibold text-slate-700 mb-1">הסכמי דמי ניהול</h2>
        <p className="text-xs text-slate-400 mb-3">
          הסכמים מול היצרן/מעסיק, לפי פוליסה. בדיקת פער מול ההסכם תרוץ רק היכן שהוזן.
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
          className="rounded-xl bg-gradient-to-l from-[#123054] to-[#1a4270] text-white font-semibold py-2.5 px-8 hover:opacity-95"
        >
          שמירה והרצת ניתוח מחדש
        </button>
        {saved && <span className="text-sm text-[#0e9484] font-medium">✓ נשמר — הניתוח עודכן</span>}
      </div>
    </div>
  )
}

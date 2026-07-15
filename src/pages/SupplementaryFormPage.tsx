import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis, emptySupplementary } from '../services/analysisService'
import type { BenchmarkSource, FeeAgreement, FundBenchmark } from '../models/types'
import { productTypeLabels } from '../models/labels'

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

export default function SupplementaryFormPage() {
  const { state, dispatch } = useApp()
  const policies = state.parsedFiles.flatMap((f) => f.policies)
  const client = state.parsedFiles[0]?.client

  const [salary, setSalary] = useState('')
  const [retirementAge, setRetirementAge] = useState('')
  const [fees, setFees] = useState<Record<string, { deposit: string; accum: string }>>({})
  const [benchmarks, setBenchmarks] = useState<Record<string, { ret: string; sharpe: string }>>({})

  function num(s: string): number | null {
    if (!s.trim()) return null
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }

  function submit() {
    const supplementary = emptySupplementary()
    supplementary.monthlySalary = num(salary)
    supplementary.targetRetirementAge = num(retirementAge)

    supplementary.feeAgreements = Object.entries(fees)
      .map(([policyNumber, v]): FeeAgreement => ({
        policyNumber,
        agreedFeeFromDeposit: num(v.deposit),
        agreedFeeFromAccumulation: num(v.accum),
      }))
      .filter((a) => a.agreedFeeFromDeposit !== null || a.agreedFeeFromAccumulation !== null)

    supplementary.benchmarks = Object.entries(benchmarks)
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

    const analysis = buildAnalysis(state.parsedFiles, supplementary)
    dispatch({ type: 'ANALYSIS_READY', analysis })
  }

  const uniqueMofids = [...new Map(policies.filter((p) => p.mofid).map((p) => [p.mofid!, p])).values()]

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">מידע משלים</h1>
        <p className="text-slate-500 mb-6">
          {client && `לקוח: ${client.fullName} (${client.id}) · `}
          {policies.length} פוליסות זוהו. כל השדות אופציונליים — ככל שיוזן יותר מידע, הניתוח יהיה מלא יותר.
        </p>

        <div className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 mb-3">פרטים כלליים</h2>
          <div className="grid grid-cols-2 gap-4">
            <label className="text-sm text-slate-600">
              שכר חודשי ברוטו (₪)
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                placeholder="למשל 15000"
              />
            </label>
            <label className="text-sm text-slate-600">
              גיל פרישה מתוכנן
              <input
                type="number"
                value={retirementAge}
                onChange={(e) => setRetirementAge(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 p-2"
                placeholder="למשל 67"
              />
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 mb-4">
          <h2 className="font-semibold text-slate-700 mb-1">הסכמי דמי ניהול</h2>
          <p className="text-xs text-slate-400 mb-3">אם קיים הסכם דמי ניהול (למשל דרך המעסיק) — יש להזין לפי פוליסה. בדיקת עלויות תרוץ רק היכן שהוזן הסכם.</p>
          {policies.map((p) => (
            <div key={p.policyNumber} className="grid grid-cols-3 gap-3 items-center py-2 border-t border-slate-100 text-sm">
              <div>
                <div className="font-medium text-slate-700">{productTypeLabels[p.productType]}</div>
                <div className="text-xs text-slate-400">{p.policyNumber}</div>
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

        <div className="rounded-xl bg-white border border-slate-200 p-5 mb-6">
          <h2 className="font-semibold text-slate-700 mb-1">נתוני השוואה — גמל-נט / פנסיה-נט / ביטוח-נט</h2>
          <p className="text-xs text-slate-400 mb-3">
            הזנה ידנית לפי מספר אוצר של הקופה (מהאתרים הרשמיים). ישמש את מנוע ההשקעות להשוואת תשואות.
          </p>
          {uniqueMofids.length === 0 ? (
            <p className="text-sm text-slate-400">לא זוהו מספרי אוצר בקבצים</p>
          ) : (
            uniqueMofids.map((p) => (
              <div key={p.mofid} className="grid grid-cols-3 gap-3 items-center py-2 border-t border-slate-100 text-sm">
                <div>
                  <div className="font-medium text-slate-700">
                    מספר אוצר {p.mofid} <span className="text-xs text-slate-400">({sourceLabels[sourceForProduct(p.productType)]})</span>
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

        <div className="flex gap-3">
          <button
            onClick={submit}
            className="flex-1 rounded-xl bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700"
          >
            המשך לניתוח
          </button>
          <button
            onClick={() => dispatch({ type: 'RESET' })}
            className="rounded-xl border border-slate-300 px-5 text-slate-600 hover:bg-slate-100"
          >
            חזרה
          </button>
        </div>
      </div>
    </div>
  )
}

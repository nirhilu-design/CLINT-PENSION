import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis, emptySupplementary } from '../services/analysisService'
import type { EmploymentStatus } from '../models/types'
import StepsIndicator from '../components/StepsIndicator'

function YesNoQuestion({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean | null) => void
}) {
  const option = (selected: boolean, text: string) => (
    <button
      type="button"
      onClick={() => onChange(value === selected ? null : selected)}
      className={`px-4 py-1.5 rounded-lg border text-sm transition ${
        value === selected
          ? 'bg-brand-800 border-brand-800 text-white'
          : 'bg-white border-slate-300 text-slate-600 hover:border-brand-600/60'
      }`}
    >
      {text}
    </button>
  )
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 border-t border-slate-100 first:border-t-0">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex gap-2 shrink-0">
        {option(true, 'כן')}
        {option(false, 'לא')}
      </div>
    </div>
  )
}

const employmentOptions: { value: EmploymentStatus; label: string }[] = [
  { value: 'employee', label: 'שכיר/ה' },
  { value: 'selfEmployed', label: 'עצמאי/ת' },
  { value: 'both', label: 'שכיר/ה + עצמאי/ת' },
  { value: 'notWorking', label: 'לא עובד/ת כיום' },
]

export default function SupplementaryFormPage() {
  const { state, dispatch } = useApp()
  const policies = state.parsedFiles.flatMap((f) => f.policies)
  const client = state.parsedFiles[0]?.client

  const [childrenUnder21, setChildrenUnder21] = useState<boolean | null>(null)
  const [spouse, setSpouse] = useState<boolean | null>(null)
  const [otherAssets, setOtherAssets] = useState<boolean | null>(null)
  const [employment, setEmployment] = useState<EmploymentStatus | null>(null)
  const [salary, setSalary] = useState('')
  const [familyRelies, setFamilyRelies] = useState<boolean | null>(null)
  const [realEstateValue, setRealEstateValue] = useState('')
  const [portfolioValue, setPortfolioValue] = useState('')
  const [liquidValue, setLiquidValue] = useState('')

  function toNum(s: string): number | null {
    const n = parseFloat(s)
    return Number.isFinite(n) && n > 0 ? n : null
  }

  function submit() {
    const supplementary = emptySupplementary()
    supplementary.hasChildrenUnder21 = childrenUnder21
    supplementary.hasSpouse = spouse
    supplementary.hasOtherMaterialAssets = otherAssets
    if (otherAssets === true) {
      supplementary.otherAssetsRealEstateValue = toNum(realEstateValue)
      supplementary.otherAssetsPortfolioValue = toNum(portfolioValue)
      supplementary.otherAssetsLiquidValue = toNum(liquidValue)
    }
    supplementary.employmentStatus = employment
    supplementary.currentGrossSalary = toNum(salary)
    supplementary.familyReliesOnIncome = familyRelies

    const analysis = buildAnalysis(state.parsedFiles, supplementary)
    dispatch({ type: 'ANALYSIS_READY', analysis })
  }

  return (
    <div className="min-h-screen p-6 flex justify-center">
      <div className="w-full max-w-2xl">
        <StepsIndicator current={2} />
        <h1 className="text-2xl font-bold text-slate-800 mb-1">כמה שאלות קצרות</h1>
        <p className="text-slate-500 mb-6">
          {client && `${client.fullName} · `}
          {policies.length} פוליסות זוהו בקבצים. התשובות עוזרות לנו להתאים את הניתוח אליך —
          אפשר לדלג על כל שאלה, הניתוח לא ינחש.
        </p>

        <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-4 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">תעסוקה והכנסה</h2>

          <div className="py-2.5">
            <div className="text-sm text-slate-700 mb-2">מה סטטוס התעסוקה שלך?</div>
            <div className="flex flex-wrap gap-2">
              {employmentOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setEmployment(employment === o.value ? null : o.value)}
                  className={`px-4 py-1.5 rounded-lg border text-sm transition ${
                    employment === o.value
                      ? 'bg-brand-800 border-brand-800 text-white'
                      : 'bg-white border-slate-300 text-slate-600 hover:border-brand-600/60'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="py-2.5 border-t border-slate-100">
            <label className="text-sm text-slate-700 block mb-2">
              שכר חודשי ברוטו נוכחי (₪)
              <span className="text-xs text-slate-400 mr-2">
                — עוזר לבדוק שהכיסויים והחיסכון תואמים את ההכנסה האמיתית
              </span>
            </label>
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="למשל 18,000"
              className="w-48 rounded-lg border border-slate-300 p-2 text-sm"
            />
          </div>

          <YesNoQuestion
            label="האם המשפחה מסתמכת על ההכנסה שלך?"
            value={familyRelies}
            onChange={setFamilyRelies}
          />
        </div>

        <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-6 shadow-sm">
          <h2 className="font-semibold text-slate-700 mb-3">משפחה ונכסים</h2>
          <YesNoQuestion
            label="האם יש בן/בת זוג?"
            value={spouse}
            onChange={setSpouse}
          />
          <YesNoQuestion
            label="האם יש ילדים מתחת לגיל 21?"
            value={childrenUnder21}
            onChange={setChildrenUnder21}
          />
          <YesNoQuestion
            label="האם יש נכסים נוספים — תיק השקעות, נדל״ן או כספי חיסכון — שתרצה שנתייחס אליהם בניתוח?"
            value={otherAssets}
            onChange={setOtherAssets}
          />
          {otherAssets === true && (
            <div className="mt-3 rounded-xl bg-brand-25 border border-slate-200/70 p-4">
              <p className="text-xs text-slate-500 mb-3">
                הערכה כללית מספיקה — זה עוזר לנו לראות את התמונה הפיננסית המלאה. אפשר להשאיר שדות ריקים.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <label className="text-sm text-slate-600">
                  שווי נדל״ן (₪)
                  <input
                    type="number"
                    value={realEstateValue}
                    onChange={(e) => setRealEstateValue(e.target.value)}
                    placeholder="לא כולל דירת מגורים"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  שווי תיק השקעות (₪)
                  <input
                    type="number"
                    value={portfolioValue}
                    onChange={(e) => setPortfolioValue(e.target.value)}
                    placeholder="ני״ע, קרנות"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  כספים חופשיים (₪)
                  <input
                    type="number"
                    value={liquidValue}
                    onChange={(e) => setLiquidValue(e.target.value)}
                    placeholder="עו״ש, פיקדונות"
                    className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={submit}
            className="flex-1 rounded-xl bg-gradient-to-l from-brand-800 to-brand-700 text-white font-semibold py-3 hover:opacity-95"
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

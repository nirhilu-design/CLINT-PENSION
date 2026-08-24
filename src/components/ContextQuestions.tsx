import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type { EmploymentStatus, SupplementaryInfo } from '../models/types'

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

function numToStr(n: number | null): string {
  return n !== null && Number.isFinite(n) ? String(n) : ''
}

function toNum(s: string): number | null {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * The shared client-context questions. Reads the current supplementary info from
 * the live analysis, lets the advisor edit it, and on save rebuilds the analysis
 * (preserving advisor-only fields such as fee agreements, treasury data and notes).
 * Rendered both as a slide-down on the dashboard and inside the advisor area.
 */
export default function ContextQuestions({ onSaved }: { onSaved?: () => void }) {
  const { state, dispatch } = useApp()
  const supp: SupplementaryInfo | undefined = state.analysis?.supplementary

  const [childrenUnder21, setChildrenUnder21] = useState<boolean | null>(supp?.hasChildrenUnder21 ?? null)
  const [spouse, setSpouse] = useState<boolean | null>(supp?.hasSpouse ?? null)
  const [otherAssets, setOtherAssets] = useState<boolean | null>(supp?.hasOtherMaterialAssets ?? null)
  const [employment, setEmployment] = useState<EmploymentStatus | null>(supp?.employmentStatus ?? null)
  const [salary, setSalary] = useState(numToStr(supp?.currentGrossSalary ?? null))
  const [familyRelies, setFamilyRelies] = useState<boolean | null>(supp?.familyReliesOnIncome ?? null)
  const [realEstateValue, setRealEstateValue] = useState(numToStr(supp?.otherAssetsRealEstateValue ?? null))
  const [portfolioValue, setPortfolioValue] = useState(numToStr(supp?.otherAssetsPortfolioValue ?? null))
  const [liquidValue, setLiquidValue] = useState(numToStr(supp?.otherAssetsLiquidValue ?? null))
  const [liabilities, setLiabilities] = useState<boolean | null>(supp?.hasLiabilities ?? null)
  const [mortgageBalance, setMortgageBalance] = useState(numToStr(supp?.mortgageBalance ?? null))
  const [otherDebts, setOtherDebts] = useState(numToStr(supp?.otherDebts ?? null))
  const [saved, setSaved] = useState(false)

  function save() {
    if (!state.analysis) return
    // Preserve every advisor-only field; only overwrite the context answers.
    const updated: SupplementaryInfo = { ...state.analysis.supplementary }
    updated.hasChildrenUnder21 = childrenUnder21
    updated.hasSpouse = spouse
    updated.hasOtherMaterialAssets = otherAssets
    updated.otherAssetsRealEstateValue = otherAssets === true ? toNum(realEstateValue) : null
    updated.otherAssetsPortfolioValue = otherAssets === true ? toNum(portfolioValue) : null
    updated.otherAssetsLiquidValue = otherAssets === true ? toNum(liquidValue) : null
    updated.hasLiabilities = liabilities
    updated.mortgageBalance = liabilities === true ? toNum(mortgageBalance) : null
    updated.otherDebts = liabilities === true ? toNum(otherDebts) : null
    updated.employmentStatus = employment
    updated.currentGrossSalary = toNum(salary)
    updated.familyReliesOnIncome = familyRelies

    const analysis = buildAnalysis(state.parsedFiles, updated, state.logicConfig)
    dispatch({ type: 'ANALYSIS_UPDATED', analysis })
    setSaved(true)
    onSaved?.()
  }

  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">
        התשובות עוזרות לחדד את הניתוח — אפשר לדלג על כל שאלה, הניתוח לא ינחש.
      </p>

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">תעסוקה והכנסה</h3>

        <div className="py-2.5">
          <div className="text-sm text-slate-700 mb-2">מה סטטוס התעסוקה של הלקוח?</div>
          <div className="flex flex-wrap gap-2">
            {employmentOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  setEmployment(employment === o.value ? null : o.value)
                  setSaved(false)
                }}
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
            onChange={(e) => {
              setSalary(e.target.value)
              setSaved(false)
            }}
            placeholder="למשל 18,000"
            className="w-48 rounded-lg border border-slate-300 p-2 text-sm"
          />
        </div>

        <YesNoQuestion
          label="האם המשפחה מסתמכת על ההכנסה של הלקוח?"
          value={familyRelies}
          onChange={(v) => {
            setFamilyRelies(v)
            setSaved(false)
          }}
        />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200/70 p-5 mb-4 shadow-sm">
        <h3 className="font-semibold text-slate-700 mb-3">משפחה ונכסים</h3>
        <YesNoQuestion
          label="האם יש בן/בת זוג?"
          value={spouse}
          onChange={(v) => {
            setSpouse(v)
            setSaved(false)
          }}
        />
        <YesNoQuestion
          label="האם יש ילדים מתחת לגיל 21?"
          value={childrenUnder21}
          onChange={(v) => {
            setChildrenUnder21(v)
            setSaved(false)
          }}
        />
        <YesNoQuestion
          label="האם יש נכסים נוספים — תיק השקעות, נדל״ן או כספי חיסכון — שנתייחס אליהם בניתוח?"
          value={otherAssets}
          onChange={(v) => {
            setOtherAssets(v)
            setSaved(false)
          }}
        />
        {otherAssets === true && (
          <div className="mt-3 rounded-xl bg-brand-25 border border-slate-200/70 p-4">
            <p className="text-xs text-slate-500 mb-3">
              הערכה כללית מספיקה — זה עוזר לראות את התמונה הפיננסית המלאה. אפשר להשאיר שדות ריקים.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm text-slate-600">
                שווי נדל״ן (₪)
                <input
                  type="number"
                  value={realEstateValue}
                  onChange={(e) => {
                    setRealEstateValue(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="לא כולל דירת מגורים"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-600">
                שווי תיק השקעות (₪)
                <input
                  type="number"
                  value={portfolioValue}
                  onChange={(e) => {
                    setPortfolioValue(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="ני״ע, קרנות"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-600">
                כספים חופשיים (₪)
                <input
                  type="number"
                  value={liquidValue}
                  onChange={(e) => {
                    setLiquidValue(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="עו״ש, פיקדונות"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
            </div>
          </div>
        )}
        <YesNoQuestion
          label="האם קיימות התחייבויות — משכנתא או חובות — שנתייחס אליהן?"
          value={liabilities}
          onChange={(v) => {
            setLiabilities(v)
            setSaved(false)
          }}
        />
        {liabilities === true && (
          <div className="mt-3 rounded-xl bg-brand-25 border border-slate-200/70 p-4">
            <p className="text-xs text-slate-500 mb-3">
              יתרות אלה נשקלות מול כיסוי ביטוח החיים, כדי לראות אם הכיסוי מספיק. אפשר להשאיר ריק.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-600">
                יתרת משכנתא (₪)
                <input
                  type="number"
                  value={mortgageBalance}
                  onChange={(e) => {
                    setMortgageBalance(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="יתרה לסילוק"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
              <label className="text-sm text-slate-600">
                חובות נוספים (₪)
                <input
                  type="number"
                  value={otherDebts}
                  onChange={(e) => {
                    setOtherDebts(e.target.value)
                    setSaved(false)
                  }}
                  placeholder="הלוואות, חובות"
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-xl bg-gradient-to-l from-brand-800 to-brand-700 text-white font-semibold py-2.5 px-6 hover:opacity-95"
        >
          עדכון הניתוח
        </button>
        {saved && (
          <span className="text-sm text-accent-600 font-medium">✓ הניתוח עודכן</span>
        )}
      </div>
    </div>
  )
}

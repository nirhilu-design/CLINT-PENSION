import { useState, type CSSProperties } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type { EmploymentStatus, SupplementaryInfo } from '../models/types'
import Card from './ds/Card'

const chipBase: CSSProperties = {
  padding: '6px 16px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-base)',
  background: 'var(--color-bg-card)',
  color: 'var(--color-text-secondary)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 160ms, border-color 160ms, color 160ms',
}

const chipSelected: CSSProperties = {
  ...chipBase,
  background: 'var(--clint-700)',
  borderColor: 'var(--clint-700)',
  color: '#fff',
}

const inputStyle: CSSProperties = {
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-base)',
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
  width: '100%',
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={selected ? chipSelected : chipBase}>
      {children}
    </button>
  )
}

function YesNoQuestion({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean | null
  onChange: (v: boolean | null) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '10px 0',
        borderTop: '1px solid var(--color-border-base)',
      }}
    >
      <span style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Chip selected={value === true} onClick={() => onChange(value === true ? null : true)}>כן</Chip>
        <Chip selected={value === false} onClick={() => onChange(value === false ? null : false)}>לא</Chip>
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

const sectionTitle: CSSProperties = { fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }
const fieldLabel: CSSProperties = { fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }
const subNote: CSSProperties = { fontSize: 11.5, color: 'var(--color-text-tertiary)' }

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

  function dirty<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setSaved(false)
    }
  }

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
      <p style={{ ...subNote, marginBottom: 16 }}>
        התשובות עוזרות לחדד את הניתוח — אפשר לדלג על כל שאלה, הניתוח לא ינחש.
      </p>

      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>תעסוקה והכנסה</div>

        <div style={{ padding: '10px 0' }}>
          <div style={{ ...fieldLabel, marginBottom: 8 }}>מה סטטוס התעסוקה של הלקוח?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {employmentOptions.map((o) => (
              <Chip
                key={o.value}
                selected={employment === o.value}
                onClick={() => dirty(setEmployment)(employment === o.value ? null : o.value)}
              >
                {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <div style={{ padding: '10px 0', borderTop: '1px solid var(--color-border-base)' }}>
          <label style={fieldLabel}>
            שכר חודשי ברוטו נוכחי (₪)
            <span style={{ ...subNote, marginInlineStart: 8 }}>
              — עוזר לבדוק שהכיסויים והחיסכון תואמים את ההכנסה האמיתית
            </span>
          </label>
          <input
            type="number"
            value={salary}
            onChange={(e) => dirty(setSalary)(e.target.value)}
            placeholder="למשל 18,000"
            style={{ ...inputStyle, width: 200 }}
          />
        </div>

        <YesNoQuestion
          label="האם המשפחה מסתמכת על ההכנסה של הלקוח?"
          value={familyRelies}
          onChange={dirty(setFamilyRelies)}
        />
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={sectionTitle}>משפחה ונכסים</div>
        <div style={{ marginTop: 4 }}>
          <YesNoQuestion label="האם יש בן/בת זוג?" value={spouse} onChange={dirty(setSpouse)} />
          <YesNoQuestion label="האם יש ילדים מתחת לגיל 21?" value={childrenUnder21} onChange={dirty(setChildrenUnder21)} />
          <YesNoQuestion
            label="האם יש נכסים נוספים — תיק השקעות, נדל״ן או כספי חיסכון — שנתייחס אליהם בניתוח?"
            value={otherAssets}
            onChange={dirty(setOtherAssets)}
          />
        </div>
        {otherAssets === true && (
          <div style={{ marginTop: 12, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)', border: '1px solid var(--color-border-base)', padding: 16 }}>
            <p style={{ ...subNote, marginBottom: 12 }}>
              הערכה כללית מספיקה — זה עוזר לראות את התמונה הפיננסית המלאה. אפשר להשאיר שדות ריקים.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              <label style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                שווי נדל״ן (₪)
                <input type="number" value={realEstateValue} onChange={(e) => dirty(setRealEstateValue)(e.target.value)} placeholder="לא כולל דירת מגורים" style={{ ...inputStyle, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                שווי תיק השקעות (₪)
                <input type="number" value={portfolioValue} onChange={(e) => dirty(setPortfolioValue)(e.target.value)} placeholder="ני״ע, קרנות" style={{ ...inputStyle, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                כספים חופשיים (₪)
                <input type="number" value={liquidValue} onChange={(e) => dirty(setLiquidValue)(e.target.value)} placeholder="עו״ש, פיקדונות" style={{ ...inputStyle, marginTop: 4 }} />
              </label>
            </div>
          </div>
        )}
        <YesNoQuestion
          label="האם קיימות התחייבויות — משכנתא או חובות — שנתייחס אליהן?"
          value={liabilities}
          onChange={dirty(setLiabilities)}
        />
        {liabilities === true && (
          <div style={{ marginTop: 12, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)', border: '1px solid var(--color-border-base)', padding: 16 }}>
            <p style={{ ...subNote, marginBottom: 12 }}>
              יתרות אלה נשקלות מול כיסוי ביטוח החיים, כדי לראות אם הכיסוי מספיק. אפשר להשאיר ריק.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              <label style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                יתרת משכנתא (₪)
                <input type="number" value={mortgageBalance} onChange={(e) => dirty(setMortgageBalance)(e.target.value)} placeholder="יתרה לסילוק" style={{ ...inputStyle, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                חובות נוספים (₪)
                <input type="number" value={otherDebts} onChange={(e) => dirty(setOtherDebts)(e.target.value)} placeholder="הלוואות, חובות" style={{ ...inputStyle, marginTop: 4 }} />
              </label>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          style={{
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(90deg,var(--clint-700),var(--clint-600))',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            padding: '10px 24px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          עדכון הניתוח
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--color-success-dark)', fontWeight: 600 }}>✓ הניתוח עודכן</span>}
      </div>
    </div>
  )
}

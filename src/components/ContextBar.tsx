import { useState } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis, emptySupplementary } from '../services/analysisService'
import type { EmploymentStatus, SupplementaryInfo } from '../models/types'

const employmentOptions: { value: EmploymentStatus; label: string }[] = [
  { value: 'employee', label: 'שכיר/ה' },
  { value: 'selfEmployed', label: 'עצמאי/ת' },
  { value: 'both', label: 'שכיר/ה + עצמאי/ת' },
  { value: 'notWorking', label: 'לא עובד/ת כיום' },
]

const employmentLabel: Record<EmploymentStatus, string> = {
  employee: 'שכיר/ה',
  selfEmployed: 'עצמאי/ת',
  both: 'שכיר/ה + עצמאי/ת',
  notWorking: 'לא עובד/ת',
}

const pill = (active: boolean): React.CSSProperties => ({
  padding: '5px 14px',
  borderRadius: 'var(--radius-full)',
  border: '1px solid',
  borderColor: active ? 'var(--clint-700)' : 'var(--color-border-base)',
  background: active ? 'var(--clint-700)' : 'var(--color-bg-card)',
  color: active ? '#fff' : 'var(--color-text-secondary)',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit',
})

const numInput: React.CSSProperties = {
  width: '100%',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-base)',
  padding: '7px 10px',
  fontSize: 13,
  fontFamily: 'inherit',
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderTop: '1px solid var(--neutral-100)' }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button type="button" style={pill(value === true)} onClick={() => onChange(value === true ? null : true)}>כן</button>
        <button type="button" style={pill(value === false)} onClick={() => onChange(value === false ? null : false)}>לא</button>
      </div>
    </div>
  )
}

const numStr = (n: number | null) => (n != null ? String(n) : '')
const toNum = (s: string): number | null => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

export default function ContextBar() {
  const { state, dispatch } = useApp()
  const supp = state.analysis?.supplementary ?? emptySupplementary()

  const [open, setOpen] = useState(false)
  const [employment, setEmployment] = useState<EmploymentStatus | null>(supp.employmentStatus)
  const [salary, setSalary] = useState(numStr(supp.currentGrossSalary))
  const [familyRelies, setFamilyRelies] = useState<boolean | null>(supp.familyReliesOnIncome)
  const [spouse, setSpouse] = useState<boolean | null>(supp.hasSpouse)
  const [children, setChildren] = useState<boolean | null>(supp.hasChildrenUnder21)
  const [liabilities, setLiabilities] = useState<boolean | null>(supp.hasLiabilities)
  const [mortgage, setMortgage] = useState(numStr(supp.mortgageBalance))
  const [otherDebts, setOtherDebts] = useState(numStr(supp.otherDebts))
  const [otherAssets, setOtherAssets] = useState<boolean | null>(supp.hasOtherMaterialAssets)
  const [realEstate, setRealEstate] = useState(numStr(supp.otherAssetsRealEstateValue))
  const [portfolio, setPortfolio] = useState(numStr(supp.otherAssetsPortfolioValue))
  const [liquid, setLiquid] = useState(numStr(supp.otherAssetsLiquidValue))

  function save() {
    const next: SupplementaryInfo = {
      ...supp,
      employmentStatus: employment,
      currentGrossSalary: toNum(salary),
      familyReliesOnIncome: familyRelies,
      hasSpouse: spouse,
      hasChildrenUnder21: children,
      hasLiabilities: liabilities,
      mortgageBalance: liabilities === true ? toNum(mortgage) : null,
      otherDebts: liabilities === true ? toNum(otherDebts) : null,
      hasOtherMaterialAssets: otherAssets,
      otherAssetsRealEstateValue: otherAssets === true ? toNum(realEstate) : null,
      otherAssetsPortfolioValue: otherAssets === true ? toNum(portfolio) : null,
      otherAssetsLiquidValue: otherAssets === true ? toNum(liquid) : null,
    }
    const analysis = buildAnalysis(state.parsedFiles, next, state.logicConfig)
    dispatch({ type: 'ANALYSIS_UPDATED', analysis })
    setOpen(false)
  }

  // Compact one-line summary shown when the bar is collapsed
  const answered = [
    employment && employmentLabel[employment],
    toNum(salary) && `שכר ${Number(toNum(salary)).toLocaleString()}`,
    spouse === true && 'בן/בת זוג',
    children === true && 'ילדים עד 21',
    liabilities === true && 'התחייבויות',
  ].filter(Boolean) as string[]

  return (
    <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-base)', background: 'var(--color-bg-card)', boxShadow: 'var(--shadow-card)', marginBottom: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right' }}
      >
        <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)', display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--clint-600)' }}>
          <SlidersHorizontal size={16} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>פרטי הקשר לניתוח</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {answered.length ? answered.join(' · ') : 'השלמת פרטים תדייק את הניתוח — אופציונלי'}
          </div>
        </div>
        <ChevronDown size={18} color="var(--color-text-tertiary)" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 180ms var(--ease-out)' }} />
      </button>

      {open && (
        <div style={{ padding: '4px 18px 18px' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>מה סטטוס התעסוקה?</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            {employmentOptions.map((o) => (
              <button key={o.value} type="button" style={pill(employment === o.value)} onClick={() => setEmployment(employment === o.value ? null : o.value)}>
                {o.label}
              </button>
            ))}
          </div>

          <div style={{ padding: '10px 0', borderTop: '1px solid var(--neutral-100)' }}>
            <label style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>שכר חודשי ברוטו (₪)</label>
            <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="למשל 18,000" style={{ ...numInput, width: 200 }} />
          </div>

          <YesNo label="האם המשפחה מסתמכת על ההכנסה שלך?" value={familyRelies} onChange={setFamilyRelies} />
          <YesNo label="האם יש בן/בת זוג?" value={spouse} onChange={setSpouse} />
          <YesNo label="האם יש ילדים מתחת לגיל 21?" value={children} onChange={setChildren} />
          <YesNo label="האם יש נכסים נוספים (נדל״ן, תיק השקעות, כספים חופשיים) שנתייחס אליהם?" value={otherAssets} onChange={setOtherAssets} />
          {otherAssets === true && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)' }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                שווי נדל״ן (₪)
                <input type="number" value={realEstate} onChange={(e) => setRealEstate(e.target.value)} placeholder="לא כולל מגורים" style={{ ...numInput, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                תיק השקעות (₪)
                <input type="number" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="ני״ע, קרנות" style={{ ...numInput, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                כספים חופשיים (₪)
                <input type="number" value={liquid} onChange={(e) => setLiquid(e.target.value)} placeholder="עו״ש, פיקדונות" style={{ ...numInput, marginTop: 4 }} />
              </label>
            </div>
          )}
          <YesNo label="האם קיימות התחייבויות (משכנתא/חובות) שנתייחס אליהן?" value={liabilities} onChange={setLiabilities} />
          {liabilities === true && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10, padding: 12, borderRadius: 'var(--radius-md)', background: 'var(--clint-50)' }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                יתרת משכנתא (₪)
                <input type="number" value={mortgage} onChange={(e) => setMortgage(e.target.value)} placeholder="יתרה לסילוק" style={{ ...numInput, marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                חובות נוספים (₪)
                <input type="number" value={otherDebts} onChange={(e) => setOtherDebts(e.target.value)} placeholder="הלוואות" style={{ ...numInput, marginTop: 4 }} />
              </label>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={save} style={{ borderRadius: 'var(--radius-md)', background: 'var(--clint-700)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '9px 20px', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              עדכן ניתוח
            </button>
            <button onClick={() => setOpen(false)} style={{ borderRadius: 'var(--radius-md)', background: 'none', color: 'var(--color-text-secondary)', fontSize: 14, padding: '9px 16px', border: '1px solid var(--color-border-base)', cursor: 'pointer', fontFamily: 'inherit' }}>
              סגירה
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import type {
  AdvisorNote,
  FeeAgreement,
  TreasuryAllocation,
  TreasuryFundData,
} from '../models/types'
import { productTypeLabels } from '../models/labels'
import { parseTreasuryXml } from '../parser/parseTreasuryXml'
import { parseEmployerFeeFile } from '../parser/parseEmployerFeeFile'
import { benchmarkKey } from '../utils/benchmark'
import Card from '../components/ds/Card'
import Spinner from '../components/Spinner'
import { ArrowRight } from 'lucide-react'

type Tab = 'fees' | 'treasury' | 'notes' | 'scenario'
const TABS: { id: Tab; label: string }[] = [
  { id: 'fees', label: 'הסכמי דמי ניהול' },
  { id: 'treasury', label: 'נתוני אוצר' },
  { id: 'notes', label: 'הערות יועץ' },
  { id: 'scenario', label: 'הנחות תרחיש' },
]

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--color-border-base)',
  padding: '8px 10px',
  fontSize: 13,
  fontFamily: 'var(--font-mono)',
}

export default function AdvisorPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const policies = analysis.policies
  const supplementary = analysis.supplementary

  const [tab, setTab] = useState<Tab>('fees')
  const [saved, setSaved] = useState(false)
  const [treasuryFunds, setTreasuryFunds] = useState<TreasuryFundData[]>(supplementary.treasuryFunds)
  const [treasuryAllocations, setTreasuryAllocations] = useState<TreasuryAllocation[]>(supplementary.treasuryAllocations)
  const [uploadLog, setUploadLog] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)
  const [employerFeeLog, setEmployerFeeLog] = useState<string[]>([])

  const [fees, setFees] = useState<Record<string, { deposit: string; accum: string }>>(() =>
    Object.fromEntries(
      supplementary.feeAgreements.map((a) => [a.policyNumber, { deposit: a.agreedFeeFromDeposit?.toString() ?? '', accum: a.agreedFeeFromAccumulation?.toString() ?? '' }]),
    ),
  )
  const [notesList, setNotesList] = useState<AdvisorNote[]>(supplementary.advisorNotes)
  const [newNote, setNewNote] = useState('')
  const [scenario, setScenario] = useState({
    retAge: supplementary.scenarioRetirementAge?.toString() ?? '',
    realReturn: supplementary.scenarioRealReturnPercent?.toString() ?? '',
    salaryGrowth: supplementary.scenarioSalaryGrowthPercent?.toString() ?? '',
    lifeExp: supplementary.scenarioLifeExpectancy?.toString() ?? '',
  })

  function num(s: string): number | null {
    if (!s.trim()) return null
    const n = parseFloat(s)
    return Number.isFinite(n) ? n : null
  }

  function persist(fundsOverride?: TreasuryFundData[], allocsOverride?: TreasuryAllocation[], notesOverride?: AdvisorNote[]) {
    const updated = { ...supplementary }
    updated.treasuryFunds = fundsOverride ?? treasuryFunds
    updated.treasuryAllocations = allocsOverride ?? treasuryAllocations
    updated.advisorNotes = notesOverride ?? notesList
    updated.scenarioRetirementAge = num(scenario.retAge)
    updated.scenarioRealReturnPercent = num(scenario.realReturn)
    updated.scenarioSalaryGrowthPercent = num(scenario.salaryGrowth)
    updated.scenarioLifeExpectancy = num(scenario.lifeExp)
    updated.feeAgreements = Object.entries(fees)
      .map(([policyNumber, v]): FeeAgreement => ({ policyNumber, agreedFeeFromDeposit: num(v.deposit), agreedFeeFromAccumulation: num(v.accum) }))
      .filter((a) => a.agreedFeeFromDeposit !== null || a.agreedFeeFromAccumulation !== null)
    updated.benchmarks = supplementary.benchmarks
    const rebuilt = buildAnalysis(state.parsedFiles, updated, state.logicConfig)
    dispatch({ type: 'ANALYSIS_UPDATED', analysis: rebuilt })
  }

  async function handleTreasuryFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    setParsing(true)
    await new Promise((r) => setTimeout(r, 30))
    const portfolioMofids = new Set(
      policies.map((p) => benchmarkKey(p)).filter((m): m is string => !!m),
    )
    const log: string[] = []
    let nextFunds = [...treasuryFunds]
    let nextAllocs = [...treasuryAllocations]
    for (const file of fileList) {
      const text = await file.text()
      const parsed = parseTreasuryXml(text, file.name, portfolioMofids)
      if (parsed.type === 'unknown') {
        log.push(`⚠ ${file.name}: הפורמט לא זוהה כקובץ נתוני אוצר`)
        continue
      }
      const kind = parsed.type === 'returns' ? 'תשואות' : 'אפיקי השקעה'
      if (parsed.matchedMofids.length === 0) {
        log.push(`⚠ ${file.name}: קובץ ${kind} נקרא, אך אף אחד ממספרי האוצר בתיק לא נמצא בו (מספרי אוצר בתיק: ${[...portfolioMofids].join(', ') || '—'}).`)
        continue
      }
      if (parsed.type === 'returns') nextFunds = [...nextFunds.filter((f) => !parsed.funds.some((n) => n.mofid === f.mofid)), ...parsed.funds]
      else nextAllocs = [...nextAllocs.filter((a) => !parsed.allocations.some((n) => n.mofid === a.mofid)), ...parsed.allocations]
      log.push(`✓ ${file.name}: קובץ ${kind} — נמצאו נתונים עבור ${parsed.matchedMofids.length} מתוך ${portfolioMofids.size} מספרי אוצר בתיק`)
    }
    setTreasuryFunds(nextFunds)
    setTreasuryAllocations(nextAllocs)
    setUploadLog(log)
    setParsing(false)
    persist(nextFunds, nextAllocs)
  }

  async function handleEmployerFeeFile(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    const log: string[] = []
    for (const file of fileList) {
      const text = await file.text()
      log.push(`${file.name}: ${parseEmployerFeeFile(text, file.name).note}`)
    }
    setEmployerFeeLog(log)
  }

  function addNote() {
    if (!newNote.trim()) return
    const next = [{ date: new Date().toISOString(), text: newNote.trim() }, ...notesList]
    setNotesList(next)
    setNewNote('')
    persist(undefined, undefined, next)
  }

  function save() {
    persist()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // The numbers the advisor should look for in פנסיה-נט/גמל-נט files: the
  // per-track join keys (מספר מסלול), which differ from the fund מ"ה for multi-track funds.
  const portfolioKeys = [
    ...new Set(policies.map((p) => benchmarkKey(p)).filter((m): m is string => !!m)),
  ]

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 48px' }}>
      <button onClick={() => dispatch({ type: 'GO_DASHBOARD' })} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
        <ArrowRight size={14} color="var(--color-text-tertiary)" />
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>חזרה לדשבורד</span>
      </button>

      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>אזור יועץ</h1>
      <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--color-text-tertiary)' }}>
        נתונים מקצועיים שמזינים את מנועי הניתוח. שמירה מריצה את הניתוח מחדש.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--color-border-base)', marginBottom: 22 }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: '10px 14px', fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--clint-700)' : 'var(--color-text-secondary)', background: 'none', border: 'none', borderBottom: `2px solid ${tab === t.id ? 'var(--clint-600)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fees' && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>הסכמי דמי ניהול מפעליים</div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>הזנת הסכם מול היצרן/מעסיק לכל פוליסה. בדיקת פער מול ההסכם תרוץ רק היכן שהוזן.</p>
          {policies.map((p) => {
            const key = benchmarkKey(p)
            const fund = key ? treasuryFunds.find((f) => f.mofid === key) : undefined
            const agreedAccum = num(fees[p.policyNumber]?.accum ?? '')
            let badge: { label: string; bg: string; color: string } | null = null
            if (fund?.avgFeeFromAccumulation != null && agreedAccum != null) {
              badge = agreedAccum <= fund.avgFeeFromAccumulation
                ? { label: 'תואם ממוצע שוק', bg: 'var(--color-success-bg)', color: 'var(--color-success-dark)' }
                : { label: 'גבוה מהממוצע', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' }
            }
            return (
              <div key={p.policyNumber} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 120px 120px auto', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--color-border-base)' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{productTypeLabels[p.productType]}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{p.policyNumber}</div>
                </div>
                <input type="number" step="0.01" placeholder="% מהפקדה" value={fees[p.policyNumber]?.deposit ?? ''} onChange={(e) => setFees({ ...fees, [p.policyNumber]: { deposit: e.target.value, accum: fees[p.policyNumber]?.accum ?? '' } })} style={inputStyle} />
                <input type="number" step="0.01" placeholder="% מצבירה" value={fees[p.policyNumber]?.accum ?? ''} onChange={(e) => setFees({ ...fees, [p.policyNumber]: { deposit: fees[p.policyNumber]?.deposit ?? '', accum: e.target.value } })} style={inputStyle} />
                <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap', background: badge?.bg ?? 'transparent', color: badge?.color ?? 'transparent' }}>
                  {badge?.label ?? ''}
                </span>
              </div>
            )
          })}
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--color-border-base)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>קובץ דמי ניהול מעסיק</div>
            <input type="file" accept=".xml,.csv,text/xml" multiple onChange={(e) => handleEmployerFeeFile(e.target.files)} style={{ fontSize: 13 }} />
            {employerFeeLog.map((l, i) => (
              <p key={i} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 6 }}>{l}</p>
            ))}
          </div>
        </Card>
      )}

      {tab === 'treasury' && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>קבצי נתוני אוצר — גמל-נט / פנסיה-נט / ביטוח-נט</div>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-tertiary)', lineHeight: 1.6 }}>
            העלאת קבצי ה-XML הרשמיים (תשואות ואפיקי השקעה). המערכת שולפת אוטומטית לפי מספרי האוצר בתיק. הנתונים מוחלים מיד עם ההעלאה.
          </p>
          <input type="file" accept=".xml,text/xml" multiple onChange={(e) => handleTreasuryFiles(e.target.files)} style={{ fontSize: 13 }} />
          {parsing && <div style={{ marginTop: 10 }}><Spinner label="מעבד את קובצי הנתונים…" /></div>}
          {uploadLog.map((line, i) => (
            <p key={i} style={{ fontSize: 12, marginTop: 8, color: line.startsWith('⚠') ? 'var(--color-warning-dark)' : 'var(--color-text-tertiary)' }}>{line}</p>
          ))}
          {treasuryFunds.length > 0 && (
            <div style={{ marginTop: 14, borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', padding: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>נתונים טעונים</div>
              {treasuryFunds.map((f) => (
                <div key={f.mofid} style={{ fontSize: 12, color: 'var(--color-text-tertiary)', padding: '2px 0', fontFamily: 'var(--font-mono)' }}>
                  מ"ה {f.mofid} · {f.name} — 12ח' {f.return12m?.toFixed(2) ?? '—'}% · שארפ {f.sharpe?.toFixed(2) ?? '—'} · ד"נ {f.avgFeeFromAccumulation?.toFixed(2) ?? '—'}%
                </div>
              ))}
            </div>
          )}
          {portfolioKeys.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 10 }}>
              מספרי אוצר בתיק: {portfolioKeys.join(', ')}
            </p>
          )}
        </Card>
      )}

      {tab === 'notes' && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 10 }}>הערת יועץ חדשה</div>
          <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={3} placeholder="תיעוד פנימי — לא מוצג ללקוח" style={{ ...inputStyle, fontFamily: 'var(--font-ui)', resize: 'vertical' }} />
          <div style={{ marginTop: 10 }}>
            <button onClick={addNote} disabled={!newNote.trim()} style={{ background: 'var(--clint-700)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: newNote.trim() ? 'pointer' : 'default', opacity: newNote.trim() ? 1 : 0.5, fontFamily: 'inherit' }}>
              הוספת הערה
            </button>
          </div>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notesList.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>אין הערות עדיין</p>
            ) : (
              notesList.map((n, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{new Date(n.date).toLocaleString('he-IL')}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.text}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === 'scenario' && (
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>הנחות תרחיש</div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--color-text-tertiary)' }}>הנחות אלה נשמרות בתיק. מנוע תרחיש שמשתמש בהן יתווסף בהמשך.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {[
              { key: 'retAge' as const, label: 'גיל פרישה', unit: '' },
              { key: 'realReturn' as const, label: 'תשואה ריאלית שנתית מונחת', unit: '%' },
              { key: 'salaryGrowth' as const, label: 'צמיחת שכר שנתית', unit: '%' },
              { key: 'lifeExp' as const, label: 'תוחלת חיים מונחת', unit: '' },
            ].map((f) => (
              <label key={f.key} style={{ fontSize: 13 }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>{f.label}{f.unit ? ` (${f.unit})` : ''}</span>
                <input type="number" step="any" value={scenario[f.key]} onChange={(e) => setScenario({ ...scenario, [f.key]: e.target.value })} style={inputStyle} />
              </label>
            ))}
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button onClick={save} style={{ background: 'var(--clint-700)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          שמירה והרצת ניתוח מחדש
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>✓ נשמר — הניתוח עודכן</span>}
      </div>
    </div>
  )
}

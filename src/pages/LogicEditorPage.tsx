import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import { findingCountsByLogic } from '../engines'
import { productTypeLabels } from '../models/labels'
import { ArrowRight } from 'lucide-react'
import type { FindingSeverity, ProductType } from '../models/types'
import Card from '../components/ds/Card'
import {
  LOGIC_CATALOG,
  defaultLogicConfig,
  type LogicConfig,
  type LogicDef,
  type LogicParam,
} from '../config/logicConfig'
import { applyThresholds, cloneThresholds, DEFAULT_THRESHOLDS, type ThresholdValues } from '../config/thresholds'
import { cloneHealthWeights, HEALTH_DIMENSIONS, type HealthDimensionKey } from '../config/healthWeights'

const PRODUCT_TABS: ProductType[] = ['pension', 'managers', 'life', 'incomeProtection', 'gemel', 'gemelInvestment', 'education']

const SEVERITY_STYLE: Record<FindingSeverity, { label: string; bg: string; color: string }> = {
  gap: { label: 'פער', bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' },
  attention: { label: 'לבדיקה', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' },
  info: { label: 'הארה', bg: 'var(--teal-50)', color: 'var(--teal-700)' },
}

function cloneConfig(c: LogicConfig): LogicConfig {
  return {
    thresholds: cloneThresholds(c.thresholds),
    disabledLogics: [...c.disabledLogics],
    healthWeights: cloneHealthWeights(c.healthWeights),
  }
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 38,
        height: 22,
        borderRadius: 'var(--radius-full)',
        background: on ? 'var(--clint-600)' : 'var(--neutral-300)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 160ms var(--ease-out)',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'left 160ms var(--ease-out)',
        }}
      />
    </button>
  )
}

export default function LogicEditorPage() {
  const { state, dispatch } = useApp()
  const [cfg, setCfg] = useState<LogicConfig>(() => cloneConfig(state.logicConfig))
  const [product, setProduct] = useState<ProductType>('pension')
  const [saved, setSaved] = useState(false)

  const logicsForProduct = (p: ProductType) => LOGIC_CATALOG.filter((l) => l.products.length === 0 || l.products.includes(p))

  // "X התאמות" — how many findings each logic currently raises for the loaded client.
  const matchCounts = useMemo<Record<string, number>>(() => {
    const a = state.analysis
    if (!a) return {}
    applyThresholds(state.logicConfig.thresholds)
    return findingCountsByLogic({ client: a.client, policies: a.policies, supplementary: a.supplementary })
  }, [state.analysis, state.logicConfig])

  function setParam(key: LogicParam['key'], value: string) {
    const n = value.trim() === '' ? 0 : parseFloat(value)
    setCfg((c) => ({ ...c, thresholds: { ...c.thresholds, [key]: Number.isFinite(n) ? n : 0 } }))
    setSaved(false)
  }
  function setFee(pt: ProductType, field: 'fromDeposit' | 'fromAccumulation', value: string) {
    const n = value.trim() === '' ? null : parseFloat(value)
    setCfg((c) => {
      const marketFees = { ...c.thresholds.marketFees }
      const cur = marketFees[pt] ?? { fromDeposit: null, fromAccumulation: null }
      marketFees[pt] = { ...cur, [field]: n !== null && Number.isFinite(n) ? n : null }
      return { ...c, thresholds: { ...c.thresholds, marketFees } }
    })
    setSaved(false)
  }
  const weightSum = Math.round(Object.values(cfg.healthWeights).reduce((s, n) => s + (n || 0), 0))

  function setWeight(key: HealthDimensionKey, value: string) {
    const n = value.trim() === '' ? 0 : parseFloat(value)
    setCfg((c) => ({ ...c, healthWeights: { ...c.healthWeights, [key]: Number.isFinite(n) && n >= 0 ? n : 0 } }))
    setSaved(false)
  }
  function toggleLogic(id: string, enabled: boolean) {
    setCfg((c) => ({
      ...c,
      disabledLogics: enabled ? c.disabledLogics.filter((x) => x !== id) : [...new Set([...c.disabledLogics, id])],
    }))
    setSaved(false)
  }
  function save() {
    if (state.analysis && state.parsedFiles.length > 0) {
      const rebuilt = buildAnalysis(state.parsedFiles, state.analysis.supplementary, cfg)
      dispatch({ type: 'LOGIC_UPDATED', logicConfig: cfg, analysis: rebuilt })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }
  function resetAll() {
    setCfg(defaultLogicConfig())
    setSaved(false)
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 32px 48px' }}>
      <button
        onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
        style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
      >
        <ArrowRight size={14} color="var(--color-text-tertiary)" />
        <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>חזרה לדשבורד</span>
      </button>

      <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)' }}>אזור לוגיקות</h1>
      <p style={{ margin: '6px 0 20px', fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 620, lineHeight: 1.6 }}>
        כל לוגיקת ניתוח עם ההסבר כיצד ההארה נבנית והספים שניתן לכוונן. כיבוי לוגיקה מונע ממנה לייצר
        הארות. שמירה מריצה את הניתוח מחדש.
      </p>

      {/* Product filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
        {PRODUCT_TABS.map((p) => (
          <button
            key={p}
            onClick={() => setProduct(p)}
            style={{
              borderRadius: 'var(--radius-full)',
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${product === p ? 'var(--clint-600)' : 'var(--color-border-base)'}`,
              background: product === p ? 'var(--clint-600)' : 'var(--color-bg-card)',
              color: product === p ? '#fff' : 'var(--color-text-secondary)',
            }}
          >
            {productTypeLabels[p]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {logicsForProduct(product).map((logic) => (
          <LogicCard
            key={logic.id}
            logic={logic}
            product={product}
            thresholds={cfg.thresholds}
            enabled={!cfg.disabledLogics.includes(logic.id)}
            matchCount={matchCounts[logic.id]}
            onParam={setParam}
            onFee={setFee}
            onToggle={(en) => toggleLogic(logic.id, en)}
          />
        ))}
      </div>

      {/* Health-score weights */}
      <Card style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>מדד</span>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>מדד בריאות התיק — משקלים</h3>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: 'var(--teal-50)', color: 'var(--teal-700)' }}>
            סה״כ {weightSum}%
          </span>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          המדד הוא ממוצע משוקלל של הממדים למטה (0–100). לא חובה שהמשקלים יסתכמו ל־100 — הם מנורמלים אוטומטית,
          וממד ללא נתונים יורד מהחישוב.
        </p>
        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
          {HEALTH_DIMENSIONS.map((d) => (
            <label key={d.key} style={{ fontSize: 13 }}>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                {d.label} <span style={{ opacity: 0.7 }}>(%)</span>
              </span>
              <input
                type="number"
                step="any"
                min="0"
                value={String(cfg.healthWeights[d.key] ?? '')}
                onChange={(e) => setWeight(d.key, e.target.value)}
                style={{ width: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-base)', padding: '8px 10px', fontSize: 13, fontFamily: 'var(--font-mono)', background: '#fff' }}
              />
              <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-text-tertiary)', marginTop: 4 }}>{d.hint}</span>
            </label>
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24 }}>
        <button
          onClick={save}
          style={{ background: 'var(--clint-700)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: '11px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          שמירה והרצת ניתוח מחדש
        </button>
        <button onClick={resetAll} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          איפוס לברירת מחדל
        </button>
        {saved && <span style={{ fontSize: 13, color: 'var(--color-success)', fontWeight: 600 }}>✓ נשמר — הניתוח עודכן</span>}
      </div>
    </div>
  )
}

function LogicCard({
  logic,
  product,
  thresholds,
  enabled,
  matchCount,
  onParam,
  onFee,
  onToggle,
}: {
  logic: LogicDef
  product: ProductType
  thresholds: ThresholdValues
  enabled: boolean
  matchCount?: number
  onParam: (key: LogicParam['key'], value: string) => void
  onFee: (pt: ProductType, field: 'fromDeposit' | 'fromAccumulation', value: string) => void
  onToggle: (enabled: boolean) => void
}) {
  const sev = SEVERITY_STYLE[logic.severity]
  const changed =
    logic.params.some((p) => thresholds[p.key] !== DEFAULT_THRESHOLDS[p.key]) ||
    (logic.editsMarketFees &&
      JSON.stringify(thresholds.marketFees[product]) !== JSON.stringify(DEFAULT_THRESHOLDS.marketFees[product]))

  const inputStyle: React.CSSProperties = {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--color-border-base)',
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'var(--font-mono)',
    background: enabled ? '#fff' : 'var(--neutral-50)',
  }

  return (
    <Card style={{ opacity: enabled ? 1 : 0.6 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <Toggle on={enabled} onChange={onToggle} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{logic.category}</span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: enabled ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{logic.label}</h3>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 'var(--radius-full)', background: sev.bg, color: sev.color }}>
              {sev.label}
            </span>
            {changed && (
              <span style={{ fontSize: 10, borderRadius: 'var(--radius-full)', background: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', padding: '2px 8px', fontWeight: 700 }}>
                שונה
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', direction: 'rtl' }}>{logic.condition}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{logic.explanation}</p>

          {(logic.params.length > 0 || logic.editsMarketFees) && (
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              {logic.params.map((p) => (
                <label key={p.key} style={{ fontSize: 13 }}>
                  <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>
                    {p.label}
                    {p.unit ? ` (${p.unit})` : ''}
                  </span>
                  <input type="number" step="any" disabled={!enabled} value={String(thresholds[p.key] ?? '')} onChange={(e) => onParam(p.key, e.target.value)} style={inputStyle} />
                </label>
              ))}
              {logic.editsMarketFees && (
                <>
                  <label style={{ fontSize: 13 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>סף דמי ניהול מהפקדה (%)</span>
                    <input type="number" step="any" disabled={!enabled} value={thresholds.marketFees[product]?.fromDeposit ?? ''} onChange={(e) => onFee(product, 'fromDeposit', e.target.value)} placeholder="לא רלוונטי" style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <span style={{ display: 'block', fontSize: 11, color: 'var(--color-text-tertiary)', marginBottom: 4 }}>סף דמי ניהול מצבירה (%)</span>
                    <input type="number" step="any" disabled={!enabled} value={thresholds.marketFees[product]?.fromAccumulation ?? ''} onChange={(e) => onFee(product, 'fromAccumulation', e.target.value)} placeholder="לא רלוונטי" style={inputStyle} />
                  </label>
                </>
              )}
            </div>
          )}
        </div>
        {typeof matchCount === 'number' && (
          <span
            title="מספר הממצאים שהלוגיקה מייצרת ללקוח הטעון"
            style={{ fontSize: 11, color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', flexShrink: 0 }}
          >
            {matchCount} התאמות
          </span>
        )}
      </div>
    </Card>
  )
}

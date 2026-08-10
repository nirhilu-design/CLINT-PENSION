import { useMemo, useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import { findingCountsByLogic } from '../engines'
import { productTypeLabels } from '../models/labels'
import { ArrowRight } from 'lucide-react'
import type { FindingSeverity, FindingTier, ProductType } from '../models/types'
import Card from '../components/ds/Card'
import {
  LOGIC_CATALOG,
  defaultLogicConfig,
  type LogicConfig,
  type LogicDef,
  type LogicParam,
} from '../config/logicConfig'
import { applyThresholds, cloneThresholds, DEFAULT_THRESHOLDS, type ThresholdValues } from '../config/thresholds'

const PRODUCT_TABS: ProductType[] = ['pension', 'managers', 'life', 'incomeProtection', 'gemel', 'gemelInvestment', 'education']

const SEVERITY_STYLE: Record<FindingSeverity, { label: string; bg: string; color: string }> = {
  gap: { label: 'פער', bg: 'var(--color-danger-bg)', color: 'var(--color-danger-dark)' },
  attention: { label: 'לבדיקה', bg: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)' },
  info: { label: 'הארה', bg: 'var(--teal-50)', color: 'var(--teal-700)' },
}

// Prominence tier — how prominently the logic's output is shown to the client.
const TIER_META: Record<FindingTier, { label: string; dot: string }> = {
  important: { label: 'חשוב', dot: 'var(--color-warning)' },
  insight: { label: 'הארה', dot: 'var(--teal-500)' },
  note: { label: 'רקע', dot: 'var(--neutral-400)' },
}
const TIER_FILTERS: { key: FindingTier | 'all'; label: string }[] = [
  { key: 'all', label: 'הכל' },
  { key: 'important', label: 'חשוב' },
  { key: 'insight', label: 'הארות' },
  { key: 'note', label: 'רקע' },
]

function cloneConfig(c: LogicConfig): LogicConfig {
  return { thresholds: cloneThresholds(c.thresholds), disabledLogics: [...c.disabledLogics] }
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
  const [tierFilter, setTierFilter] = useState<FindingTier | 'all'>('all')
  const [saved, setSaved] = useState(false)

  const logicsForProduct = (p: ProductType) =>
    LOGIC_CATALOG.filter((l) => l.products.length === 0 || l.products.includes(p)).filter(
      (l) => tierFilter === 'all' || l.tier === tierFilter,
    )

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

      {/* Prominence-tier filter — how prominently each logic's output is shown to the client */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>בולטות:</span>
        {TIER_FILTERS.map((t) => {
          const on = tierFilter === t.key
          const dot = t.key === 'all' ? null : TIER_META[t.key].dot
          return (
            <button
              key={t.key}
              onClick={() => setTierFilter(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 'var(--radius-full)',
                padding: '5px 12px',
                fontSize: 12.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: `1px solid ${on ? 'var(--clint-600)' : 'var(--color-border-base)'}`,
                background: on ? 'var(--clint-50)' : 'var(--color-bg-card)',
                color: on ? 'var(--clint-700)' : 'var(--color-text-secondary)',
              }}
            >
              {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />}
              {t.label}
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {logicsForProduct(product).length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>אין לוגיקות בסינון זה.</p>
        ) : (
          logicsForProduct(product).map((logic) => (
          <LogicCard
            key={logic.id}
            logic={logic}
            thresholds={cfg.thresholds}
            enabled={!cfg.disabledLogics.includes(logic.id)}
            matchCount={matchCounts[logic.id]}
            onParam={setParam}
            onToggle={(en) => toggleLogic(logic.id, en)}
          />
          ))
        )}
      </div>

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
  thresholds,
  enabled,
  matchCount,
  onParam,
  onToggle,
}: {
  logic: LogicDef
  thresholds: ThresholdValues
  enabled: boolean
  matchCount?: number
  onParam: (key: LogicParam['key'], value: string) => void
  onToggle: (enabled: boolean) => void
}) {
  const sev = SEVERITY_STYLE[logic.severity]
  const changed = logic.params.some((p) => thresholds[p.key] !== DEFAULT_THRESHOLDS[p.key])

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
            <span
              title="בולטות בתצוגת הלקוח"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border-base)', color: 'var(--color-text-secondary)' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: TIER_META[logic.tier].dot }} />
              {TIER_META[logic.tier].label}
            </span>
            {changed && (
              <span style={{ fontSize: 10, borderRadius: 'var(--radius-full)', background: 'var(--color-warning-bg)', color: 'var(--color-warning-dark)', padding: '2px 8px', fontWeight: 700 }}>
                שונה
              </span>
            )}
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', direction: 'rtl' }}>{logic.condition}</p>
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{logic.explanation}</p>

          {logic.params.length > 0 && (
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

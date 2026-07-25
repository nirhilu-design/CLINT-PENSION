import { useState } from 'react'
import { useApp } from '../hooks/useAppState'
import { buildAnalysis } from '../services/analysisService'
import { productTypeLabels } from '../models/labels'
import type { ProductType } from '../models/types'
import {
  LOGIC_CATALOG,
  defaultLogicConfig,
  type LogicConfig,
  type LogicDef,
  type LogicParam,
} from '../config/logicConfig'
import { cloneThresholds, DEFAULT_THRESHOLDS, type ThresholdValues } from '../config/thresholds'

// Products in review order — "all products" logics show under every tab.
const PRODUCT_TABS: ProductType[] = [
  'pension',
  'managers',
  'life',
  'incomeProtection',
  'gemel',
  'gemelInvestment',
  'education',
]

function cloneConfig(c: LogicConfig): LogicConfig {
  return { thresholds: cloneThresholds(c.thresholds), disabledLogics: [...c.disabledLogics] }
}

export default function LogicEditorPage() {
  const { state, dispatch } = useApp()
  const [cfg, setCfg] = useState<LogicConfig>(() => cloneConfig(state.logicConfig))
  const [product, setProduct] = useState<ProductType>('pension')
  const [saved, setSaved] = useState(false)

  const logicsForProduct = (p: ProductType) =>
    LOGIC_CATALOG.filter((l) => l.products.length === 0 || l.products.includes(p))

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

  function toggleLogic(id: string, enabled: boolean) {
    setCfg((c) => ({
      ...c,
      disabledLogics: enabled
        ? c.disabledLogics.filter((x) => x !== id)
        : [...new Set([...c.disabledLogics, id])],
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
    <div className="p-6 max-w-3xl mx-auto">
      <nav className="text-sm text-slate-400 mb-4">
        <button onClick={() => dispatch({ type: 'GO_DASHBOARD' })} className="text-brand-700 hover:underline">
          דשבורד
        </button>
        <span className="mx-1.5">‹</span>
        <span className="text-slate-600">אזור לוגיקות</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-800 mb-1">אזור לוגיקות</h1>
      <p className="text-slate-500 mb-5 text-sm">
        כל לוגיקת ניתוח מוצגת כאן עם ההסבר כיצד ההארה נבנית והספים שניתן לכוונן. שינוי סף מריץ את
        הניתוח מחדש. לוגיקה שתכובה לא תייצר הארות.
      </p>

      {/* Product tabs — review one product at a time */}
      <div className="flex flex-wrap gap-2 mb-5">
        {PRODUCT_TABS.map((p) => (
          <button
            key={p}
            onClick={() => setProduct(p)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium border ${
              product === p
                ? 'bg-brand-700 text-white border-brand-700'
                : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
            }`}
          >
            {productTypeLabels[p]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {logicsForProduct(product).map((logic) => (
          <LogicCard
            key={logic.id}
            logic={logic}
            product={product}
            thresholds={cfg.thresholds}
            enabled={!cfg.disabledLogics.includes(logic.id)}
            onParam={setParam}
            onFee={setFee}
            onToggle={(en) => toggleLogic(logic.id, en)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={save}
          className="rounded-xl bg-gradient-to-l from-brand-800 to-brand-700 text-white font-semibold py-2.5 px-8 hover:opacity-95"
        >
          שמירה והרצת ניתוח מחדש
        </button>
        <button onClick={resetAll} className="text-sm text-slate-500 hover:text-slate-700 hover:underline">
          איפוס לברירת מחדל
        </button>
        {saved && <span className="text-sm text-accent-600 font-medium">✓ נשמר — הניתוח עודכן</span>}
      </div>
    </div>
  )
}

function LogicCard({
  logic,
  product,
  thresholds,
  enabled,
  onParam,
  onFee,
  onToggle,
}: {
  logic: LogicDef
  product: ProductType
  thresholds: ThresholdValues
  enabled: boolean
  onParam: (key: LogicParam['key'], value: string) => void
  onFee: (pt: ProductType, field: 'fromDeposit' | 'fromAccumulation', value: string) => void
  onToggle: (enabled: boolean) => void
}) {
  const changed =
    logic.params.some((p) => thresholds[p.key] !== DEFAULT_THRESHOLDS[p.key]) ||
    (logic.editsMarketFees &&
      JSON.stringify(thresholds.marketFees[product]) !==
        JSON.stringify(DEFAULT_THRESHOLDS.marketFees[product]))

  return (
    <div className={`rounded-2xl bg-white border p-5 shadow-sm ${enabled ? 'border-slate-200/70' : 'border-slate-200/70 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800">{logic.label}</h3>
            {changed && <span className="text-[10px] rounded bg-amber-100 text-amber-700 px-1.5 py-0.5">שונה</span>}
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{logic.explanation}</p>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          פעיל
        </label>
      </div>

      {(logic.params.length > 0 || logic.editsMarketFees) && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {logic.params.map((p) => (
            <label key={p.key} className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">
                {p.label}
                {p.unit ? ` (${p.unit})` : ''}
              </span>
              <input
                type="number"
                step="any"
                disabled={!enabled}
                value={String(thresholds[p.key] ?? '')}
                onChange={(e) => onParam(p.key, e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 disabled:bg-slate-50"
              />
            </label>
          ))}
          {logic.editsMarketFees && (
            <>
              <label className="text-sm">
                <span className="block text-xs text-slate-500 mb-1">סף דמי ניהול מהפקדה (%)</span>
                <input
                  type="number"
                  step="any"
                  disabled={!enabled}
                  value={thresholds.marketFees[product]?.fromDeposit ?? ''}
                  onChange={(e) => onFee(product, 'fromDeposit', e.target.value)}
                  placeholder="לא רלוונטי"
                  className="w-full rounded-lg border border-slate-300 p-2 disabled:bg-slate-50"
                />
              </label>
              <label className="text-sm">
                <span className="block text-xs text-slate-500 mb-1">סף דמי ניהול מצבירה (%)</span>
                <input
                  type="number"
                  step="any"
                  disabled={!enabled}
                  value={thresholds.marketFees[product]?.fromAccumulation ?? ''}
                  onChange={(e) => onFee(product, 'fromAccumulation', e.target.value)}
                  placeholder="לא רלוונטי"
                  className="w-full rounded-lg border border-slate-300 p-2 disabled:bg-slate-50"
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

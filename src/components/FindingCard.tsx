import type { Finding } from '../models/types'
import { findingCategoryLabels, productTypeLabels } from '../models/labels'
import { useApp } from '../hooks/useAppState'

// Display kind derived from category+severity — six distinct visual levels,
// red reserved for real gaps only.
type DisplayKind = 'block' | 'gap' | 'attention' | 'missing' | 'insight' | 'info'

function kindOf(f: Finding): DisplayKind {
  if (f.category === 'limitation' && f.severity !== 'info') return 'block'
  if (f.category === 'limitation' || f.category === 'dataQuality') return 'missing'
  if (f.severity === 'gap') return 'gap'
  if (f.severity === 'attention') return 'attention'
  if (f.category === 'insight') return 'insight'
  return 'info'
}

const kindStyles: Record<DisplayKind, { border: string; chip: string; label: string }> = {
  block: { border: 'border-s-slate-700', chip: 'bg-slate-700 text-white', label: 'ניתוח מוגבל' },
  gap: { border: 'border-s-rose-400', chip: 'bg-rose-50 text-rose-700', label: 'נמצא פער' },
  attention: { border: 'border-s-amber-400', chip: 'bg-amber-50 text-amber-700', label: 'נקודה לבדיקה' },
  missing: { border: 'border-s-violet-300', chip: 'bg-violet-50 text-violet-600', label: 'מידע חסר' },
  insight: { border: 'border-s-teal-300', chip: 'bg-teal-50 text-teal-700', label: 'הארה' },
  info: { border: 'border-s-slate-200', chip: 'bg-slate-100 text-slate-500', label: 'מידע' },
}

export default function FindingCard({
  finding,
  interactive = true,
}: {
  finding: Finding
  interactive?: boolean
}) {
  const { dispatch } = useApp()
  const kind = kindStyles[kindOf(finding)]

  return (
    <div
      className={`rounded-xl border border-slate-200/70 border-s-4 bg-white p-3.5 shadow-sm ${kind.border}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${kind.chip}`}>
          {kind.label}
        </span>
        <span className="text-[11px] text-slate-400">{findingCategoryLabels[finding.category]}</span>
        <span className="font-semibold text-sm text-slate-800">{finding.title}</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{finding.description}</p>

      {finding.basedOn && (
        <p className="mt-1.5 text-xs text-slate-400">
          <span className="font-medium text-slate-500">מבוסס על:</span> {finding.basedOn}
        </p>
      )}
      {finding.missingInfo && (
        <p className="mt-1 text-xs text-violet-500">
          <span className="font-medium">להשלמת הבדיקה:</span> {finding.missingInfo}
        </p>
      )}

      {interactive && (finding.policyNumber || finding.productType) && (
        <div className="mt-2 flex gap-3">
          {finding.productType && (
            <button
              onClick={() => dispatch({ type: 'OPEN_PRODUCT', productType: finding.productType! })}
              className="text-xs text-[#1a4270] font-medium hover:underline"
            >
              למסך {productTypeLabels[finding.productType]} ←
            </button>
          )}
          {finding.policyNumber && (
            <button
              onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: finding.policyNumber! })}
              className="text-xs text-[#1a4270] font-medium hover:underline"
            >
              לפרטי הפוליסה ←
            </button>
          )}
        </div>
      )}
    </div>
  )
}

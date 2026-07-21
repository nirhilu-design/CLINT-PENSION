import { useApp } from '../hooks/useAppState'
import { findingCategoryLabels } from '../models/labels'
import type { FindingCategory, FindingSeverity } from '../models/types'
import {
  GENERAL_RULES,
  PRODUCT_RULE_GROUPS,
  type ControlRule,
  type RuleGroup,
} from '../config/controlRules'

// A rule's visual level mirrors the severity language used in FindingCard,
// with dataQuality / insight getting their own hue.
type RuleKind = 'gap' | 'attention' | 'missing' | 'insight' | 'info'

function kindOf(r: ControlRule): RuleKind {
  if (r.category === 'dataQuality') return 'missing'
  if (r.severity === 'gap') return 'gap'
  if (r.severity === 'attention') return 'attention'
  if (r.category === 'insight') return 'insight'
  return 'info'
}

const kindStyles: Record<RuleKind, { border: string; chip: string; label: string }> = {
  gap: { border: 'border-s-rose-400', chip: 'bg-rose-50 text-rose-700', label: 'פער' },
  attention: { border: 'border-s-amber-400', chip: 'bg-amber-50 text-amber-700', label: 'לבדיקה' },
  missing: { border: 'border-s-violet-300', chip: 'bg-violet-50 text-violet-600', label: 'איכות נתונים' },
  insight: { border: 'border-s-teal-300', chip: 'bg-teal-50 text-teal-700', label: 'הארה' },
  info: { border: 'border-s-slate-200', chip: 'bg-slate-100 text-slate-500', label: 'מידע' },
}

const severityChips: { key: FindingSeverity | 'insight'; label: string; className: string }[] = [
  { key: 'gap', label: 'פער', className: 'bg-rose-50 text-rose-700' },
  { key: 'attention', label: 'לבדיקה', className: 'bg-amber-50 text-amber-700' },
  { key: 'insight', label: 'הארה', className: 'bg-teal-50 text-teal-700' },
  { key: 'info', label: 'מידע', className: 'bg-slate-100 text-slate-500' },
]

function RuleRow({ rule }: { rule: ControlRule }) {
  const kind = kindStyles[kindOf(rule)]
  return (
    <div className={`rounded-xl border border-slate-200/70 border-s-4 bg-white p-3.5 shadow-sm ${kind.border}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${kind.chip}`}>{kind.label}</span>
        <span className="text-[11px] text-slate-400">
          {findingCategoryLabels[rule.category as FindingCategory]}
        </span>
        {rule.threshold && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium tabular">
            {rule.threshold}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-slate-700 leading-relaxed">{rule.condition}</p>
      <p className="mt-1.5 text-xs text-slate-400">
        <span className="font-medium text-slate-500">מבוסס על:</span> {rule.basedOn}
      </p>
    </div>
  )
}

function GroupSection({ group }: { group: RuleGroup }) {
  return (
    <section className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-5">
      <div className="mb-3">
        <h2 className="text-lg font-bold text-slate-800">{group.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{group.subtitle}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {group.rules.map((rule, i) => (
          <RuleRow key={i} rule={rule} />
        ))}
      </div>
    </section>
  )
}

export default function RulesPage() {
  const { dispatch } = useApp()
  const totalRules =
    GENERAL_RULES.rules.length + PRODUCT_RULE_GROUPS.reduce((s, g) => s + g.rules.length, 0)

  return (
    <div>
      {/* Hero band — mirrors the dashboard's identity */}
      <div className="bg-gradient-to-l from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-6 pt-8 pb-10">
          <button
            onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
            className="text-xs text-slate-300/80 hover:text-white transition mb-2"
          >
            → חזרה לדשבורד
          </button>
          <h1 className="text-2xl font-bold">חוקי בקרה</h1>
          <p className="text-sm text-slate-300/80 mt-1">
            הלוגיקות שהמערכת מפעילה על הנתונים — כלליות ולכל מוצר · {totalRules} חוקים פעילים
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {severityChips.map((c) => (
              <span
                key={c.key}
                className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${c.className}`}
              >
                {c.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 pb-12 space-y-6">
        <GroupSection group={GENERAL_RULES} />

        <div>
          <h2 className="text-sm font-semibold text-slate-500 mb-3 pt-2">חוקים לפי מוצר</h2>
          <div className="space-y-6">
            {PRODUCT_RULE_GROUPS.map((g) => (
              <GroupSection key={g.key} group={g} />
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed pt-2">
          התצוגה מיועדת לעיון בלבד. הספים והלוגיקות נקבעים במנועי הניתוח ובקובץ הספים המרכזי;
          שינוי חוק מתבצע בקוד ולא במסך זה.
        </p>
      </div>
    </div>
  )
}

import { formatCurrency } from '../utils/format'

// Shows, on one horizontal bar, what today's accumulation is worth as a monthly
// pension without further deposits (base) and how continued deposits grow it (the
// accent increment). Identity is carried by direct labels, not color alone.
export default function PensionScenarioBar({
  withDeposits,
  withoutDeposits,
}: {
  withDeposits: number
  withoutDeposits: number
}) {
  const base = Math.max(0, withoutDeposits)
  const total = Math.max(base, withDeposits)
  const increment = Math.max(0, total - base)
  if (total <= 0) return null

  const basePct = (base / total) * 100
  const incPct = (increment / total) * 100

  return (
    <section className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm mb-8">
      <h3 className="font-bold text-slate-800">קצבה חודשית חזויה — הערך של המשך ההפקדות</h3>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed">
        הצבירה של היום שקולה לקצבה חודשית של{' '}
        <span className="font-semibold text-slate-700">{formatCurrency(base)}</span> גם אם ההפקדות
        ייפסקו. המשך ההפקדות עד הפרישה מגדיל אותה ל-
        <span className="font-semibold text-slate-700">{formatCurrency(total)}</span> בחודש.
      </p>

      {/* Stacked bar: base (navy) + increment from continued deposits (accent) */}
      <div className="mt-4 flex h-9 w-full overflow-hidden rounded-lg bg-slate-100" role="img"
        aria-label={`קצבה ללא המשך הפקדות ${formatCurrency(base)}, ובהמשך הפקדות ${formatCurrency(total)}`}>
        <div
          className="h-full bg-brand-700"
          style={{ width: `${basePct}%` }}
          title={`ללא המשך הפקדות: ${formatCurrency(base)}`}
        />
        {increment > 0 && (
          <div
            className="h-full bg-accent-500 border-r-2 border-white"
            style={{ width: `${incPct}%` }}
            title={`תוספת בהמשך הפקדות: ${formatCurrency(increment)}`}
          />
        )}
      </div>

      {/* Legend + values (identity not by color alone) */}
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5 text-slate-600">
          <span className="w-3 h-3 rounded-sm bg-brand-700 inline-block" />
          ללא המשך הפקדות: <span className="font-semibold text-slate-800">{formatCurrency(base)}</span>
        </span>
        {increment > 0 && (
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded-sm bg-accent-500 inline-block" />
            תוספת בהמשך הפקדות:{' '}
            <span className="font-semibold text-slate-800">+{formatCurrency(increment)}</span>
          </span>
        )}
        <span className="flex items-center gap-1.5 text-slate-600 ms-auto">
          סה״כ בהמשך הפקדות: <span className="font-semibold text-slate-800">{formatCurrency(total)}</span>
        </span>
      </div>
    </section>
  )
}

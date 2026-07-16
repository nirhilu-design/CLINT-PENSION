const accents: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-600',
}

export default function KpiCard({
  label,
  value,
  sub,
  icon,
  accent = 'blue',
}: {
  label: string
  value: string
  sub?: string
  icon?: string
  accent?: keyof typeof accents
}) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200 flex items-start gap-3">
      {icon && (
        <span className={`w-9 h-9 rounded-lg grid place-items-center text-lg shrink-0 ${accents[accent]}`}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="text-sm text-slate-500 truncate">{label}</div>
        <div className="mt-0.5 text-2xl font-bold text-slate-800">{value}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  )
}

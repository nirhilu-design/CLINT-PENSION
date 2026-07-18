export default function KpiCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
  icon?: string
  accent?: string
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/70">
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-800 tabular">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

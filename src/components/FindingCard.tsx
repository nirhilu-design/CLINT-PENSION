import type { Finding } from '../models/types'
import { findingCategoryLabels } from '../models/labels'

const severityAccent: Record<Finding['severity'], string> = {
  gap: 'border-s-rose-400',
  attention: 'border-s-amber-400',
  info: 'border-s-slate-200',
}

const severityBadge: Record<Finding['severity'], string> = {
  gap: 'bg-rose-50 text-rose-700',
  attention: 'bg-amber-50 text-amber-700',
  info: 'bg-slate-100 text-slate-500',
}

export default function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div
      className={`rounded-xl border border-slate-200/70 border-s-4 bg-white p-3.5 shadow-sm ${severityAccent[finding.severity]}`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${severityBadge[finding.severity]}`}>
          {findingCategoryLabels[finding.category]}
        </span>
        <span className="font-semibold text-sm text-slate-800">{finding.title}</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{finding.description}</p>
    </div>
  )
}

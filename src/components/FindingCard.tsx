import type { Finding } from '../models/types'
import { findingCategoryLabels } from '../models/labels'

const severityStyles: Record<Finding['severity'], string> = {
  gap: 'border-red-300 bg-red-50',
  attention: 'border-amber-300 bg-amber-50',
  info: 'border-slate-200 bg-white',
}

const severityBadge: Record<Finding['severity'], string> = {
  gap: 'bg-red-100 text-red-700',
  attention: 'bg-amber-100 text-amber-700',
  info: 'bg-slate-100 text-slate-600',
}

export default function FindingCard({ finding }: { finding: Finding }) {
  return (
    <div className={`rounded-lg border p-3 ${severityStyles[finding.severity]}`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${severityBadge[finding.severity]}`}>
          {findingCategoryLabels[finding.category]}
        </span>
        <span className="font-semibold text-sm text-slate-800">{finding.title}</span>
      </div>
      <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{finding.description}</p>
    </div>
  )
}

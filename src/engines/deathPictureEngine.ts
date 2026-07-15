// Death Picture Engine: aggregate death/survivor coverage and capital assets.
// Information output only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatCurrency } from '../utils/format'

export const deathPictureEngine: Engine = ({ policies }) => {
  const active = policies.filter((p) => p.status !== 'inactive')

  const monthlySurvivors = active
    .flatMap((p) => p.coverages)
    .filter((c) => c.type === 'survivors')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  const deathLumpSum = active
    .flatMap((p) => p.coverages)
    .filter((c) => c.type === 'death')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  const capitalAssets = active
    .filter((p) => p.productType === 'gemel' || p.productType === 'education')
    .reduce((sum, p) => sum + (p.currentValue ?? 0), 0)

  const parts: string[] = []
  if (monthlySurvivors > 0) parts.push(`קצבת שאירים חודשית: ${formatCurrency(monthlySurvivors)}`)
  if (deathLumpSum > 0) parts.push(`סכום ביטוח חד-פעמי למקרה מוות: ${formatCurrency(deathLumpSum)}`)
  if (capitalAssets > 0) parts.push(`נכסים הוניים (גמל והשתלמות): ${formatCurrency(capitalAssets)}`)

  if (parts.length === 0) {
    return [
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'info',
        title: 'תמונת מוות — אין נתונים להצגה',
        description: 'במוצרים שנותחו לא נמצאו כיסויי מוות/שאירים או נכסים הוניים להצגה.',
      }),
    ]
  }

  return [
    makeFinding({
      category: 'death',
      level: 'client',
      severity: 'info',
      title: 'תמונת מוות מרוכזת',
      description: `במקרה מוות, התמונה הכוללת מהמוצרים שנותחו: ${parts.join(' | ')}.`,
    }),
  ]
}

// Death Picture Engine: aggregate death/survivor coverage and capital assets.
// Information output only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatCurrency } from '../utils/format'

export const deathPictureEngine: Engine = ({ policies, supplementary }) => {
  const findings = []
  const active = policies.filter((p) => p.status !== 'inactive')

  const survivorCoverages = active.flatMap((p) => p.coverages).filter((c) => c.type === 'survivors')
  const widowMonthly = survivorCoverages
    .filter((c) => c.name?.includes('אלמן'))
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const orphanMonthly = survivorCoverages
    .filter((c) => c.name?.includes('יתום'))
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)
  const monthlySurvivors = widowMonthly + orphanMonthly

  const deathLumpSum = active
    .flatMap((p) => p.coverages)
    .filter((c) => c.type === 'death')
    .reduce((sum, c) => sum + (c.amount ?? 0), 0)

  const capitalAssets = active
    .filter((p) => ['gemel', 'gemelInvestment', 'education'].includes(p.productType))
    .reduce((sum, p) => sum + (p.currentValue ?? 0), 0)

  const parts: string[] = []
  if (deathLumpSum > 0) {
    parts.push(`קיים ביטוח חד-פעמי למקרה פטירה בסך ${formatCurrency(deathLumpSum)}`)
  }
  if (widowMonthly > 0 || orphanMonthly > 0) {
    const survivorParts: string[] = []
    if (widowMonthly > 0) survivorParts.push(`${formatCurrency(widowMonthly)} לאלמן/ה`)
    if (orphanMonthly > 0) survivorParts.push(`${formatCurrency(orphanMonthly)} ליתום (במידה וקיימים)`)
    parts.push(`פיצוי חודשי מקרן הפנסיה: ${survivorParts.join(' וכן ')}`)
  }
  if (capitalAssets > 0) parts.push(`נכסים הוניים (גמל והשתלמות): ${formatCurrency(capitalAssets)}`)

  if (parts.length === 0) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'info',
        title: 'תמונת מוות — אין נתונים להצגה',
        description: 'במוצרים שנותחו לא נמצאו כיסויי מוות/שאירים או נכסים הוניים להצגה.',
      }),
    )
  } else {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'info',
        title: 'תמונת מוות מרוכזת',
        description: `במקרה מוות, התמונה הכוללת מהמוצרים שנותחו: ${parts.join(' | ')}.`,
      }),
    )
  }

  // Family context from the supplementary questions
  const hasDeathProtection = monthlySurvivors > 0 || deathLumpSum > 0
  const hasDependents =
    supplementary.hasChildrenUnder21 === true || supplementary.hasSpouse === true

  if (hasDependents && !hasDeathProtection) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'attention',
        title: 'יש תלויים אך לא נמצא כיסוי למקרה מוות',
        description:
          'צוין שקיימים ילדים מתחת לגיל 21 או בן/בת זוג, אך במוצרים שנותחו לא נמצא כיסוי שאירים או ביטוח למקרה מוות. ' +
          'מומלץ לבחון את הצורך בכיסוי משפחתי.',
      }),
    )
  }

  if (
    supplementary.hasChildrenUnder21 === false &&
    supplementary.hasSpouse === false &&
    hasDeathProtection
  ) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'attention',
        title: 'כיסוי מוות קיים ללא תלויים',
        description:
          'צוין שאין ילדים מתחת לגיל 21 ואין בן/בת זוג, אך קיימים כיסויי מוות/שאירים בתשלום. ' +
          'כדאי לבדוק את הצורך בכיסויים אלה ואת עלותם.',
      }),
    )
  }

  if (supplementary.hasOtherMaterialAssets === true && hasDependents && !hasDeathProtection) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'info',
        title: 'נכסים מהותיים אחרים כרשת ביטחון',
        description:
          'צוין שקיימים נכסים פיננסיים מהותיים נוספים מחוץ לתיק הפנסיוני. ' +
          'נכסים אלה עשויים להוות חלופה חלקית לכיסוי ביטוחי — מומלץ לבחון את התמונה הכוללת מול בעל רישיון.',
      }),
    )
  }

  return findings
}

// Death Picture Engine: aggregate death/survivor coverage and capital assets.
// Information output only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatCurrency } from '../utils/format'
import { LARGE_ASSETS_THRESHOLD, LARGE_LIFE_COVER_THRESHOLD } from '../config/thresholds'
import { computeDeathCapital } from '../services/deathCapitalService'

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

  // הון למקרה פטירה: צבירת המוצרים ההוניים + ביטוח ריסק, ללא ספירה כפולה.
  const deathCapital = computeDeathCapital(policies)
  const deathRisk = deathCapital.risk // חלק הביטוח (ריסק) בלבד — לצורך זיהוי "כיסוי ביטוחי"
  const capitalAssets = deathCapital.savings // חלק הצבירה ההונית

  const parts: string[] = []
  if (deathCapital.total > 0) {
    const breakdown: string[] = []
    if (capitalAssets > 0) breakdown.push(`צבירה הונית ${formatCurrency(capitalAssets)}`)
    if (deathRisk > 0) breakdown.push(`ביטוח ריסק ${formatCurrency(deathRisk)}`)
    parts.push(
      `הון זמין למקרה פטירה: ${formatCurrency(deathCapital.total)}` +
        (breakdown.length > 1 ? ` (${breakdown.join(' + ')})` : ''),
    )
  }
  if (widowMonthly > 0 || orphanMonthly > 0) {
    const survivorParts: string[] = []
    if (widowMonthly > 0) survivorParts.push(`${formatCurrency(widowMonthly)} לאלמן/ה`)
    if (orphanMonthly > 0) survivorParts.push(`${formatCurrency(orphanMonthly)} ליתום (במידה וקיימים)`)
    parts.push(`פיצוי חודשי מקרן הפנסיה: ${survivorParts.join(' וכן ')}`)
  }

  const totalLiabilities =
    (supplementary.mortgageBalance ?? 0) + (supplementary.otherDebts ?? 0)
  if (totalLiabilities > 0) parts.push(`התחייבויות (משכנתא/חובות): ${formatCurrency(totalLiabilities)}`)

  // Client-stated assets outside the pension portfolio
  const statedParts: string[] = []
  if (supplementary.otherAssetsRealEstateValue) {
    statedParts.push(`נדל"ן ${formatCurrency(supplementary.otherAssetsRealEstateValue)}`)
  }
  if (supplementary.otherAssetsPortfolioValue) {
    statedParts.push(`תיק השקעות ${formatCurrency(supplementary.otherAssetsPortfolioValue)}`)
  }
  if (supplementary.otherAssetsLiquidValue) {
    statedParts.push(`כספים חופשיים ${formatCurrency(supplementary.otherAssetsLiquidValue)}`)
  }
  if (statedParts.length > 0) parts.push(`נכסים נוספים שדווחו: ${statedParts.join(', ')}`)

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
  const hasDeathProtection = monthlySurvivors > 0 || deathRisk > 0
  const hasDependents =
    supplementary.hasChildrenUnder21 === true || supplementary.hasSpouse === true

  if (hasDependents && !hasDeathProtection) {
    // The family relying on this income makes the missing coverage a real gap
    const reliesOnIncome = supplementary.familyReliesOnIncome === true
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: reliesOnIncome ? 'gap' : 'attention',
        title: reliesOnIncome
          ? 'נמצא פער: המשפחה מסתמכת על ההכנסה ואין כיסוי למקרה מוות'
          : 'יש תלויים אך לא נמצא כיסוי למקרה מוות',
        description:
          'צוין שקיימים ילדים מתחת לגיל 21 או בן/בת זוג' +
          (reliesOnIncome ? ' ושהמשפחה מסתמכת על ההכנסה שלך, ' : ', ') +
          'אך במוצרים שנותחו לא נמצא כיסוי שאירים או ביטוח למקרה מוות. ' +
          'נקודה לבדיקה מול בעל רישיון.',
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
          'נקודה לבדיקה מול בעל רישיון.',
      }),
    )
  }

  // Life-insurance coverage vs the liabilities it would need to clear at death
  if (totalLiabilities > 0) {
    const availableAtDeath = deathCapital.total
    if (availableAtDeath < totalLiabilities) {
      const reliesOnIncome = supplementary.familyReliesOnIncome === true
      findings.push(
        makeFinding({
          category: 'death',
          level: 'client',
          severity: hasDependents && reliesOnIncome ? 'gap' : 'attention',
          title: 'כיסוי המוות נמוך מההתחייבויות',
          description:
            `ההתחייבויות (משכנתא/חובות) עומדות על כ-${formatCurrency(totalLiabilities)}, ` +
            `בעוד הכיסוי הזמין במקרה מוות (ביטוח חיים ונכסים הוניים) הוא כ-${formatCurrency(availableAtDeath)}. ` +
            'ייתכן שהמשפחה תירש חלק מההתחייבויות ללא כיסוי — נקודה לבדיקה מול בעל רישיון.',
        }),
      )
    } else {
      findings.push(
        makeFinding({
          category: 'death',
          level: 'client',
          severity: 'info',
          title: 'כיסוי המוות מכסה את ההתחייבויות',
          description:
            `הכיסוי הזמין במקרה מוות (כ-${formatCurrency(availableAtDeath)}) מכסה את ההתחייבויות ` +
            `(כ-${formatCurrency(totalLiabilities)}). נקודה לבדיקה מול בעל רישיון.`,
        }),
      )
    }
  }

  // Large life-insurance coverage alongside substantial private assets —
  // the assets already provide a safety net, so the coverage's cost-benefit
  // is worth a look
  const statedAssetsTotal =
    (supplementary.otherAssetsRealEstateValue ?? 0) +
    (supplementary.otherAssetsPortfolioValue ?? 0) +
    (supplementary.otherAssetsLiquidValue ?? 0)
  if (statedAssetsTotal >= LARGE_ASSETS_THRESHOLD && deathRisk >= LARGE_LIFE_COVER_THRESHOLD) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'attention',
        title: 'ביטוח חיים גדול לצד נכסים מהותיים',
        description:
          `דווחו נכסים בשווי כולל של כ-${formatCurrency(statedAssetsTotal)} לצד כיסוי ביטוח חיים של ${formatCurrency(deathRisk)}. ` +
          'כאשר קיימים נכסים משמעותיים המשמשים רשת ביטחון, היקף הכיסוי ועלותו מול הצורך בפועל הם נקודה לבדיקה מול בעל רישיון.',
      }),
    )
  }

  if (supplementary.hasOtherMaterialAssets === true && hasDependents && !hasDeathProtection) {
    const statedTotal =
      (supplementary.otherAssetsRealEstateValue ?? 0) +
      (supplementary.otherAssetsPortfolioValue ?? 0) +
      (supplementary.otherAssetsLiquidValue ?? 0)
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'info',
        title: 'נכסים מהותיים אחרים כרשת ביטחון',
        description:
          (statedTotal > 0
            ? `דווחו נכסים נוספים מחוץ לתיק הפנסיוני בשווי כולל של כ-${formatCurrency(statedTotal)}. `
            : 'צוין שקיימים נכסים פיננסיים מהותיים נוספים מחוץ לתיק הפנסיוני. ') +
          'נכסים אלה עשויים להוות חלופה חלקית לכיסוי ביטוחי — נקודה לבדיקה מול בעל רישיון.',
      }),
    )
  }

  return findings
}

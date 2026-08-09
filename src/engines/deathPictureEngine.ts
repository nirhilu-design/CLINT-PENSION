// Death Picture Engine: aggregate death/survivor coverage and capital assets.
// Information output only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatCurrency } from '../utils/format'
import { LARGE_ASSETS_THRESHOLD, LARGE_LIFE_COVER_THRESHOLD } from '../config/thresholds'

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

  // Pension/managers accumulation is normally paid to survivors as a monthly
  // pension — NOT a lump sum available to clear debts. It is paid to the named
  // beneficiaries as a lump ONLY when there are no survivors. We treat that as
  // established when the policy carries a survivors waiver (from the XML) or the
  // client declared no spouse and no children under 21.
  const noDeclaredDependents =
    supplementary.hasSpouse === false && supplementary.hasChildrenUnder21 === false
  const pensionPolicies = active.filter(
    (p) => p.productType === 'pension' || p.productType === 'managers',
  )
  const pensionAccumulation = pensionPolicies.reduce((sum, p) => sum + (p.currentValue ?? 0), 0)
  const pensionLumpAtDeath = pensionPolicies
    .filter((p) => p.survivorsWaiver === true || noDeclaredDependents)
    .reduce((sum, p) => sum + (p.currentValue ?? 0), 0)
  // Pension savings that stay a survivors pension (excluded from the lump math)
  const pensionAsSurvivorsPension = pensionAccumulation - pensionLumpAtDeath

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
  const hasDeathProtection = monthlySurvivors > 0 || deathLumpSum > 0
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

  // Life-insurance coverage vs the liabilities it would need to clear at death.
  // Lump sum available = life insurance + capital assets (+ pension accumulation
  // only where it is paid to beneficiaries rather than as a survivors pension).
  if (totalLiabilities > 0) {
    const availableAtDeath = deathLumpSum + capitalAssets + pensionLumpAtDeath
    const lumpNote =
      pensionLumpAtDeath > 0
        ? ' (כולל צבירת פנסיה/מנהלים המשולמת למוטבים בהיעדר שאירים)'
        : ''
    // When pension savings would instead be paid as a survivors pension, the
    // lump-sum comparison understates the family's protection — say so.
    const survivorsPensionNote =
      pensionAsSurvivorsPension > 0
        ? ` יש לשים לב שצבירת הפנסיה/מנהלים (כ-${formatCurrency(pensionAsSurvivorsPension)}) משולמת כקצבת שאירים ואינה נכללת בהון הזמין לסילוק חד-פעמי.`
        : ''
    if (availableAtDeath < totalLiabilities) {
      const reliesOnIncome = supplementary.familyReliesOnIncome === true
      findings.push(
        makeFinding({
          category: 'death',
          level: 'client',
          severity: hasDependents && reliesOnIncome ? 'gap' : 'attention',
          title: 'ההון הזמין במקרה מוות נמוך מההתחייבויות',
          description:
            `ההתחייבויות (משכנתא/חובות) עומדות על כ-${formatCurrency(totalLiabilities)}, ` +
            `בעוד ההון הזמין במקרה מוות (ביטוח חיים ונכסים הוניים${lumpNote}) הוא כ-${formatCurrency(availableAtDeath)}.` +
            survivorsPensionNote +
            ' ייתכן שהמשפחה תירש חלק מההתחייבויות ללא כיסוי חד-פעמי — נקודה לבדיקה מול בעל רישיון.',
        }),
      )
    } else {
      findings.push(
        makeFinding({
          category: 'death',
          level: 'client',
          severity: 'info',
          title: 'ההון הזמין במקרה מוות מכסה את ההתחייבויות',
          description:
            `ההון הזמין במקרה מוות (כ-${formatCurrency(availableAtDeath)}${lumpNote}) מכסה את ההתחייבויות ` +
            `(כ-${formatCurrency(totalLiabilities)}).` +
            survivorsPensionNote +
            ' נקודה לבדיקה מול בעל רישיון.',
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
  if (statedAssetsTotal >= LARGE_ASSETS_THRESHOLD && deathLumpSum >= LARGE_LIFE_COVER_THRESHOLD) {
    findings.push(
      makeFinding({
        category: 'death',
        level: 'client',
        severity: 'attention',
        title: 'ביטוח חיים גדול לצד נכסים מהותיים',
        description:
          `דווחו נכסים בשווי כולל של כ-${formatCurrency(statedAssetsTotal)} לצד כיסוי ביטוח חיים של ${formatCurrency(deathLumpSum)}. ` +
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

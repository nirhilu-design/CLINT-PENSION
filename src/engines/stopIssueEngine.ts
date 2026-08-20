// Managers Generation Engine (formerly "stop issue").
// Every generation of managers insurance is examined — nothing is blocked.
// One neutral per-policy observation combines the generation, its guaranteed
// annuity factor, and a portfolio-context clause (split with a pension fund,
// family context, and — for the 2004-2013 new-factor case — the fee level).

import type { Engine } from './engineTypes'
import { makeFinding, effectiveSalary } from './engineTypes'
import { coverageTypeLabels } from '../models/labels'
import { MEKIFA_SALARY_CAP, MANAGERS_NEW_FACTOR_FEE_THRESHOLD } from '../config/thresholds'

const generationLabels: Record<string, string> = {
  'before-2001-06': 'לפני יוני 2001',
  '2001-06-to-2004': 'יוני 2001 עד 2004',
  '2004-to-2013': '2004 עד 2013',
  '2013-plus': '2013 ואילך',
}

function generationTrait(gen: string): string {
  switch (gen) {
    case 'before-2001-06':
      return 'דור עם תנאים היסטוריים, לרוב מקדם קצבה מובטח ומסלול נכות מובנה. '
    case '2001-06-to-2004':
    case '2004-to-2013':
      return 'דור שבחלקו כולל מקדם קצבה מובטח. '
    case '2013-plus':
      return 'דור ללא מקדם קצבה מובטח — מקדם ההמרה נקבע לפי לוחות התמותה בעת הפרישה. '
    default:
      return ''
  }
}

export const stopIssueEngine: Engine = ({ policies, supplementary }) => {
  const managers = policies.filter((p) => p.productType === 'managers' && p.managersGeneration)
  if (managers.length === 0) return []

  // Portfolio context shared by all managers observations
  const hasActivePension = policies.some((p) => p.productType === 'pension' && p.status === 'active')
  const hasDependents =
    supplementary.hasSpouse === true || supplementary.hasChildrenUnder21 === true
  const noDependentsKnown =
    supplementary.hasSpouse === false && supplementary.hasChildrenUnder21 === false
  const salary = effectiveSalary(policies, supplementary)
  const aboveMekifaCap = salary !== null && salary > MEKIFA_SALARY_CAP

  return managers.map((p) => {
    const gen = p.managersGeneration!
    const genLabel = generationLabels[gen] ?? gen
    const factorNote = p.hasGuaranteedFactor
      ? 'זוהה מקדם קצבה מובטח בדיווח — יתרון משמעותי ששוויו בפועל תלוי בגיל, בוותק ובתמונה הכוללת. '
      : 'לא זוהה מקדם קצבה מובטח בדיווח. '

    // Inactive policy: no ongoing deposits, so the deposit-split / deposit-
    // efficiency analysis is irrelevant. Keep it short — a paid-up policy with a
    // guaranteed factor is an asset to preserve, nothing to divert.
    if (p.status !== 'active') {
      return makeFinding({
        category: 'insight',
        level: 'policy',
        severity: 'info',
        title: 'דור ביטוח המנהלים ומקדם הקצבה',
        description:
          `פוליסה ${p.policyNumber} — דור ${genLabel}, אינה פעילה (אין הפקדות שוטפות). ` +
          (p.hasGuaranteedFactor
            ? 'פוליסה עם מקדם קצבה מובטח — נכס שכדאי לשמר. אין סוגיית חלוקת הפקדות. '
            : 'אין סוגיית חלוקת הפקדות שוטפות. ') +
          'נקודה לבדיקה מול בעל רישיון.',
        productType: 'managers',
        policyNumber: p.policyNumber,
      })
    }

    // Deposit-efficiency clause for active policies: a high accumulation fee makes
    // ongoing deposits expensive, so — when a cheaper pension fund exists — new
    // deposits are better directed there. Below the pension deposit ceiling the
    // fund can absorb the full salary; if disability is covered separately and the
    // savings sit in pension funds, cancelling the policy is worth weighing.
    const fee = p.fees.fromAccumulation
    const feeHigh = fee === null || fee > MANAGERS_NEW_FACTOR_FEE_THRESHOLD
    const hasSeparateDisability = policies.some(
      (o) =>
        o.policyNumber !== p.policyNumber &&
        (o.productType === 'incomeProtection' || o.coverages.some((c) => c.type === 'disability')),
    )
    const depositEfficiencyClause = () => {
      if (!feeHigh) return ''
      let eff =
        `דמי ניהול מצבירה ${fee !== null ? fee.toFixed(2) + '%' : 'לא דווחו'}` +
        (fee !== null ? ' (גבוהים יחסית)' : '') +
        ' — הפקדה שוטפת לפוליסה זו יקרה. '
      if (hasActivePension)
        eff += 'קיימת קרן פנסיה פעילה כאלטרנטיבה זולה יותר; כדאי לשקול הפניית ההפקדות השוטפות אליה. '
      if (!aboveMekifaCap)
        eff += 'השכר אינו מעל תקרת ההפקדה לפנסיה, כך שניתן להפקיד את מלוא ההפקדה לקרן הפנסיה. '
      if (hasSeparateDisability && hasActivePension)
        eff +=
          'ככל שכיסוי אכ"ע מוסדר בנפרד והחיסכון מנוהל בקרנות פנסיה — ניתן לשקול ביטול הפוליסה, ' +
          'שכן מעל תקרת ההפקדה לקרן הפנסיה אין חובת הפקדה לאכ"ע. '
      return eff
    }

    let clause = ''
    let severity: 'info' | 'attention' = 'info'

    if (gen === 'before-2001-06') {
      // Valuable guaranteed factor — ideally the salary concentrates here. A split
      // with a pension fund is expected only when the family needs survivors cover.
      if (hasActivePension) {
        if (noDependentsKnown) {
          clause =
            'בתיק קיימת גם קרן פנסיה פעילה (חלוקת הפקדות), ולא צוינו בן/בת זוג או ילדים — ' +
            'בפוליסה מדור זה גלום מקדם מובטח, ובהיעדר תלויים לא ברור הצורך בחלוקה. '
          severity = 'attention'
        } else if (hasDependents) {
          clause =
            'בתיק קיימת גם קרן פנסיה פעילה; ייתכן שהחלוקה נובעת מהצורך בכיסוי שאירים דרך הפנסיה ' +
            'עבור בן/בת הזוג או הילדים. '
        } else {
          clause = 'בתיק קיימת גם קרן פנסיה פעילה; הרלוונטיות של חלוקת ההפקדות תלויה במצב המשפחתי. '
        }
      }
      // Old policies: savings allocation (100% vs 90%) and the riders dressed in
      if (p.savingsAllocationPercent !== null) {
        clause +=
          `הקצאה לחיסכון: ${p.savingsAllocationPercent.toFixed(0)}%` +
          (p.savingsAllocationPercent >= 100
            ? ' (חיסכון מלא). '
            : ' (חלק מההפקדה מיועד לרכיבי ביטוח). ')
      }
      const riderTypes = [...new Set(p.coverages.map((c) => c.type))]
      if (riderTypes.length > 0) {
        clause += `תוספות ביטוחיות בפוליסה: ${riderTypes.map((t) => coverageTypeLabels[t]).join(', ')}. `
      }
    } else if (gen === '2001-06-to-2004') {
      clause = 'בדור זה נהוג לבחון האם עדיף להפנות את ההפקדות למוצר אחר. '
      severity = 'attention'
      clause += depositEfficiencyClause()
    } else if (gen === '2004-to-2013') {
      // Whether it's worth touching depends mainly on the fee level: a high
      // accumulation fee makes ongoing deposits expensive relative to a pension fund.
      const eff = depositEfficiencyClause()
      if (eff) {
        clause = eff
        severity = aboveMekifaCap ? 'info' : 'attention'
        if (aboveMekifaCap) clause += 'מאחר שהשכר מעל תקרת המקיפה, חומרת הנקודה פחותה. '
      }
      // fee at/below the threshold → left alone (no extra clause)
    }

    return makeFinding({
      category: 'insight',
      level: 'policy',
      severity,
      title: 'דור ביטוח המנהלים ומקדם הקצבה',
      description:
        `פוליסה ${p.policyNumber} — דור ${generationLabels[gen] ?? gen}. ` +
        generationTrait(gen) +
        factorNote +
        clause +
        'נקודה לבדיקה מול בעל רישיון.',
      productType: 'managers',
      policyNumber: p.policyNumber,
    })
  })
}

/**
 * Kept for compatibility: stop-issue blocking was removed — all generations of
 * managers insurance are examined — so nothing is blocked.
 */
export function isBlockedByStopIssue(_p: {
  productType: string
  managersGeneration: string | null
}): boolean {
  return false
}

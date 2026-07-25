// Managers Generation Engine (formerly "stop issue").
// Every generation of managers insurance is now examined — nothing is blocked.
// Emits one neutral per-policy observation: which generation the policy belongs
// to and whether a guaranteed annuity factor (מקדם קצבה מובטח) was reported.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'

const generationLabels: Record<string, string> = {
  'before-2001-06': 'לפני יוני 2001',
  '2001-06-to-2004': 'יוני 2001 עד 2004',
  '2004-to-2013': '2004 עד 2013',
  '2013-plus': '2013 ואילך',
}

// A neutral, generation-specific characterization (no verdict).
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

export const stopIssueEngine: Engine = ({ policies }) =>
  policies
    .filter((p) => p.productType === 'managers' && p.managersGeneration)
    .map((p) => {
      const gen = p.managersGeneration!
      const factorNote = p.hasGuaranteedFactor
        ? 'זוהה מקדם קצבה מובטח בדיווח — יתרון משמעותי ששוויו בפועל תלוי בגיל, בוותק ובתמונה הכוללת. '
        : 'לא זוהה מקדם קצבה מובטח בדיווח. '
      return makeFinding({
        category: 'insight',
        level: 'policy',
        severity: 'info',
        title: 'דור ביטוח המנהלים ומקדם הקצבה',
        description:
          `פוליסה ${p.policyNumber} — דור ${generationLabels[gen] ?? gen}. ` +
          generationTrait(gen) +
          factorNote +
          'נקודה לבדיקה מול בעל רישיון.',
        productType: 'managers',
        policyNumber: p.policyNumber,
      })
    })

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

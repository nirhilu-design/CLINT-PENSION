// Stop Issue Engine: historical unsupported products.
// Managers insurance opened before June 2001 → analysis is blocked, limitation shown.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'

export const stopIssueEngine: Engine = ({ policies }) =>
  policies
    .filter((p) => p.productType === 'managers' && p.managersGeneration === 'before-2001-06')
    .map((p) =>
      makeFinding({
        category: 'limitation',
        level: 'policy',
        severity: 'attention',
        title: 'מוצר היסטורי — הניתוח מוגבל',
        description:
          `פוליסת ביטוח המנהלים ${p.policyNumber} נפתחה לפני יוני 2001. ` +
          'מדובר במוצר מדור היסטורי עם תנאים מובטחים, ולכן המערכת אינה מנתחת אותו אוטומטית. ' +
          'מומלץ לבחון את הפוליסה באופן פרטני מול בעל רישיון.',
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )

/** Policies whose analysis is blocked by stop-issue (other engines skip them). */
export function isBlockedByStopIssue(p: { productType: string; managersGeneration: string | null }): boolean {
  return p.productType === 'managers' && p.managersGeneration === 'before-2001-06'
}

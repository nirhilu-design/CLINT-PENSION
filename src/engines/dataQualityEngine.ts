// Data Quality Engine: missing critical fields create limitations.
// Optional fields never fail the analysis.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'

export const dataQualityEngine: Engine = ({ policies }) => {
  const findings = []

  for (const p of policies) {
    const missingCritical: string[] = []
    if (!p.policyNumber) missingCritical.push('מספר פוליסה')
    if (p.productType === 'unknown') missingCritical.push('סוג מוצר')
    if (p.currentValue === null && p.productType !== 'life' && p.productType !== 'incomeProtection') {
      missingCritical.push('יתרה צבורה')
    }

    if (missingCritical.length > 0) {
      findings.push(
        makeFinding({
          category: 'limitation',
          level: 'policy',
          severity: 'attention',
          title: 'נתונים קריטיים חסרים',
          description:
            `בפוליסה ${p.policyNumber || '(ללא מספר)'} מהקובץ "${p.sourceFileName}" חסרים: ${missingCritical.join(', ')}. ` +
            'הניתוח עבור מוצר זה חלקי בלבד.',
          productType: p.productType,
          policyNumber: p.policyNumber || undefined,
        }),
      )
    }

    const missingImportant: string[] = []
    if (p.fees.fromDeposit === null && p.fees.fromAccumulation === null) missingImportant.push('דמי ניהול')
    if (p.netReturn === null) missingImportant.push('תשואה')
    if (!p.openDate) missingImportant.push('תאריך הצטרפות')

    if (missingImportant.length > 0 && missingCritical.length === 0) {
      findings.push(
        makeFinding({
          category: 'dataQuality',
          level: 'policy',
          severity: 'info',
          title: 'נתונים חלקיים בדיווח',
          description: `בפוליסה ${p.policyNumber} לא דווחו: ${missingImportant.join(', ')}. חלק מהבדיקות לא בוצעו.`,
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }
  }

  return findings
}

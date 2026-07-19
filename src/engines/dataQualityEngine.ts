// Data Quality Engine: missing critical fields create limitations.
// Optional fields never fail the analysis.

import type { Engine } from './engineTypes'
import { makeFinding, salaryFromPolicies } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { formatCurrency } from '../utils/format'
import { SALARY_CROSSCHECK_DIFF_RATIO } from '../config/thresholds'

export const dataQualityEngine: Engine = ({ policies, supplementary }) => {
  const findings = []

  // Cross-check: client-stated salary vs the insured salary in the clearinghouse
  const statedSalary = supplementary.currentGrossSalary
  const xmlSalary = salaryFromPolicies(policies)
  if (statedSalary && xmlSalary && xmlSalary > 0) {
    const diffRatio = Math.abs(statedSalary - xmlSalary) / xmlSalary
    if (diffRatio > SALARY_CROSSCHECK_DIFF_RATIO) {
      const direction = statedSalary > xmlSalary ? 'גבוה' : 'נמוך'
      findings.push(
        makeFinding({
          category: 'dataQuality',
          level: 'client',
          severity: 'attention',
          title: 'נמצא שוני בין השכר שצוין לשכר המבוטח במסלקה',
          description:
            `השכר שציינת (${formatCurrency(statedSalary)}) ${direction} ב-${Math.round(diffRatio * 100)}% ` +
            `מהשכר המבוטח המדווח בקבצי המסלקה (${formatCurrency(xmlSalary)}). ` +
            (statedSalary > xmlSalary
              ? 'ייתכן שההפרשות אינן מעודכנות לשכר הנוכחי — כדאי לבדוק מול המעסיק.'
              : 'ייתכן שחל שינוי בשכר או שהדיווח בקבצים אינו עדכני — כדאי לוודא את הנתונים.'),
        }),
      )
    }
  }

  for (const p of policies) {
    // Stop-issue policies are excluded from analysis — no data-quality findings
    if (isBlockedByStopIssue(p)) continue
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

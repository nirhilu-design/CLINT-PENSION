// Cross-checks Engine (#9): contribution-rate correctness and, for the
// self-employed, tax-cap review. Soft observations only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { isBlockedByStopIssue } from './stopIssueEngine'
import { MIN_EMPLOYEE_RATE, MIN_EMPLOYER_RATE } from '../config/thresholds'

export const crossChecksEngine: Engine = ({ policies, supplementary }) => {
  const findings = []
  const selfEmployed =
    supplementary.employmentStatus === 'selfEmployed' || supplementary.employmentStatus === 'both'

  for (const p of policies) {
    if (isBlockedByStopIssue(p) || p.status !== 'active') continue
    if (p.productType !== 'pension' && p.productType !== 'managers') continue
    if (p.contributions.length === 0) continue

    const employee = p.contributions.find((c) => c.role === 'employee')?.percent ?? null
    const employer = p.contributions.find((c) => c.role === 'employer')?.percent ?? null

    // Deposit-rate correctness vs the statutory minimums (salaried structure)
    const low: string[] = []
    if (!selfEmployed && employee !== null && employee < MIN_EMPLOYEE_RATE) {
      low.push(`הפרשת עובד ${employee.toFixed(2)}% (מינימום ${MIN_EMPLOYEE_RATE}%)`)
    }
    if (!selfEmployed && employer !== null && employer < MIN_EMPLOYER_RATE) {
      low.push(`הפרשת מעביד ${employer.toFixed(2)}% (מינימום ${MIN_EMPLOYER_RATE}%)`)
    }
    if (low.length > 0) {
      findings.push(
        makeFinding({
          category: 'deposits',
          level: 'policy',
          severity: 'attention',
          title: 'אחוזי הפרשה נמוכים מהמינימום המקובל',
          description:
            `בפוליסה ${p.policyNumber}: ${low.join('; ')}. ` +
            'שיעורים נמוכים מהמינימום שבצו ההרחבה עשויים להעיד על הפקדה חלקית — כדאי לבדוק מול המעסיק.',
          basedOn: 'אחוזי ההפרשה שדווחו בקבצי המסלקה מול המינימום שבצו ההרחבה',
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }

    // Self-employed: the employee/employer split doesn't apply; verify tax-cap use
    if (selfEmployed) {
      findings.push(
        makeFinding({
          category: 'deposits',
          level: 'policy',
          severity: 'info',
          title: 'עצמאי — בדיקת ניצול תקרת הטבת מס',
          description:
            `בפוליסה ${p.policyNumber}: כעצמאי/ת, ההפקדה מזכה בהטבת מס עד תקרה שנתית התלויה בהכנסה. ` +
            'כדאי לבדוק שההפקדות מנצלות את התקרה ואינן חורגות ממנה — התאמה זו אינה נגזרת אוטומטית מקבצי המסלקה.',
          missingInfo: 'ההכנסה החייבת השנתית וסך ההפקדות בפועל לחישוב ניצול התקרה',
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }
  }

  return findings
}

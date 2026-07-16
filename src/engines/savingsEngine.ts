// Savings Engine: liquidity and contribution-basis information for
// education funds and gemel-lehashkaa. Information findings only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import {
  EDUCATION_FUND_MONTHLY_SALARY_CAP,
  educationFundLiquidDate,
  isEducationFundLiquid,
} from '../utils/liquidity'
import { formatCurrency, formatDate } from '../utils/format'

export const savingsEngine: Engine = ({ policies }) => {
  const findings = []

  // Education funds: liquidity status
  for (const p of policies.filter((p) => p.productType === 'education' && (p.currentValue ?? 0) > 0)) {
    const liquid = isEducationFundLiquid(p)
    if (liquid === null) continue
    if (liquid) {
      findings.push(
        makeFinding({
          category: 'information',
          level: 'policy',
          severity: 'info',
          title: 'קרן ההשתלמות נזילה',
          description:
            `בקרן ${p.policyNumber} חלפו 6 שנים מההצטרפות — הצבירה (${formatCurrency(p.currentValue)}) נזילה וזמינה למשיכה פטורה ממס. ` +
            'המשך חיסכון שומר על הפטור גם להפקדות החדשות.',
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    } else {
      findings.push(
        makeFinding({
          category: 'information',
          level: 'policy',
          severity: 'info',
          title: 'קרן ההשתלמות טרם נזילה',
          description: `קרן ${p.policyNumber} תהפוך נזילה בתאריך ${formatDate(educationFundLiquidDate(p))}.`,
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }

    // Contribution basis: full salary vs tax cap + the contributed percents
    if (p.coveredSalary !== null && p.status === 'active') {
      const overCap = p.coveredSalary > EDUCATION_FUND_MONTHLY_SALARY_CAP
      const percents = p.contributions
        .filter((c) => c.percent !== null)
        .map((c) => {
          const roleLabel = c.role === 'employee' ? 'עובד' : c.role === 'employer' ? 'מעסיק' : c.role
          return `${roleLabel} ${c.percent!.toFixed(2)}%`
        })
        .join(', ')
      findings.push(
        makeFinding({
          category: 'information',
          level: 'policy',
          severity: 'info',
          title: overCap ? 'הפקדה על שכר מלא (מעל תקרת המס)' : 'הפקדה בתוך תקרת המס',
          description:
            `בקרן ${p.policyNumber} ההפקדות מבוצעות על שכר של ${formatCurrency(p.coveredSalary)} — ` +
            (overCap
              ? `מעל תקרת השכר המוטבת (${formatCurrency(EDUCATION_FUND_MONTHLY_SALARY_CAP)}); על החלק שמעל התקרה אין הטבת מס. `
              : `בתוך תקרת השכר המוטבת (${formatCurrency(EDUCATION_FUND_MONTHLY_SALARY_CAP)}). `) +
            (percents ? `שיעורי ההפרשה: ${percents}.` : ''),
          productType: p.productType,
          policyNumber: p.policyNumber,
        }),
      )
    }
  }

  // Gemel lehashkaa: always liquid
  for (const p of policies.filter((p) => p.productType === 'gemelInvestment' && (p.currentValue ?? 0) > 0)) {
    findings.push(
      makeFinding({
        category: 'information',
        level: 'policy',
        severity: 'info',
        title: 'גמל להשקעה — נזיל בכל עת',
        description:
          `הצבירה בחשבון ${p.policyNumber} (${formatCurrency(p.currentValue)}) נזילה בכל עת (בכפוף למס רווחי הון במשיכה). ` +
          'משיכה כקצבה מגיל 60 פטורה ממס.',
        productType: p.productType,
        policyNumber: p.policyNumber,
      }),
    )
  }

  return findings
}

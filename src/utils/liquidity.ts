import type { Policy } from '../models/types'

// Education fund becomes liquid 6 years after joining (3 on retirement age — not modeled in MVP).
export function isEducationFundLiquid(policy: Policy, now = new Date()): boolean | null {
  if (!policy.openDate) return null
  const open = new Date(policy.openDate)
  const liquidFrom = new Date(open)
  liquidFrom.setFullYear(open.getFullYear() + 6)
  return now >= liquidFrom
}

/** Date on which an education fund becomes liquid, ISO string */
export function educationFundLiquidDate(policy: Policy): string | null {
  if (!policy.openDate) return null
  const open = new Date(policy.openDate)
  open.setFullYear(open.getFullYear() + 6)
  return open.toISOString().slice(0, 10)
}

// Monthly salary cap for education-fund tax benefit (תקרת שכר מוטבת), 2024-2025
export const EDUCATION_FUND_MONTHLY_SALARY_CAP = 15712

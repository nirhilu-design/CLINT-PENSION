import type { Policy } from '../models/types'
import { EDUCATION_FUND_LIQUIDITY_YEARS } from '../config/thresholds'

// Education fund becomes liquid 6 years after joining (3 on retirement age — not modeled in MVP).
export function isEducationFundLiquid(policy: Policy, now = new Date()): boolean | null {
  if (!policy.openDate) return null
  const open = new Date(policy.openDate)
  const liquidFrom = new Date(open)
  liquidFrom.setFullYear(open.getFullYear() + EDUCATION_FUND_LIQUIDITY_YEARS)
  return now >= liquidFrom
}

/** Date on which an education fund becomes liquid, ISO string */
export function educationFundLiquidDate(policy: Policy): string | null {
  if (!policy.openDate) return null
  const open = new Date(policy.openDate)
  open.setFullYear(open.getFullYear() + EDUCATION_FUND_LIQUIDITY_YEARS)
  return open.toISOString().slice(0, 10)
}

export { EDUCATION_FUND_MONTHLY_SALARY_CAP } from '../config/thresholds'

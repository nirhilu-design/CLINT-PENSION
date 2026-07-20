// Central configuration of every business threshold in the analysis.
// One file to review and tune — engines import from here only.

import type { ProductType } from '../models/types'

// --- Fees: market "worth checking" thresholds per product (percent) ---
export interface FeeThreshold {
  fromDeposit: number | null
  fromAccumulation: number | null
}

export const MARKET_FEE_THRESHOLDS: Partial<Record<ProductType, FeeThreshold>> = {
  pension: { fromDeposit: 3.0, fromAccumulation: 0.25 },
  gemel: { fromDeposit: null, fromAccumulation: 0.7 },
  gemelInvestment: { fromDeposit: null, fromAccumulation: 0.7 },
  education: { fromDeposit: null, fromAccumulation: 0.7 },
  managers: { fromDeposit: 4.0, fromAccumulation: 1.2 },
}

// Tolerance above a fee agreement / fund average before raising a finding (pp)
export const FEE_ABOVE_FUND_AVG_TOLERANCE = 0.1

// --- Income protection ---
export const IP_TARGET_COVERAGE_PERCENT = 73
export const IP_COVERAGE_PERCENT_SLACK = 3 // below target-slack → finding
export const IP_COVERED_SALARY_RATIO = 0.9 // covered salary < 90% of actual → gap

// --- Retirement ---
export const PENSION_TO_SALARY_MIN_RATIO = 0.7 // expected pension below 70% of salary → attention
export const MAX_PENSION_DISABILITY_PERCENT = 75

// --- Investment ---
export const RETURN_BELOW_BENCHMARK_TOLERANCE = 0.5 // pp below benchmark before finding

// --- Education fund ---
export const EDUCATION_FUND_LIQUIDITY_YEARS = 6
export const EDUCATION_FUND_MONTHLY_SALARY_CAP = 15712 // תקרת שכר מוטבת (2024-2025)

// --- Managers / pension layers ---
// Salary equivalent of the comprehensive pension fund deposit cap:
// twice the national average wage (2025 ≈ ₪13,316 → cap salary ≈ ₪26,632)
export const MEKIFA_SALARY_CAP = 26632

// --- Deposits & continuity ---
// Months allowed between the last received deposit and the file's as-of date
export const DEPOSIT_RECENCY_MONTHS = 3
// Salary-months window examined for continuity gaps
export const DEPOSIT_CONTINUITY_WINDOW_MONTHS = 12

// --- Data quality ---
export const SALARY_CROSSCHECK_DIFF_RATIO = 0.15 // stated vs insured salary

// --- Issuer exposure & quality (#8) ---
// Portfolio share with one managing company above which concentration is flagged
export const ISSUER_CONCENTRATION_SHARE = 0.6
// Minimum portfolio value before concentration is worth flagging
export const ISSUER_CONCENTRATION_MIN_VALUE = 100_000
// Sharpe gap below the market's strong funds that is worth highlighting
export const SHARPE_BELOW_LEADERS_GAP = 0.15
// How many market leaders (by Sharpe) to show in the comparison
export const MARKET_LEADERS_COUNT = 3

// --- Death picture ---
export const LARGE_ASSETS_THRESHOLD = 1_000_000
export const LARGE_LIFE_COVER_THRESHOLD = 500_000

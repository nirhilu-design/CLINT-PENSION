// Central configuration of every business threshold in the analysis.
// Engines import these bindings and read them at call time (ES live bindings),
// so applyThresholds() below can override any value at runtime — this is what
// the Logic Editor screen uses to let an advisor tune the logic without code.

import type { ProductType } from '../models/types'

// --- Fees: market "worth checking" thresholds per product (percent) ---
export interface FeeThreshold {
  fromDeposit: number | null
  fromAccumulation: number | null
}

// A flat, serializable snapshot of every threshold — the shape the editor edits.
export interface ThresholdValues {
  marketFees: Partial<Record<ProductType, FeeThreshold>>
  feeAboveFundAvgTolerance: number
  ipTargetCoveragePercent: number
  ipCoveragePercentSlack: number
  ipCoveredSalaryRatio: number
  pensionToSalaryMinRatio: number
  maxPensionDisabilityPercent: number
  pensionDisabilityLowPercent: number
  returnBelowBenchmarkTolerance: number
  educationFundLiquidityYears: number
  educationFundMonthlySalaryCap: number
  // Equity-mix by age (savings family: gemel, gemel-investment, education)
  equityYoungMaxAge: number // below this age → "young" equity target
  equityMidMaxAge: number // below this age → "mid" target; at/above → "senior"
  equityTargetYoung: number // reference equity share for the young band (%)
  equityTargetMid: number // reference equity share for the mid band (%)
  equityTargetSenior: number // reference equity share for the senior band (%)
  equityMixSlack: number // how far below target before a finding opens (pp)
  mekifaSalaryCap: number
  managersDepositFeeThreshold: number
  managersLargeAccumulation: number
  managersAccumulationFeeThreshold: number
  depositRecencyMonths: number
  depositContinuityWindowMonths: number
  salaryCrosscheckDiffRatio: number
  largeAssetsThreshold: number
  largeLifeCoverThreshold: number
  // Survivor pension income-replacement targets (% of salary), by family makeup
  survivorTargetSpouse: number // spouse only
  survivorTargetWithChildren: number // spouse + children under 21
  survivorTargetChildren: number // children only
  survivorReplacementSlack: number // pp below target before a finding
}

export const DEFAULT_THRESHOLDS: ThresholdValues = {
  // Fees: market "worth checking" thresholds per product (percent)
  marketFees: {
    pension: { fromDeposit: 3.0, fromAccumulation: 0.25 },
    gemel: { fromDeposit: null, fromAccumulation: 0.8 },
    gemelInvestment: { fromDeposit: null, fromAccumulation: 0.8 },
    education: { fromDeposit: null, fromAccumulation: 0.8 },
    managers: { fromDeposit: 4.0, fromAccumulation: 1.2 },
  },
  feeAboveFundAvgTolerance: 0.1, // tolerance above agreement / fund average (pp)
  ipTargetCoveragePercent: 73, // income protection target coverage (%)
  ipCoveragePercentSlack: 3, // below target-slack → finding
  ipCoveredSalaryRatio: 0.9, // covered salary < 90% of actual → gap
  pensionToSalaryMinRatio: 0.7, // expected pension below 70% of salary → attention
  maxPensionDisabilityPercent: 75,
  pensionDisabilityLowPercent: 37.5, // pension disability below this → check אכ"ע in other products

  returnBelowBenchmarkTolerance: 0.5, // pp below benchmark before finding
  educationFundLiquidityYears: 6,
  educationFundMonthlySalaryCap: 15712, // תקרת שכר מוטבת (2024-2025)
  equityYoungMaxAge: 50,
  equityMidMaxAge: 60,
  equityTargetYoung: 70, // reference equity share, under 50
  equityTargetMid: 50, // reference equity share, 50–60
  equityTargetSenior: 30, // reference equity share, 60+
  equityMixSlack: 5, // pp below the reference before a finding opens
  mekifaSalaryCap: 27538, // twice the national average wage (2 × 13,769, 2026)
  managersDepositFeeThreshold: 0.8, // active managers: accumulation fee above → ongoing deposits are expensive
  managersLargeAccumulation: 500_000, // above this balance, even a small accumulation fee is material
  managersAccumulationFeeThreshold: 0.2, // accumulation fee above this, on a large balance → note it
  depositRecencyMonths: 3, // months allowed since last deposit vs file date
  depositContinuityWindowMonths: 6, // salary-months window for continuity gaps
  salaryCrosscheckDiffRatio: 0.15, // stated vs insured salary
  largeAssetsThreshold: 1_000_000,
  largeLifeCoverThreshold: 500_000,
  // Comprehensive pension survivor pension: spouse 60%, +orphans up to ~100% of
  // the determining salary; orphans-only 40% (per the fund bylaws).
  survivorTargetSpouse: 60,
  survivorTargetWithChildren: 100,
  survivorTargetChildren: 40,
  survivorReplacementSlack: 5,
}

// Deep clone so overrides never mutate the defaults.
export function cloneThresholds(t: ThresholdValues): ThresholdValues {
  return {
    ...t,
    marketFees: Object.fromEntries(
      Object.entries(t.marketFees).map(([k, v]) => [k, { ...v! }]),
    ) as ThresholdValues['marketFees'],
  }
}

// --- Live bindings the engines read (see applyThresholds) ---
export let MARKET_FEE_THRESHOLDS = DEFAULT_THRESHOLDS.marketFees
export let FEE_ABOVE_FUND_AVG_TOLERANCE = DEFAULT_THRESHOLDS.feeAboveFundAvgTolerance
export let IP_TARGET_COVERAGE_PERCENT = DEFAULT_THRESHOLDS.ipTargetCoveragePercent
export let IP_COVERAGE_PERCENT_SLACK = DEFAULT_THRESHOLDS.ipCoveragePercentSlack
export let IP_COVERED_SALARY_RATIO = DEFAULT_THRESHOLDS.ipCoveredSalaryRatio
export let PENSION_TO_SALARY_MIN_RATIO = DEFAULT_THRESHOLDS.pensionToSalaryMinRatio
export let MAX_PENSION_DISABILITY_PERCENT = DEFAULT_THRESHOLDS.maxPensionDisabilityPercent
export let PENSION_DISABILITY_LOW_PERCENT = DEFAULT_THRESHOLDS.pensionDisabilityLowPercent
export let RETURN_BELOW_BENCHMARK_TOLERANCE = DEFAULT_THRESHOLDS.returnBelowBenchmarkTolerance
export let EDUCATION_FUND_LIQUIDITY_YEARS = DEFAULT_THRESHOLDS.educationFundLiquidityYears
export let EDUCATION_FUND_MONTHLY_SALARY_CAP = DEFAULT_THRESHOLDS.educationFundMonthlySalaryCap
export let EQUITY_YOUNG_MAX_AGE = DEFAULT_THRESHOLDS.equityYoungMaxAge
export let EQUITY_MID_MAX_AGE = DEFAULT_THRESHOLDS.equityMidMaxAge
export let EQUITY_TARGET_YOUNG = DEFAULT_THRESHOLDS.equityTargetYoung
export let EQUITY_TARGET_MID = DEFAULT_THRESHOLDS.equityTargetMid
export let EQUITY_TARGET_SENIOR = DEFAULT_THRESHOLDS.equityTargetSenior
export let EQUITY_MIX_SLACK = DEFAULT_THRESHOLDS.equityMixSlack
export let MEKIFA_SALARY_CAP = DEFAULT_THRESHOLDS.mekifaSalaryCap
export let MANAGERS_DEPOSIT_FEE_THRESHOLD = DEFAULT_THRESHOLDS.managersDepositFeeThreshold
export let MANAGERS_LARGE_ACCUMULATION = DEFAULT_THRESHOLDS.managersLargeAccumulation
export let MANAGERS_ACCUMULATION_FEE_THRESHOLD = DEFAULT_THRESHOLDS.managersAccumulationFeeThreshold
export let DEPOSIT_RECENCY_MONTHS = DEFAULT_THRESHOLDS.depositRecencyMonths
export let DEPOSIT_CONTINUITY_WINDOW_MONTHS = DEFAULT_THRESHOLDS.depositContinuityWindowMonths
export let SALARY_CROSSCHECK_DIFF_RATIO = DEFAULT_THRESHOLDS.salaryCrosscheckDiffRatio
export let LARGE_ASSETS_THRESHOLD = DEFAULT_THRESHOLDS.largeAssetsThreshold
export let LARGE_LIFE_COVER_THRESHOLD = DEFAULT_THRESHOLDS.largeLifeCoverThreshold
export let SURVIVOR_TARGET_SPOUSE = DEFAULT_THRESHOLDS.survivorTargetSpouse
export let SURVIVOR_TARGET_WITH_CHILDREN = DEFAULT_THRESHOLDS.survivorTargetWithChildren
export let SURVIVOR_TARGET_CHILDREN = DEFAULT_THRESHOLDS.survivorTargetChildren
export let SURVIVOR_REPLACEMENT_SLACK = DEFAULT_THRESHOLDS.survivorReplacementSlack

/** Override the active thresholds (called by buildAnalysis before running engines). */
export function applyThresholds(t: ThresholdValues): void {
  MARKET_FEE_THRESHOLDS = t.marketFees
  FEE_ABOVE_FUND_AVG_TOLERANCE = t.feeAboveFundAvgTolerance
  IP_TARGET_COVERAGE_PERCENT = t.ipTargetCoveragePercent
  IP_COVERAGE_PERCENT_SLACK = t.ipCoveragePercentSlack
  IP_COVERED_SALARY_RATIO = t.ipCoveredSalaryRatio
  PENSION_TO_SALARY_MIN_RATIO = t.pensionToSalaryMinRatio
  MAX_PENSION_DISABILITY_PERCENT = t.maxPensionDisabilityPercent
  PENSION_DISABILITY_LOW_PERCENT = t.pensionDisabilityLowPercent
  RETURN_BELOW_BENCHMARK_TOLERANCE = t.returnBelowBenchmarkTolerance
  EDUCATION_FUND_LIQUIDITY_YEARS = t.educationFundLiquidityYears
  EDUCATION_FUND_MONTHLY_SALARY_CAP = t.educationFundMonthlySalaryCap
  EQUITY_YOUNG_MAX_AGE = t.equityYoungMaxAge
  EQUITY_MID_MAX_AGE = t.equityMidMaxAge
  EQUITY_TARGET_YOUNG = t.equityTargetYoung
  EQUITY_TARGET_MID = t.equityTargetMid
  EQUITY_TARGET_SENIOR = t.equityTargetSenior
  EQUITY_MIX_SLACK = t.equityMixSlack
  MEKIFA_SALARY_CAP = t.mekifaSalaryCap
  MANAGERS_DEPOSIT_FEE_THRESHOLD = t.managersDepositFeeThreshold
  MANAGERS_LARGE_ACCUMULATION = t.managersLargeAccumulation
  MANAGERS_ACCUMULATION_FEE_THRESHOLD = t.managersAccumulationFeeThreshold
  DEPOSIT_RECENCY_MONTHS = t.depositRecencyMonths
  DEPOSIT_CONTINUITY_WINDOW_MONTHS = t.depositContinuityWindowMonths
  SALARY_CROSSCHECK_DIFF_RATIO = t.salaryCrosscheckDiffRatio
  LARGE_ASSETS_THRESHOLD = t.largeAssetsThreshold
  LARGE_LIFE_COVER_THRESHOLD = t.largeLifeCoverThreshold
  SURVIVOR_TARGET_SPOUSE = t.survivorTargetSpouse
  SURVIVOR_TARGET_WITH_CHILDREN = t.survivorTargetWithChildren
  SURVIVOR_TARGET_CHILDREN = t.survivorTargetChildren
  SURVIVOR_REPLACEMENT_SLACK = t.survivorReplacementSlack
}

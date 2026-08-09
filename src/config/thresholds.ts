// Central configuration of every business threshold in the analysis.
// Engines import these bindings and read them at call time (ES live bindings),
// so applyThresholds() below can override any value at runtime — this is what
// the Logic Editor screen uses to let an advisor tune the logic without code.

// A flat, serializable snapshot of every threshold — the shape the editor edits.
export interface ThresholdValues {
  ipTargetCoveragePercent: number
  ipCoveragePercentSlack: number
  ipCoveredSalaryRatio: number
  pensionToSalaryMinRatio: number
  maxPensionDisabilityPercent: number
  pensionDisabilityLowPercent: number
  returnBelowBenchmarkTolerance: number
  educationFundLiquidityYears: number
  educationFundMonthlySalaryCap: number
  mekifaSalaryCap: number
  managersNewFactorFeeThreshold: number
  depositRecencyMonths: number
  depositContinuityWindowMonths: number
  salaryCrosscheckDiffRatio: number
  largeAssetsThreshold: number
  largeLifeCoverThreshold: number
}

export const DEFAULT_THRESHOLDS: ThresholdValues = {
  ipTargetCoveragePercent: 73, // income protection target coverage (%)
  ipCoveragePercentSlack: 3, // below target-slack → finding
  ipCoveredSalaryRatio: 0.9, // covered salary < 90% of actual → gap
  pensionToSalaryMinRatio: 0.7, // expected pension below 70% of salary → attention
  maxPensionDisabilityPercent: 75,
  pensionDisabilityLowPercent: 37.5, // pension disability below this → check אכ"ע in other products

  returnBelowBenchmarkTolerance: 0.5, // pp below benchmark before finding
  educationFundLiquidityYears: 6,
  educationFundMonthlySalaryCap: 15712, // תקרת שכר מוטבת (2024-2025)
  mekifaSalaryCap: 26632, // twice the national average wage (2025)
  managersNewFactorFeeThreshold: 0.8, // 2004-2013 new-factor managers: fee at/below → leave alone
  depositRecencyMonths: 3, // months allowed since last deposit vs file date
  depositContinuityWindowMonths: 6, // salary-months window for continuity gaps
  salaryCrosscheckDiffRatio: 0.15, // stated vs insured salary
  largeAssetsThreshold: 1_000_000,
  largeLifeCoverThreshold: 500_000,
}

// Clone so overrides never mutate the defaults (all values are flat scalars).
export function cloneThresholds(t: ThresholdValues): ThresholdValues {
  return { ...t }
}

// --- Live bindings the engines read (see applyThresholds) ---
export let IP_TARGET_COVERAGE_PERCENT = DEFAULT_THRESHOLDS.ipTargetCoveragePercent
export let IP_COVERAGE_PERCENT_SLACK = DEFAULT_THRESHOLDS.ipCoveragePercentSlack
export let IP_COVERED_SALARY_RATIO = DEFAULT_THRESHOLDS.ipCoveredSalaryRatio
export let PENSION_TO_SALARY_MIN_RATIO = DEFAULT_THRESHOLDS.pensionToSalaryMinRatio
export let MAX_PENSION_DISABILITY_PERCENT = DEFAULT_THRESHOLDS.maxPensionDisabilityPercent
export let PENSION_DISABILITY_LOW_PERCENT = DEFAULT_THRESHOLDS.pensionDisabilityLowPercent
export let RETURN_BELOW_BENCHMARK_TOLERANCE = DEFAULT_THRESHOLDS.returnBelowBenchmarkTolerance
export let EDUCATION_FUND_LIQUIDITY_YEARS = DEFAULT_THRESHOLDS.educationFundLiquidityYears
export let EDUCATION_FUND_MONTHLY_SALARY_CAP = DEFAULT_THRESHOLDS.educationFundMonthlySalaryCap
export let MEKIFA_SALARY_CAP = DEFAULT_THRESHOLDS.mekifaSalaryCap
export let MANAGERS_NEW_FACTOR_FEE_THRESHOLD = DEFAULT_THRESHOLDS.managersNewFactorFeeThreshold
export let DEPOSIT_RECENCY_MONTHS = DEFAULT_THRESHOLDS.depositRecencyMonths
export let DEPOSIT_CONTINUITY_WINDOW_MONTHS = DEFAULT_THRESHOLDS.depositContinuityWindowMonths
export let SALARY_CROSSCHECK_DIFF_RATIO = DEFAULT_THRESHOLDS.salaryCrosscheckDiffRatio
export let LARGE_ASSETS_THRESHOLD = DEFAULT_THRESHOLDS.largeAssetsThreshold
export let LARGE_LIFE_COVER_THRESHOLD = DEFAULT_THRESHOLDS.largeLifeCoverThreshold

/** Override the active thresholds (called by buildAnalysis before running engines). */
export function applyThresholds(t: ThresholdValues): void {
  IP_TARGET_COVERAGE_PERCENT = t.ipTargetCoveragePercent
  IP_COVERAGE_PERCENT_SLACK = t.ipCoveragePercentSlack
  IP_COVERED_SALARY_RATIO = t.ipCoveredSalaryRatio
  PENSION_TO_SALARY_MIN_RATIO = t.pensionToSalaryMinRatio
  MAX_PENSION_DISABILITY_PERCENT = t.maxPensionDisabilityPercent
  PENSION_DISABILITY_LOW_PERCENT = t.pensionDisabilityLowPercent
  RETURN_BELOW_BENCHMARK_TOLERANCE = t.returnBelowBenchmarkTolerance
  EDUCATION_FUND_LIQUIDITY_YEARS = t.educationFundLiquidityYears
  EDUCATION_FUND_MONTHLY_SALARY_CAP = t.educationFundMonthlySalaryCap
  MEKIFA_SALARY_CAP = t.mekifaSalaryCap
  MANAGERS_NEW_FACTOR_FEE_THRESHOLD = t.managersNewFactorFeeThreshold
  DEPOSIT_RECENCY_MONTHS = t.depositRecencyMonths
  DEPOSIT_CONTINUITY_WINDOW_MONTHS = t.depositContinuityWindowMonths
  SALARY_CROSSCHECK_DIFF_RATIO = t.salaryCrosscheckDiffRatio
  LARGE_ASSETS_THRESHOLD = t.largeAssetsThreshold
  LARGE_LIFE_COVER_THRESHOLD = t.largeLifeCoverThreshold
}

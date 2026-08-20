import type { Client, Finding, Policy, ProductType, SupplementaryInfo } from '../models/types'

export interface EngineInput {
  client: Client
  policies: Policy[]
  supplementary: SupplementaryInfo
}

export type Engine = (input: EngineInput) => Finding[]

// Pension-savings products that insure a portion of the salary. Income protection
// (אכע) is deliberately excluded — its insured salary is typically the full salary
// and would double-count — but it serves as a cross-check reference below.
const PENSION_SALARY_PRODUCTS: ProductType[] = ['pension', 'managers']

/**
 * Full monthly salary estimated from the XML by SUMMING the insured salary across
 * the active pension-savings products (pension + managers). A person's salary is
 * split between products, so summing the per-product insured salaries reconstructs
 * the full salary; taking the max would under-count a split. אכע is excluded.
 */
export function salaryFromPolicies(policies: Policy[]): number | null {
  const salaries = policies
    .filter((p) => p.status === 'active' && PENSION_SALARY_PRODUCTS.includes(p.productType))
    .map((p) => p.coveredSalary)
    .filter((s): s is number => s !== null && s > 0)
  return salaries.length ? salaries.reduce((sum, s) => sum + s, 0) : null
}

/**
 * Independent reference for the full salary, used to sanity-check the summed
 * pension salary. A קרן השתלמות deposit base reflects the full salary as long as it
 * is below the מוטבת cap (educationCap, ~15,712) — at the cap it is truncated and
 * uninformative. The אכע insured salary is a secondary reference when no usable
 * study-fund figure exists. Returns null when neither is available.
 */
export function fullSalaryReference(policies: Policy[], educationCap: number): number | null {
  const educationBases = policies
    .filter((p) => p.status === 'active' && p.productType === 'education')
    .map((p) => p.coveredSalary)
    .filter((s): s is number => s !== null && s > 0 && s < educationCap)
  if (educationBases.length) return Math.max(...educationBases)

  const akvBases = policies.flatMap((p) => [
    p.productType === 'incomeProtection' ? p.coveredSalary : null,
    ...p.coverages.filter((c) => c.type === 'disability').map((c) => c.coveredSalary),
  ])
  const usableAkv = akvBases.filter((s): s is number => s !== null && s > 0)
  return usableAkv.length ? Math.max(...usableAkv) : null
}

/** Client-stated gross salary wins over the XML-derived insured salary. */
export function effectiveSalary(
  policies: Policy[],
  supplementary: { currentGrossSalary: number | null },
): number | null {
  return supplementary.currentGrossSalary ?? salaryFromPolicies(policies)
}

let counter = 0
export function makeFinding(finding: Omit<Finding, 'id'>): Finding {
  counter += 1
  return { id: `f-${counter}-${finding.category}`, ...finding }
}

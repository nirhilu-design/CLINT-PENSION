import type { Client, Finding, Policy, SupplementaryInfo } from '../models/types'

export interface EngineInput {
  client: Client
  policies: Policy[]
  supplementary: SupplementaryInfo
}

export type Engine = (input: EngineInput) => Finding[]

/** Reported monthly salary derived from the XML itself (highest SACHAR-POLISA). */
export function salaryFromPolicies(policies: Policy[]): number | null {
  const salaries = policies
    .filter((p) => p.status === 'active')
    .map((p) => p.coveredSalary)
    .filter((s): s is number => s !== null && s > 0)
  return salaries.length ? Math.max(...salaries) : null
}

let counter = 0
export function makeFinding(finding: Omit<Finding, 'id'>): Finding {
  counter += 1
  return { id: `f-${counter}-${finding.category}`, ...finding }
}

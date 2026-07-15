import type { Client, Finding, Policy, SupplementaryInfo } from '../models/types'

export interface EngineInput {
  client: Client
  policies: Policy[]
  supplementary: SupplementaryInfo
}

export type Engine = (input: EngineInput) => Finding[]

let counter = 0
export function makeFinding(finding: Omit<Finding, 'id'>): Finding {
  counter += 1
  return { id: `f-${counter}-${finding.category}`, ...finding }
}

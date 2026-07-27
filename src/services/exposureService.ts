// Portfolio exposure analysis: how the client's assets are distributed across
// managing companies (investment-manager concentration) and — when treasury
// asset-allocation data is available — across equities, both for the gemel
// family and for the whole portfolio. Pure functions over the model.

import type { Policy, ProductType, TreasuryAllocation } from '../models/types'

// The "gemel family" of savings vehicles (excludes pension/insurance products).
export const GEMEL_FAMILY: ProductType[] = ['gemel', 'gemelInvestment']

export interface CompanyExposure {
  company: string
  value: number
  percent: number // of the scope's total
}

export interface EquityExposure {
  coveredValue: number // assets for which allocation data exists
  equityValue: number // equity portion within coveredValue
  equityPercent: number | null // equityValue / coveredValue, null when no coverage
}

export interface ExposureScope {
  total: number
  capitalTotal: number // sum of the הון (capital-status) balances
  byCompany: CompanyExposure[]
  equity: EquityExposure
}

export interface PortfolioExposure {
  portfolio: ExposureScope
  gemel: ExposureScope
  gemelTotal: number
  gemelShare: number // gemelTotal / portfolio.total
}

function valueOf(p: Policy): number {
  return p.currentValue ?? 0
}

function companyBreakdown(policies: Policy[], total: number): CompanyExposure[] {
  const byCompany = new Map<string, number>()
  for (const p of policies) {
    const company = p.managingCompany ?? 'לא מזוהה'
    byCompany.set(company, (byCompany.get(company) ?? 0) + valueOf(p))
  }
  return [...byCompany.entries()]
    .map(([company, value]) => ({ company, value, percent: total > 0 ? (value / total) * 100 : 0 }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value)
}

// Equity share weighted by each policy's value, using the "9-group" allocation
// (group named מניות). Only policies whose mofid has allocation data count.
function equityBreakdown(policies: Policy[], allocations: TreasuryAllocation[]): EquityExposure {
  const byMofid = new Map(allocations.map((a) => [a.mofid, a]))
  let coveredValue = 0
  let equityValue = 0
  for (const p of policies) {
    if (!p.mofid) continue
    const alloc = byMofid.get(p.mofid)
    if (!alloc) continue
    const equityGroup = alloc.groups.find((g) => g.name?.includes('מניות'))
    if (!equityGroup) continue
    const value = valueOf(p)
    coveredValue += value
    equityValue += value * (equityGroup.percent / 100)
  }
  return {
    coveredValue,
    equityValue,
    equityPercent: coveredValue > 0 ? (equityValue / coveredValue) * 100 : null,
  }
}

function scope(policies: Policy[], allocations: TreasuryAllocation[]): ExposureScope {
  const total = policies.reduce((s, p) => s + valueOf(p), 0)
  const capitalTotal = policies.reduce((s, p) => s + (p.capitalBalance ?? 0), 0)
  return {
    total,
    capitalTotal,
    byCompany: companyBreakdown(policies, total),
    equity: equityBreakdown(policies, allocations),
  }
}

export function computeExposure(
  policies: Policy[],
  allocations: TreasuryAllocation[],
): PortfolioExposure {
  const gemelPolicies = policies.filter((p) => GEMEL_FAMILY.includes(p.productType))
  const portfolio = scope(policies, allocations)
  const gemel = scope(gemelPolicies, allocations)
  return {
    portfolio,
    gemel,
    gemelTotal: gemel.total,
    gemelShare: portfolio.total > 0 ? (gemel.total / portfolio.total) * 100 : 0,
  }
}

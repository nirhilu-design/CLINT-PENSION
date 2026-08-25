// Death capital ("הון למקרה פטירה"): what beneficiaries receive as a lump on death.
// Composed of the accumulated savings that pass to beneficiaries — managers, gemel,
// gemel-investment, study funds and life-as-a-product — plus the death risk sum
// insured. Pension funds are deliberately excluded: their death benefit is a survivor
// annuity (קצבת שאירים), reported separately, not a capital sum.
//
// Double-count guard: in mixed savings+risk managers/life policies the death sum
// insured often already embeds the accumulation. IND-SCHUM-BITUAH-KOLEL-CHISACHON
// (deathSumIncludesSavings) decides how to combine them per policy:
//   false → additive (savings + risk)
//   true / unknown → higher-of (max), so the accumulation is not counted twice.

import type { Policy, ProductType } from '../models/types'

// Products whose accumulated balance passes to beneficiaries as capital on death.
export const DEATH_CAPITAL_PRODUCTS: ProductType[] = [
  'managers',
  'gemel',
  'gemelInvestment',
  'education',
  'life',
]

export interface DeathCapitalResult {
  total: number
  savings: number // accumulation passing to beneficiaries (net of double-count)
  risk: number // death risk sum insured (net of double-count)
}

function policyDeathRisk(p: Policy): number {
  if (p.deathSumInsured != null && p.deathSumInsured > 0) return p.deathSumInsured
  return p.coverages
    .filter((c) => c.type === 'death')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
}

export function computeDeathCapital(policies: Policy[]): DeathCapitalResult {
  let savings = 0
  let risk = 0
  for (const p of policies) {
    if (p.status === 'inactive') continue
    const sav = DEATH_CAPITAL_PRODUCTS.includes(p.productType) ? (p.currentValue ?? 0) : 0
    const rsk = policyDeathRisk(p)
    if (sav <= 0 && rsk <= 0) continue
    if (sav <= 0) {
      risk += rsk
    } else if (rsk <= 0) {
      savings += sav
    } else if (p.deathSumIncludesSavings === false) {
      // Sum insured is on top of the accumulation → both are paid.
      savings += sav
      risk += rsk
    } else {
      // Sum insured already embeds the accumulation (or unknown) → higher-of.
      if (rsk >= sav) risk += rsk
      else savings += sav
    }
  }
  return { total: savings + risk, savings, risk }
}

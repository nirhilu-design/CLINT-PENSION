// Death-benefit aggregation — the lump sum expected to pass to the beneficiaries
// (מוטבים) on death, across the products that pay one. Factual only ("מאיר ולא
// ממליץ"): it describes what would be paid, it does not advise.
//
// Per product type (sources: תקנון קרנות הפנסיה / חוק ורשות שוק ההון / כל זכות):
//  - ביטוח חיים (life): the death insured sum (risk).
//  - ביטוח מנהלים (managers): the death insured sum; when none is reported, the
//    accumulation that passes to the beneficiaries.
//  - קופת גמל / השתלמות / גמל להשקעה: pure savings — the full accumulation passes
//    to the beneficiaries.
//  - קרן פנסיה (pension): survivors normally receive a monthly קצבת שאירים (not a
//    lump sum), so it is EXCLUDED — UNLESS the fund reports no survivor/orphan
//    coverage, in which case the accumulation is paid to the beneficiaries as a
//    lump sum and is included, flagged with a note on that fund.

import type { Policy, ProductType } from '../models/types'

const SAVINGS_DEATH_TYPES: ProductType[] = ['gemel', 'gemelInvestment', 'education']

function activeDeathCoverSum(p: Policy): number {
  return p.coverages
    .filter((c) => c.type === 'death' && c.status !== 'inactive')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
}

/** A pension fund with no reported survivor/orphan coverage: on death the
 *  accumulation is paid to the beneficiaries as a lump sum rather than a pension. */
export function pensionLacksSurvivorCoverage(p: Policy): boolean {
  return (
    p.productType === 'pension' &&
    !p.coverages.some((c) => c.type === 'survivors' && c.status !== 'inactive')
  )
}

/** The lump sum this single policy would pay the beneficiaries on death (0 when none). */
export function policyDeathAmount(p: Policy): number {
  if (p.productType === 'life') return activeDeathCoverSum(p)
  if (p.productType === 'managers') {
    const cover = activeDeathCoverSum(p)
    return cover > 0 ? cover : (p.currentValue ?? 0)
  }
  if (SAVINGS_DEATH_TYPES.includes(p.productType)) return p.currentValue ?? 0
  if (pensionLacksSurvivorCoverage(p)) return p.currentValue ?? 0
  return 0
}

export interface DeathBenefit {
  total: number
  /** Number of policies contributing a positive amount. */
  contributingCount: number
  /** True when a pension fund with no survivor coverage was folded in. */
  includesPensionWithoutSurvivors: boolean
}

export function computeDeathBenefit(policies: Policy[]): DeathBenefit {
  let total = 0
  let contributingCount = 0
  let includesPensionWithoutSurvivors = false
  for (const p of policies) {
    const amount = policyDeathAmount(p)
    if (amount > 0) {
      total += amount
      contributingCount++
      if (pensionLacksSurvivorCoverage(p)) includesPensionWithoutSurvivors = true
    }
  }
  return { total, contributingCount, includesPensionWithoutSurvivors }
}

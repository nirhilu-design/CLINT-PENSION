// Parser for official treasury bulk files (גמל-נט / פנסיה-נט exports):
// - Returns file (kupot_58 style): <Row><ID>… with TSUA_* fields per fund
// - Asset allocation file (kupot_59 style): <Row><ID_KUPA>… with asset groups
// Files are large flat XML — scanned row-by-row with regex for speed,
// keeping only rows whose fund id (מ"ה / מספר אוצר) exists in the portfolio.

import type { TreasuryAllocation, TreasuryFundData } from '../models/types'

export type TreasuryFileType = 'returns' | 'allocation' | 'unknown'

export interface TreasuryParseResult {
  type: TreasuryFileType
  fileName: string
  funds: TreasuryFundData[]
  allocations: TreasuryAllocation[]
  matchedMofids: string[]
}

function tag(row: string, name: string): string | null {
  const m = row.match(new RegExp(`<${name}>([^<]*)</${name}>`))
  const v = m?.[1]?.trim()
  return v ? v : null
}

function numTag(row: string, name: string): number | null {
  const v = tag(row, name)
  if (v === null) return null
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : null
}

const MAIN_GROUPS_LABEL = '9 קבוצות'

export function parseTreasuryXml(
  text: string,
  fileName: string,
  portfolioMofids: Set<string>,
): TreasuryParseResult {
  const isReturns = text.includes('<TSUA_MITZTABERET_LETKUFA>') || text.includes('<SHARP_')
  const isAllocation = text.includes('<ID_KUPA>') && text.includes('<SHM_SUG_NECHES>')

  const result: TreasuryParseResult = {
    type: isReturns ? 'returns' : isAllocation ? 'allocation' : 'unknown',
    fileName,
    funds: [],
    allocations: [],
    matchedMofids: [],
  }
  if (result.type === 'unknown') return result

  const rows = text.match(/<Row>[\s\S]*?<\/Row>/g) ?? []
  const matched = new Set<string>()

  if (result.type === 'returns') {
    for (const row of rows) {
      const id = tag(row, 'ID')
      if (!id || !portfolioMofids.has(id)) continue
      matched.add(id)
      result.funds.push({
        mofid: id,
        name: tag(row, 'SHM_KUPA'),
        managingCompany: tag(row, 'SHM_HEVRA_MENAHELET'),
        avgFeeFromAccumulation: numTag(row, 'SHIUR_DMEI_NIHUL_AHARON'),
        avgFeeFromDeposit: numTag(row, 'SHIUR_D_NIHUL_AHARON_HAFKADOT'),
        return12m: numTag(row, 'TSUA_MITZTABERET_LETKUFA'),
        return3yAnnualized: numTag(row, 'TSUA_SHNATIT_MEMUZAAT_3_SHANIM'),
        return5yAnnualized: numTag(row, 'TSUA_SHNATIT_MEMUZAAT_5_SHANIM'),
        stdDev36m: numTag(row, 'STIAT_TEKEN_36_HODASHIM'),
        sharpe: numTag(row, 'SHARP_RIBIT_HASRAT_SIKUN'),
        liquidityRatio: numTag(row, 'YAHAS_NEZILUT'),
        periodTo: tag(row, 'AD_TKUFAT_DIVUACH'),
      })
    }
  } else {
    const byMofid = new Map<string, TreasuryAllocation>()
    for (const row of rows) {
      const id = tag(row, 'ID_KUPA')
      if (!id || !portfolioMofids.has(id)) continue
      // Keep only the main 9-group breakdown (other groupings exist in the file)
      const grouping = tag(row, 'KVUTZAT_NECHASIM')
      if (!grouping || !grouping.includes(MAIN_GROUPS_LABEL)) continue
      const name = tag(row, 'SHM_SUG_NECHES')
      const percent = numTag(row, 'ACHUZ_SUG_NECHES')
      if (!name || percent === null) continue
      matched.add(id)
      let alloc = byMofid.get(id)
      if (!alloc) {
        alloc = { mofid: id, period: tag(row, 'TKF_DIVUACH'), groups: [] }
        byMofid.set(id, alloc)
      }
      alloc.groups.push({ name, percent })
    }
    result.allocations = [...byMofid.values()].map((a) => ({
      ...a,
      groups: a.groups.sort((x, y) => y.percent - x.percent),
    }))
  }

  result.matchedMofids = [...matched]
  return result
}

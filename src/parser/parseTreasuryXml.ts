// Parser for official treasury bulk files (גמל-נט / פנסיה-נט exports):
// - Returns file: <Row>/<ROW> with <ID> and TSUA_* fields per fund/track
// - Allocation file: rows keyed by <ID_KUPA> (gemel) or <ID_KRN> /
//   <ID_MASLUL_RISHUY> (pension), with asset-group percentages
//
// Treasury data is keyed differently per file — a gemel fund by its fund
// number, a pension track by its maslul code. The caller supplies a
// codeToMofid map (every fund code AND maslul code in the portfolio →
// the canonical fund mofid), so a match on any of them is stored under the
// mofid the UI looks up by.

import type { MarketFund, TreasuryAllocation, TreasuryFundData } from '../models/types'

export type TreasuryFileType = 'returns' | 'allocation' | 'unknown'

export interface TreasuryParseResult {
  type: TreasuryFileType
  fileName: string
  funds: TreasuryFundData[]
  allocations: TreasuryAllocation[]
  marketFunds: MarketFund[] // every fund/company track in a returns file
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

// Main asset breakdown grouping — pension uses "10 קבוצות", gemel "9 קבוצות"
function isMainGrouping(label: string | null): boolean {
  return !!label && (label.includes('9 קבוצות') || label.includes('10 קבוצות'))
}

export function parseTreasuryXml(
  text: string,
  fileName: string,
  codeToMofid: Map<string, string>,
): TreasuryParseResult {
  const isAllocation =
    text.includes('<SHM_SUG_NECHES>') && (text.includes('<ID_KUPA>') || text.includes('<ID_KRN>'))
  const isReturns =
    !isAllocation && (text.includes('<TSUA_MITZTABERET_LETKUFA>') || text.includes('<SHARP_'))

  const result: TreasuryParseResult = {
    type: isReturns ? 'returns' : isAllocation ? 'allocation' : 'unknown',
    fileName,
    funds: [],
    allocations: [],
    marketFunds: [],
    matchedMofids: [],
  }
  if (result.type === 'unknown') return result

  // Rows may be <Row> or <ROW>
  const rows = text.match(/<(?:Row|ROW)>[\s\S]*?<\/(?:Row|ROW)>/g) ?? []
  const matched = new Set<string>()

  if (result.type === 'returns') {
    for (const row of rows) {
      // Collect every row as a market data point (for issuer/quality benchmarking)
      const sharpe = numTag(row, 'SHARP_RIBIT_HASRAT_SIKUN')
      if (sharpe !== null) {
        result.marketFunds.push({
          name: tag(row, 'SHM_KUPA') ?? tag(row, 'SHM_KRN') ?? tag(row, 'SHEM_GUF'),
          company: tag(row, 'SHM_HEVRA_MENAHELET') ?? tag(row, 'SHEM_HEVRA') ?? tag(row, 'SHEM_GUF'),
          sharpe,
          return5yAnnualized: numTag(row, 'TSUA_SHNATIT_MEMUZAAT_5_SHANIM'),
          stdDev36m: numTag(row, 'STIAT_TEKEN_36_HODASHIM'),
        })
      }

      const id = tag(row, 'ID')
      const mofid = id ? codeToMofid.get(id) : undefined
      if (!mofid) continue
      matched.add(mofid)
      result.funds.push({
        mofid,
        name: tag(row, 'SHM_KUPA') ?? tag(row, 'SHM_KRN'),
        managingCompany: tag(row, 'SHM_HEVRA_MENAHELET'),
        avgFeeFromAccumulation:
          numTag(row, 'SHIUR_DMEI_NIHUL_AHARON') ?? numTag(row, 'SHIUR_D_NIHUL_AHARON_NCHASIM'),
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
      // Prefer the specific investment track: when the row carries a maslul id
      // (פנסיה-נט), match only the client's exact track — a fund (ID_KRN) has
      // many tracks and matching by fund would merge them all. Gemel rows have
      // no maslul id, so fall back to the fund number (ID_KUPA/ID_KRN).
      const maslulId = tag(row, 'ID_MASLUL_RISHUY')
      let mofid: string | undefined
      if (maslulId) {
        mofid = codeToMofid.get(maslulId)
      } else {
        const fundId = tag(row, 'ID_KUPA') ?? tag(row, 'ID_KRN')
        mofid = fundId ? codeToMofid.get(fundId) : undefined
      }
      if (!mofid) continue
      if (!isMainGrouping(tag(row, 'KVUTZAT_NECHASIM'))) continue
      const name = tag(row, 'SHM_SUG_NECHES')
      const percent = numTag(row, 'ACHUZ_SUG_NECHES')
      if (!name || percent === null) continue
      matched.add(mofid)
      let alloc = byMofid.get(mofid)
      if (!alloc) {
        alloc = { mofid, period: tag(row, 'TKF_DIVUACH'), groups: [] }
        byMofid.set(mofid, alloc)
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

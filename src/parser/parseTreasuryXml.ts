// Parser for official treasury bulk files (גמל-נט / פנסיה-נט / ביטוח-נט exports):
// - Returns, funds file (kupot style): <Row><ID>… with SHM_KUPA / SHIUR_DMEI_NIHUL_AHARON
// - Returns, companies file (hevrot style): <ROW><ID_GUF>… with SHEM_GUF /
//   SHIUR_D_NIHUL_NECHASIM — same concepts, different tag names and uppercase rows
// - Asset allocation file (kupot_59 style): <Row><ID_KUPA>… with asset groups
// Files are large flat XML — scanned row-by-row with regex for speed,
// keeping only rows whose fund id (מ"ה / מספר אוצר) exists in the portfolio.

import type { TreasuryAllocation, TreasuryFundData } from '../models/types'
import { normalizeMofid } from './xmlUtils'

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

// First non-empty value among several candidate tag names.
function firstTag(row: string, names: string[]): string | null {
  for (const n of names) {
    const v = tag(row, n)
    if (v !== null) return v
  }
  return null
}

const MAIN_GROUPS_LABEL = '9 קבוצות'

export function parseTreasuryXml(
  text: string,
  fileName: string,
  portfolioMofids: Set<string>,
): TreasuryParseResult {
  // Companies (hevrot / ביטוח-נט) file: uppercase <ROW> rows keyed by ID_GUF.
  const isCompanies = text.includes('<ID_GUF>')
  const isReturns =
    text.includes('<TSUA_MITZTABERET_LETKUFA>') || text.includes('<SHARP_') || isCompanies
  const isAllocation = text.includes('<ID_KUPA>') && text.includes('<SHM_SUG_NECHES>')

  const result: TreasuryParseResult = {
    type: isReturns ? 'returns' : isAllocation ? 'allocation' : 'unknown',
    fileName,
    funds: [],
    allocations: [],
    matchedMofids: [],
  }
  if (result.type === 'unknown') return result

  // Row element is <Row> in the funds/allocation files, <ROW> in the companies file.
  const rows = text.match(/<(Row|ROW)>[\s\S]*?<\/(Row|ROW)>/g) ?? []
  const matched = new Set<string>()

  if (result.type === 'returns') {
    // Same concepts, different tag names between the two returns formats.
    const F = isCompanies
      ? {
          id: 'ID_GUF',
          names: ['SHEM_GUF'],
          company: null,
          feeAccum: 'SHIUR_D_NIHUL_NECHASIM',
          feeDeposit: 'SHIUR_D_NIHUL_HAFKADOT',
          ret: 'TSUA_MITZ_LE_TKUFA',
        }
      : {
          id: 'ID',
          // fund name: SHM_KUPA in gemel/השתלמות files, SHM_KRN in pension (פנסיה-נט)
          names: ['SHM_KUPA', 'SHM_KRN'],
          company: 'SHM_HEVRA_MENAHELET',
          feeAccum: 'SHIUR_DMEI_NIHUL_AHARON',
          feeDeposit: 'SHIUR_D_NIHUL_AHARON_HAFKADOT',
          ret: 'TSUA_MITZTABERET_LETKUFA',
        }
    for (const row of rows) {
      const id = normalizeMofid(tag(row, F.id))
      if (!id || !portfolioMofids.has(id) || matched.has(id)) continue
      matched.add(id)
      result.funds.push({
        mofid: id,
        name: firstTag(row, F.names),
        managingCompany: F.company ? tag(row, F.company) : null,
        avgFeeFromAccumulation: numTag(row, F.feeAccum),
        avgFeeFromDeposit: numTag(row, F.feeDeposit),
        return12m: numTag(row, F.ret),
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
      const id = normalizeMofid(tag(row, 'ID_KUPA'))
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

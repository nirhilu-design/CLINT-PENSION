import { categorizeTrack } from './auditEngine.js'
import { generateRowFindings } from '../engines/findings.js'
import { buildGlobalFindings, buildSummary } from '../engines/globalFindings.js'

export function buildPensionAnalytics(unifiedRows, agreements = [], clientProfile = {}) {
  const enriched = unifiedRows.map(row => {
    const { category, label } = categorizeTrack(row.investmentTrack)
    const findings = generateRowFindings(row, clientProfile)
    return { ...row, trackCategory: category, trackLabel: label, findings }
  })

  const productTypes = ['pension', 'bituach_menahalim', 'gemel', 'hishtalmut']
  const byType = {}
  for (const type of productTypes) {
    const typeRows = enriched.filter(r => r.productType === type)
    if (typeRows.length > 0) byType[type] = typeRows
  }

  const globalFindings = buildGlobalFindings(enriched, clientProfile)
  const summary = buildSummary(enriched)

  return { rows: enriched, byType, globalFindings, summary, totalRows: unifiedRows.length }
}

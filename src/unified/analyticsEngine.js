import {
  auditManagementFees,
  auditInsuranceTrack,
  mergeEmployeeInsuranceRows,
  auditInvestmentTrack,
  evaluateInsuranceEndAge,
  categorizeTrack,
} from './auditEngine.js'

export function buildPensionAnalytics(unifiedRows, agreements = []) {
  return {
    managementFees: buildManagementFeesAudit(unifiedRows, agreements),
    insuranceTrack: buildInsuranceTrackAudit(unifiedRows),
    investmentTrack: buildInvestmentTrackAudit(unifiedRows),
    insuranceEndAge: buildInsuranceEndAgeAudit(unifiedRows),
    totalRows: unifiedRows.length,
  }
}

export function buildManagementFeesAudit(rows, agreements) {
  const audited = rows.map(row => ({
    ...row,
    ...auditManagementFees(row, agreements),
  }))

  const summary = countByStatus(audited, 'feeStatus')
  return { rows: audited, summary }
}

export function buildInsuranceTrackAudit(rows) {
  const merged = mergeEmployeeInsuranceRows(rows)
  const summary = countByStatus(merged, 'insuranceStatus')
  return { rows: merged, summary }
}

export function buildInvestmentTrackAudit(rows) {
  const audited = rows.map(row => ({
    ...row,
    ...auditInvestmentTrack(row),
  }))

  const summary = countByStatus(audited, 'trackStatus')

  // Category breakdown
  const catCounts = {}
  for (const r of audited) {
    const cat = r.trackCategory || 'unknown'
    catCounts[cat] = (catCounts[cat] || 0) + 1
  }

  return { rows: audited, summary, categoryBreakdown: catCounts }
}

export function buildInsuranceEndAgeAudit(rows) {
  const audited = rows.map(row => ({
    ...row,
    ...evaluateInsuranceEndAge(row),
  }))

  const flagged = audited.filter(r => r.insuranceEndAgeFlag)
  return { rows: flagged, totalChecked: audited.length, flaggedCount: flagged.length }
}

function countByStatus(rows, field) {
  const counts = {}
  for (const r of rows) {
    const s = r[field] || 'unknown'
    counts[s] = (counts[s] || 0) + 1
  }
  return counts
}

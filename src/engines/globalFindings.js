/**
 * Cross-product (global) findings:
 * - Income Protection (73% rule)
 * - Asset Allocation
 * - Beneficiaries
 */

import { categorizeTrack } from '../unified/auditEngine.js'

export function buildGlobalFindings(rows, clientProfile = {}) {
  const findings = []
  findings.push(...incomeProtectionFindings(rows))
  findings.push(...assetAllocationFindings(rows))
  return findings
}

export function buildSummary(rows) {
  const active = rows.filter(r => r.status === 'active')

  const totalAccumulation = active.reduce((s, r) => s + (r.accumulation || 0), 0)

  const salaries = active.map(r => r.salary).filter(Boolean)
  const maxSalary = salaries.length ? Math.max(...salaries) : null

  const byType = {}
  for (const r of active) {
    const t = r.productType || 'other'
    if (!byType[t]) byType[t] = { count: 0, accumulation: 0 }
    byType[t].count++
    byType[t].accumulation += r.accumulation || 0
  }

  return { totalAccumulation, maxSalary, byType, activeCount: active.length, totalCount: rows.length }
}

// ─── Income Protection ────────────────────────────────────────────
function incomeProtectionFindings(rows) {
  const active = rows.filter(r => r.status === 'active')
  const coverageRows = active.filter(r => r.productType === 'pension' || r.productType === 'bituach_menahalim')

  if (active.length > 0 && coverageRows.length === 0) {
    return [{
      type: 'finding', status: 'danger',
      title: 'כיסוי הכנסה — לא נמצא',
      message: 'לא נמצאו מוצרי פנסיה או ביטוח מנהלים פעילים לכיסוי הכנסה',
    }]
  }

  const salaries = coverageRows.map(r => r.salary).filter(s => s && s > 0)
  if (!salaries.length) {
    return [{
      type: 'limitation', status: 'info',
      title: 'כיסוי הכנסה 73%',
      message: 'לא ניתן לחשב כיסוי הכנסה — חסר נתון שכר בדוח ה-XML',
    }]
  }

  const maxSalary = Math.max(...salaries)
  const target = Math.round(maxSalary * 0.73)

  // Estimate monthly deposit toward savings/income
  const totalDeposit = coverageRows.reduce((sum, r) => {
    const empRate = (r.depositEmployeePercent || 0) / 100
    const mavRate = (r.depositEmployerPercent  || 0) / 100
    return sum + (r.salary || 0) * (empRate + mavRate)
  }, 0)

  const hasSalary = maxSalary > 0
  const coverageRatio = hasSalary && totalDeposit > 0 ? totalDeposit / maxSalary : null

  return [{
    type: 'information', status: 'info',
    title: 'כיסוי הכנסה',
    message: `שכר מבוטח: ₪${maxSalary.toLocaleString()} | יעד 73%: ₪${target.toLocaleString()} | יש לאמת כיסוי מלא כולל אכ"ע וריסק`,
  }]
}

// ─── Asset Allocation ─────────────────────────────────────────────
function assetAllocationFindings(rows) {
  const active = rows.filter(r => r.status === 'active' && r.accumulation > 0)
  if (!active.length) return []

  const totalAccum = active.reduce((s, r) => s + r.accumulation, 0)
  if (totalAccum <= 0) return []

  let equityAccum = 0
  let unknownAccum = 0

  for (const row of active) {
    const { category } = categorizeTrack(row.investmentTrack)
    if (category === 'STOCKS' || category === 'SP500' || category === 'INDEX') {
      equityAccum += row.accumulation
    } else if (!category || category === 'GENERAL') {
      unknownAccum += row.accumulation
    }
  }

  const equityPct = Math.round((equityAccum / totalAccum) * 100)
  const unknownPct = Math.round((unknownAccum / totalAccum) * 100)

  if (unknownPct > 50) {
    return [{
      type: 'limitation', status: 'info',
      title: 'חשיפה מנייתית',
      message: `${unknownPct}% מהצבירה במסלולים לא מזוהים — לא ניתן לאמוד חשיפה מנייתית`,
    }]
  }

  return [{
    type: 'information', status: 'ok',
    title: 'חשיפה מנייתית',
    message: `${equityPct}% מהצבירה (₪${Math.round(equityAccum).toLocaleString()}) במסלולי מניות/מדד מתוך ₪${Math.round(totalAccum).toLocaleString()}`,
  }]
}

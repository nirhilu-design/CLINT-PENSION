/**
 * Per-product finding generators.
 * Each function returns an array of finding objects:
 * { type: 'information'|'finding'|'limitation'|'recommendation', status: 'ok'|'warn'|'danger'|'info', title, message }
 */

import { categorizeTrack, getAgeGroup } from '../unified/auditEngine.js'

// Fee thresholds by product type (warn = actionable, danger = above legal/market max)
const FEE_LIMITS = {
  pension:           { premium: { warn: 3.5, danger: 6.0 }, accum: { warn: 0.5,  danger: 1.0  } },
  bituach_menahalim: { premium: { warn: 3.5, danger: 6.0 }, accum: { warn: 0.75, danger: 1.05 } },
  gemel:             { premium: { warn: 2.0, danger: 4.0 }, accum: { warn: 0.5,  danger: 1.05 } },
  hishtalmut:        { premium: { warn: 2.0, danger: 4.0 }, accum: { warn: 0.5,  danger: 1.05 } },
}

export function generateRowFindings(row, clientProfile = {}) {
  const findings = []
  findings.push(...feeFindings(row))
  findings.push(...investmentFindings(row))
  findings.push(...section14Findings(row))
  findings.push(...depositFindings(row))
  return findings
}

function feeFindings(row) {
  const { feeFromPremium: fp, feeFromAccumulation: fa, productType } = row
  const limits = FEE_LIMITS[productType] || FEE_LIMITS.pension

  if (fp == null && fa == null) {
    return [{ type: 'limitation', status: 'info', title: 'דמי ניהול', message: 'לא התקבל מידע על דמי ניהול בדוח זה' }]
  }

  const parts = []
  if (fp != null) parts.push(`מהפרמיה: ${fp}%`)
  if (fa != null) parts.push(`מהצבירה: ${fa}%`)
  const detail = parts.join(' | ')

  const premiumDanger = fp != null && fp > limits.premium.danger
  const premiumWarn   = fp != null && fp > limits.premium.warn
  const accumDanger   = fa != null && fa > limits.accum.danger
  const accumWarn     = fa != null && fa > limits.accum.warn

  if (premiumDanger || accumDanger) {
    return [{ type: 'finding', status: 'danger', title: 'דמי ניהול גבוהים מהמותר', message: detail }]
  }
  if (premiumWarn || accumWarn) {
    return [{ type: 'finding', status: 'warn', title: 'דמי ניהול — ניתן לשיפור', message: detail }]
  }
  return [{ type: 'information', status: 'ok', title: 'דמי ניהול', message: detail }]
}

function investmentFindings(row) {
  const { investmentTrack, age, birthYear } = row
  const { category, label } = categorizeTrack(investmentTrack)
  const ageGroup = getAgeGroup(age, birthYear)

  if (!investmentTrack) {
    return [{ type: 'limitation', status: 'info', title: 'מסלול השקעה', message: 'לא קיים מידע על מסלול ההשקעה' }]
  }

  const SUSPICIOUS = {
    young:         ['BONDS', 'SHEKEL'],
    middle:        ['SHEKEL'],
    preretirement: ['STOCKS', 'SP500'],
    retirement:    ['STOCKS', 'SP500'],
  }

  const AGE_LABELS = {
    young: 'צעיר (<40)', middle: 'ביניים (40-49)',
    preretirement: 'לפני פרישה (50-59)', retirement: 'בגיל פרישה (60+)',
  }

  if (ageGroup && SUSPICIOUS[ageGroup]?.includes(category)) {
    return [{ type: 'finding', status: 'warn', title: 'מסלול השקעה — לא מתאים לגיל', message: `${investmentTrack} — מסלול לא מתאים עבור ${AGE_LABELS[ageGroup]}` }]
  }

  const trackDisplay = label && label !== 'לא ידוע' ? `${investmentTrack} (${label})` : investmentTrack
  return [{ type: 'information', status: 'ok', title: 'מסלול השקעה', message: trackDisplay }]
}

function section14Findings(row) {
  const { section14, productType } = row
  if (productType !== 'pension' && productType !== 'bituach_menahalim') return []

  if (section14 == null) {
    return [{ type: 'limitation', status: 'info', title: 'הסדר פיצויים', message: 'לא קיים מידע על הסדר פיצויים' }]
  }

  if (section14 === true) {
    return [{ type: 'information', status: 'info', title: 'הסדר סעיף 14', message: 'פיצויים בהסדר ס׳14 — לא ניתן למשיכה עצמאית' }]
  }

  return [{ type: 'information', status: 'ok', title: 'ללא הסדר סעיף 14', message: 'זכאות לפיצויים מלאים בעזיבה' }]
}

function depositFindings(row) {
  const { depositEmployeePercent: emp, depositEmployerPercent: mav, depositPitzuimPercent: pitz } = row

  if (emp == null && mav == null) return []

  const parts = []
  if (emp  != null) parts.push(`עובד: ${emp}%`)
  if (mav  != null) parts.push(`מעביד: ${mav}%`)
  if (pitz != null) parts.push(`פיצויים: ${pitz}%`)

  return [{ type: 'information', status: 'ok', title: 'שיעורי הפקדה', message: parts.join(' | ') }]
}

import { sheetToRowsFromHeader, findHeaderRowIndex, parsePercent } from '../utils/excelHelpers.js'
import { normalizeIssuer } from '../utils/issuerAliases.js'
import * as XLSX from 'xlsx'

// Parse a standalone agreements workbook
export function parseAgreements(workbook) {
  if (!workbook) return []
  const results = []
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const rows = parseAgreementSheet(sheet)
    results.push(...rows)
  }
  return results
}

// Parse the embedded "הסכמי מעסיק" sheet from the DATA workbook
// Format: col A = issuer, col B = model name, col C = fee from premium %, col D = fee from accumulation %
export function parseEmbeddedEmployerAgreements(workbook) {
  if (!workbook) return []
  const SHEET_NAME = 'הסכמי מעסיק'
  const sheet = workbook.Sheets[SHEET_NAME]
  if (!sheet) return []
  return parseAgreementSheet(sheet)
}

function parseAgreementSheet(sheet) {
  if (!sheet) return []
  const headerIdx = findHeaderRowIndex(sheet, 2)
  const rows = sheetToRowsFromHeader(sheet, headerIdx)
  const results = []

  for (const row of rows) {
    // Try named columns first, then positional (col A, B, C, D)
    const keys = Object.keys(row)
    const issuerRaw = row[keys[0]]
    const modelName = row[keys[1]] || null
    const feeFromPremiumRaw = row[keys[2]]
    const feeFromAccumulationRaw = row[keys[3]]

    const issuer = normalizeIssuer(issuerRaw)
    if (!issuer) continue

    const feeFromPremium = parsePercent(feeFromPremiumRaw)
    const feeFromAccumulation = parsePercent(feeFromAccumulationRaw)

    if (feeFromPremium == null && feeFromAccumulation == null) continue

    results.push({ issuer, modelName, feeFromPremium, feeFromAccumulation })
  }
  return results
}

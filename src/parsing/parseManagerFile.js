import { readWorkbook } from '../utils/excelHelpers.js'
import { parsePensionFundSheet, findPensionSheet } from '../parsers/pensionFundParser.js'
import { parseEmbeddedEmployerAgreements, parseAgreements } from '../parsers/agreementsParser.js'
import { parsePersonalDetailsSheet, findPersonalDetailsSheet } from '../parsers/personalDetailsParser.js'

export async function parseManagerFile(dataArrayBuffer, agreementsArrayBuffer = null) {
  const dataWorkbook = readWorkbook(dataArrayBuffer)

  // Parse pension sheet
  const pensionSheet = findPensionSheet(dataWorkbook)
  const pensionRows = parsePensionFundSheet(pensionSheet)

  // Parse personal details (optional)
  const personalSheet = findPersonalDetailsSheet(dataWorkbook)
  const personalRows = personalSheet ? parsePersonalDetailsSheet(personalSheet) : []

  // Build a map of employee details for enrichment
  const personalMap = new Map()
  for (const p of personalRows) {
    const key = p.employeeCode || p.employeeName
    if (key) personalMap.set(key, p)
  }

  // Enrich pension rows with personal details
  const unifiedRows = pensionRows.map(row => {
    const key = row.employeeCode || row.employeeName
    const personal = personalMap.get(key) || {}
    return {
      ...personal,
      ...row,
      // Prefer pension row data for overlapping fields, but fill in missing
      employeeCode: row.employeeCode ?? personal.employeeCode,
      employeeName: row.employeeName ?? personal.employeeName,
      age: row.age ?? personal.age,
      birthYear: row.birthYear ?? personal.birthYear,
    }
  })

  // Agreements: standalone file > embedded sheet > empty
  let agreements = []
  if (agreementsArrayBuffer) {
    try {
      const agrWorkbook = readWorkbook(agreementsArrayBuffer)
      agreements = parseAgreements(agrWorkbook)
    } catch {
      agreements = []
    }
  }

  if (!agreements.length) {
    agreements = parseEmbeddedEmployerAgreements(dataWorkbook)
  }

  // Detect which products exist
  const hasData = unifiedRows.length > 0

  return {
    unifiedRows,
    agreements,
    sheetNames: dataWorkbook.SheetNames,
    hasData,
    rowCount: unifiedRows.length,
  }
}

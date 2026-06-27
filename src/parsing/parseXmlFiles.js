import { parseXmlPension } from '../parsers/xmlPensionParser.js'

/**
 * Parse multiple XML pension files.
 * @param {File[]} fileArray - Array of File objects
 * @returns {{ unifiedRows: object[], clientInfo: object, reportDate: string|null, fileCount: number }}
 */
export async function parseXmlFiles(fileArray) {
  const allRows = []

  for (const file of fileArray) {
    const text = await file.text()
    const rows = parseXmlPension(text)
    allRows.push(...rows)
  }

  // Extract clientInfo from first row
  const first = allRows[0] || {}
  const clientInfo = {
    clientId: first.clientId || null,
    clientName: first.clientName || null,
    birthDate: first.birthDate || null,
    birthYear: first.birthYear || null,
    age: first.age || null,
  }

  const reportDate = first.reportDate || null

  return {
    unifiedRows: allRows,
    clientInfo,
    reportDate,
    fileCount: fileArray.length,
  }
}

import * as XLSX from 'xlsx'

export function readWorkbook(arrayBuffer) {
  return XLSX.read(arrayBuffer, { type: 'array' })
}

export function sheetToRows(sheet) {
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false })
}

export function sheetToRawRows(sheet) {
  if (!sheet) return []
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true })
}

// Find header row index (first row with >=minCols non-empty cells)
export function findHeaderRowIndex(sheet, minCols = 3) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  for (let r = range.s.r; r <= Math.min(range.e.r, 20); r++) {
    let count = 0
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      if (cell && cell.v != null && String(cell.v).trim()) count++
    }
    if (count >= minCols) return r
  }
  return 0
}

export function sheetToRowsFromHeader(sheet, headerRowIndex) {
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
  const headers = []
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRowIndex, c })]
    headers.push(cell ? String(cell.v || '').trim() : '')
  }

  const rows = []
  for (let r = headerRowIndex + 1; r <= range.e.r; r++) {
    const row = {}
    let hasValue = false
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })]
      const val = cell ? cell.v : null
      if (val != null && val !== '') hasValue = true
      const key = headers[c - range.s.c]
      if (key) row[key] = val != null ? String(val).trim() : null
    }
    if (hasValue) rows.push(row)
  }
  return rows
}

// Resolve a field by trying multiple alias column names
export function resolveField(row, aliases, transform) {
  for (const alias of aliases) {
    if (row[alias] != null && row[alias] !== '') {
      const val = String(row[alias]).trim()
      return transform ? transform(val) : val
    }
  }
  return null
}

export function parsePercent(val) {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace('%', ''))
  return isNaN(n) ? null : n
}

export function parseBoolean(val) {
  if (val == null || val === '') return null
  const s = String(val).trim().toLowerCase()
  if (['כן', 'yes', 'true', '1', 'v', '✓'].includes(s)) return true
  if (['לא', 'no', 'false', '0'].includes(s)) return false
  return null
}

export function parseNumber(val) {
  if (val == null || val === '') return null
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? null : n
}

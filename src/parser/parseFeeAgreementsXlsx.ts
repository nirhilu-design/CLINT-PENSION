// Parse a fee-agreements Excel/CSV uploaded in the advisor area.
// The sheet is expected to hold, per policy, the agreed management fees.
// Column detection is fuzzy (Hebrew/English headers) so advisors can upload
// their own spreadsheet layout without reformatting it.

import type { FeeAgreement } from '../models/types'

export interface ParsedFeeAgreements {
  agreements: FeeAgreement[]
  /** Policy numbers found in the file that are also in the portfolio. */
  matched: string[]
  /** Policy numbers found in the file but not in the portfolio. */
  unmatched: string[]
  error?: string
}

// Header keywords → the field they map to.
const POLICY_KEYS = ['פוליסה', 'מספר פוליסה', 'מס פוליסה', 'policy', 'policynumber']
const DEPOSIT_KEYS = ['מהפקדה', 'הפקדה', 'deposit']
const ACCUM_KEYS = ['מצבירה', 'צבירה', 'accumulation', 'balance']

function normalize(s: unknown): string {
  return String(s ?? '')
    .replace(/["'׳״]/g, '')
    .replace(/\s+/g, '')
    .toLowerCase()
    .trim()
}

function matchColumn(header: unknown, keys: string[]): boolean {
  const h = normalize(header)
  return h.length > 0 && keys.some((k) => h.includes(normalize(k)))
}

/** Parse "0.25%", "0.25", "0,25" → 0.25 (as a percentage number). */
function parsePercent(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const s = String(raw).replace('%', '').replace(',', '.').trim()
  if (!s) return null
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : null
}

export async function parseFeeAgreementsXlsx(
  data: ArrayBuffer,
  portfolioPolicyNumbers: Set<string>,
): Promise<ParsedFeeAgreements> {
  const empty = (error: string): ParsedFeeAgreements => ({
    agreements: [],
    matched: [],
    unmatched: [],
    error,
  })

  // xlsx is heavy — load it only when a file is actually parsed.
  const XLSX = await import('xlsx')

  let rows: unknown[][]
  try {
    const wb = XLSX.read(data, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    if (!sheetName) return empty('הקובץ ריק — לא נמצא גיליון')
    const sheet = wb.Sheets[sheetName]
    // raw:false → cells arrive as their displayed text, so percents keep their sign
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, blankrows: false })
  } catch {
    return empty('לא ניתן לקרוא את הקובץ — ודא שזהו קובץ Excel או CSV תקין')
  }

  if (rows.length === 0) return empty('הגיליון ריק')

  // Find the header row — the first row that contains a policy-number column.
  let headerIdx = -1
  let cols = { policy: -1, deposit: -1, accum: -1 }
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i] ?? []
    const policy = row.findIndex((c) => matchColumn(c, POLICY_KEYS))
    if (policy === -1) continue
    headerIdx = i
    cols = {
      policy,
      deposit: row.findIndex((c) => matchColumn(c, DEPOSIT_KEYS)),
      accum: row.findIndex((c) => matchColumn(c, ACCUM_KEYS)),
    }
    break
  }

  if (headerIdx === -1) {
    return empty('לא זוהתה עמודת מספר פוליסה בקובץ. ודא שיש כותרת "מספר פוליסה".')
  }
  if (cols.deposit === -1 && cols.accum === -1) {
    return empty('לא זוהו עמודות דמי ניהול (מהפקדה / מצבירה) בקובץ.')
  }

  const byPolicy = new Map<string, FeeAgreement>()
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] ?? []
    const policyNumber = normalize(row[cols.policy]) ? String(row[cols.policy]).trim() : ''
    if (!policyNumber) continue
    const agreedFeeFromDeposit = cols.deposit === -1 ? null : parsePercent(row[cols.deposit])
    const agreedFeeFromAccumulation = cols.accum === -1 ? null : parsePercent(row[cols.accum])
    if (agreedFeeFromDeposit === null && agreedFeeFromAccumulation === null) continue
    byPolicy.set(policyNumber, {
      policyNumber,
      agreedFeeFromDeposit,
      agreedFeeFromAccumulation,
    })
  }

  const agreements = [...byPolicy.values()]
  const matched = agreements.map((a) => a.policyNumber).filter((n) => portfolioPolicyNumbers.has(n))
  const unmatched = agreements
    .map((a) => a.policyNumber)
    .filter((n) => !portfolioPolicyNumbers.has(n))

  if (agreements.length === 0) {
    return empty('לא נמצאו שורות עם דמי ניהול בקובץ.')
  }

  return { agreements, matched, unmatched }
}

// Employer management-fee file (קובץ דמי ניהול מעסיק).
// The advisor uploads the organizational fee agreement and the system compares
// the reported fees against it (see costEngine). A generic CSV/TSV layout is
// supported now: a column for the policy number and columns for the agreed fee
// from deposit / from accumulation. Column order is detected from a header row
// (Hebrew or English keywords); with no header, positional order is assumed:
// policy number, fee-from-deposit, fee-from-accumulation.

import type { FeeAgreement } from '../models/types'

export interface EmployerFeeParseResult {
  fileName: string
  agreements: FeeAgreement[]
  matched: number
  note: string
}

/** Parse a percent cell: strips %, spaces, and accepts comma decimals. */
function parsePercent(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.replace('%', '').replace(',', '.').trim()
  if (!cleaned) return null
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : null
}

function splitRows(text: string): string[][] {
  const clean = text.replace(/^﻿/, '') // strip BOM
  return clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ','
      return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''))
    })
}

function matchColumn(headers: string[], keywords: string[]): number {
  return headers.findIndex((h) => keywords.some((k) => h.includes(k)))
}

export function parseEmployerFeeFile(text: string, fileName: string): EmployerFeeParseResult {
  // XML org-fee format mapping is provider-specific and pending a real sample.
  if (text.trimStart().startsWith('<')) {
    return {
      fileName,
      agreements: [],
      matched: 0,
      note: 'זוהה קובץ XML. מיפוי שדות דמי הניהול מקובץ ה-XML של המעסיק יתווסף לאחר קבלת דוגמת קובץ. בינתיים ניתן להעלות קובץ CSV (מספר פוליסה, % מהפקדה, % מצבירה).',
    }
  }

  const rows = splitRows(text)
  if (rows.length === 0) {
    return { fileName, agreements: [], matched: 0, note: 'הקובץ ריק או אינו קריא.' }
  }

  // Detect a header row by keyword; otherwise assume positional columns.
  const first = rows[0]
  const looksLikeHeader = first.some((c) =>
    ['פוליסה', 'policy', 'חשבון', 'הפקדה', 'צבירה', 'deposit', 'accum'].some((k) => c.toLowerCase().includes(k.toLowerCase())),
  )

  let policyCol = 0
  let depositCol = 1
  let accumCol = 2
  let dataRows = rows

  if (looksLikeHeader) {
    const headers = first.map((h) => h.toLowerCase())
    policyCol = matchColumn(headers, ['פוליסה', 'policy', 'חשבון', 'מספר'])
    depositCol = matchColumn(headers, ['הפקדה', 'deposit'])
    accumCol = matchColumn(headers, ['צבירה', 'צובר', 'accum'])
    dataRows = rows.slice(1)
    if (policyCol === -1) policyCol = 0
    if (depositCol === -1) depositCol = 1
    if (accumCol === -1) accumCol = 2
  }

  const agreements: FeeAgreement[] = []
  for (const row of dataRows) {
    const policyNumber = (row[policyCol] ?? '').trim()
    if (!policyNumber) continue
    const agreedFeeFromDeposit = parsePercent(row[depositCol])
    const agreedFeeFromAccumulation = parsePercent(row[accumCol])
    if (agreedFeeFromDeposit === null && agreedFeeFromAccumulation === null) continue
    agreements.push({ policyNumber, agreedFeeFromDeposit, agreedFeeFromAccumulation })
  }

  if (agreements.length === 0) {
    return {
      fileName,
      agreements: [],
      matched: 0,
      note: 'הקובץ נקרא אך לא זוהו שורות דמי ניהול תקינות. מבנה נדרש: עמודות למספר פוליסה, % דמי ניהול מהפקדה, % דמי ניהול מצבירה.',
    }
  }

  return {
    fileName,
    agreements,
    matched: agreements.length,
    note: `נקראו ${agreements.length} שורות דמי ניהול מפעליים מהקובץ.`,
  }
}

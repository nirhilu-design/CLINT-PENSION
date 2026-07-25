// Employer management-fee file (קובץ דמי ניהול מעסיק).
// TEMPLATE ONLY: this recognizes an uploaded file and returns the shape the rest
// of the system expects (per-policy agreed fees). The actual field mapping (טיוב)
// will be filled in once a real sample file is provided — for now it extracts
// nothing and reports that back to the advisor.

import type { FeeAgreement } from '../models/types'

export interface EmployerFeeParseResult {
  fileName: string
  agreements: FeeAgreement[]
  matched: number
  note: string
}

export function parseEmployerFeeFile(_text: string, fileName: string): EmployerFeeParseResult {
  return {
    fileName,
    agreements: [],
    matched: 0,
    note: 'הקובץ נטען. מיפוי שדות דמי הניהול מקובץ המעסיק יתווסף לאחר קבלת דוגמת קובץ (טיוב).',
  }
}

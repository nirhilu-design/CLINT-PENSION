import { sheetToRowsFromHeader, findHeaderRowIndex, resolveField, parsePercent, parseBoolean, parseNumber } from '../utils/excelHelpers.js'
import { normalizeIssuer } from '../utils/issuerAliases.js'

const FIELD_ALIASES = {
  issuer: ['שם הקרן', 'שם היצרן', 'יצרן', 'קרן', 'שם קרן', 'issuer', 'fund name'],
  planType: ['סוג הקרן', 'סוג מוצר', 'סוג', 'product type', 'plan type'],
  investmentTrack: ['מסלול השקעה', 'מסלול', 'track', 'investment track'],
  employeeCode: ['מזהה עובד', 'קוד עובד', 'employee id', 'employee code', 'ת.ז', 'תז', 'מספר עובד'],
  employeeName: ['שם עובד', 'שם', 'employee name', 'name'],
  section14: ['סעיף 14', 'ס׳14', "ס'14", 'section 14', 'ס14', 'סע 14', 'סעיף14'],
  compensationPension: ['פנסיית פיצויים', 'פיצויים בקרן', 'compensation pension'],
  clientChoice: ['בחירת לקוח', 'client choice', 'לקוח בחר'],
  insuranceEndAge: ['תום תקופת ביטוח', 'גיל תום ביטוח', 'insurance end age', 'תום ביטוח'],
  feeFromPremium: ['דמי ניהול מפרמיה', 'דמ מפרמיה', 'דמי ניהול מהפרמיה', 'fee from premium', '% מפרמיה'],
  feeFromAccumulation: ['דמי ניהול מצבירה', 'דמ מצבירה', 'דמי ניהול מהצבירה', 'fee from accumulation', '% מצבירה'],
  accumulation: ['צבירה', 'סכום צבירה', 'accumulation', 'balance'],
  monthlyPremium: ['פרמיה חודשית', 'פרמיה', 'monthly premium', 'premium'],
  birthYear: ['שנת לידה', 'year of birth', 'birth year'],
  age: ['גיל', 'age'],
}

export function parsePensionFundSheet(sheet) {
  if (!sheet) return []
  const headerIdx = findHeaderRowIndex(sheet)
  const rawRows = sheetToRowsFromHeader(sheet, headerIdx)

  return rawRows.map(row => ({
    issuer: normalizeIssuer(resolveField(row, FIELD_ALIASES.issuer)),
    planType: resolveField(row, FIELD_ALIASES.planType),
    investmentTrack: resolveField(row, FIELD_ALIASES.investmentTrack),
    employeeCode: resolveField(row, FIELD_ALIASES.employeeCode),
    employeeName: resolveField(row, FIELD_ALIASES.employeeName),
    section14: parseBoolean(resolveField(row, FIELD_ALIASES.section14)),
    compensationPension: parseBoolean(resolveField(row, FIELD_ALIASES.compensationPension)),
    clientChoice: parseBoolean(resolveField(row, FIELD_ALIASES.clientChoice)),
    insuranceEndAge: parseNumber(resolveField(row, FIELD_ALIASES.insuranceEndAge)),
    feeFromPremium: parsePercent(resolveField(row, FIELD_ALIASES.feeFromPremium)),
    feeFromAccumulation: parsePercent(resolveField(row, FIELD_ALIASES.feeFromAccumulation)),
    accumulation: parseNumber(resolveField(row, FIELD_ALIASES.accumulation)),
    monthlyPremium: parseNumber(resolveField(row, FIELD_ALIASES.monthlyPremium)),
    birthYear: parseNumber(resolveField(row, FIELD_ALIASES.birthYear)),
    age: parseNumber(resolveField(row, FIELD_ALIASES.age)),
    _raw: row,
  })).filter(r => r.issuer || r.employeeCode || r.employeeName)
}

// Find a pension sheet by common Hebrew/English sheet name patterns
export function findPensionSheet(workbook) {
  const PENSION_NAMES = ['קרן פנסיה', 'פנסיה', 'pension', 'pension fund', 'קרנות פנסיה']
  for (const name of workbook.SheetNames) {
    const lower = name.trim().toLowerCase()
    if (PENSION_NAMES.some(p => lower.includes(p.toLowerCase()))) {
      return workbook.Sheets[name]
    }
  }
  // fallback: first sheet
  return workbook.Sheets[workbook.SheetNames[0]]
}

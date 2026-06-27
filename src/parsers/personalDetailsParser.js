import { sheetToRowsFromHeader, findHeaderRowIndex, resolveField, parseNumber } from '../utils/excelHelpers.js'

const FIELD_ALIASES = {
  employeeCode: ['מזהה עובד', 'קוד עובד', 'ת.ז', 'תז', 'מספר עובד', 'employee id'],
  employeeName: ['שם עובד', 'שם', 'employee name'],
  birthYear: ['שנת לידה', 'year of birth'],
  age: ['גיל', 'age'],
  department: ['מחלקה', 'department'],
  startDate: ['תאריך תחילת עבודה', 'start date'],
}

export function parsePersonalDetailsSheet(sheet) {
  if (!sheet) return []
  const headerIdx = findHeaderRowIndex(sheet)
  const rawRows = sheetToRowsFromHeader(sheet, headerIdx)

  return rawRows.map(row => ({
    employeeCode: resolveField(row, FIELD_ALIASES.employeeCode),
    employeeName: resolveField(row, FIELD_ALIASES.employeeName),
    birthYear: parseNumber(resolveField(row, FIELD_ALIASES.birthYear)),
    age: parseNumber(resolveField(row, FIELD_ALIASES.age)),
    department: resolveField(row, FIELD_ALIASES.department),
    startDate: resolveField(row, FIELD_ALIASES.startDate),
  })).filter(r => r.employeeCode || r.employeeName)
}

export function findPersonalDetailsSheet(workbook) {
  const NAMES = ['פרטים אישיים', 'עובדים', 'employees', 'personal', 'personal details']
  for (const name of workbook.SheetNames) {
    const lower = name.trim().toLowerCase()
    if (NAMES.some(p => lower.includes(p.toLowerCase()))) {
      return workbook.Sheets[name]
    }
  }
  return null
}

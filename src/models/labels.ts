import type { CoverageType, FindingCategory, FindingSeverity, ProductType } from './types'

export const productTypeLabels: Record<ProductType, string> = {
  pension: 'קרן פנסיה',
  managers: 'ביטוח מנהלים',
  gemel: 'קופת גמל',
  education: 'קרן השתלמות',
  life: 'ביטוח חיים',
  incomeProtection: 'אובדן כושר עבודה',
  unknown: 'מוצר לא מזוהה',
}

export const coverageTypeLabels: Record<CoverageType, string> = {
  disability: 'נכות / אובדן כושר עבודה',
  survivors: 'שאירים',
  death: 'מקרה מוות',
  other: 'כיסוי אחר',
}

export const findingCategoryLabels: Record<FindingCategory, string> = {
  retirement: 'פרישה',
  cost: 'עלויות',
  investment: 'השקעות',
  insurance: 'ביטוח',
  death: 'תמונת מוות',
  dataQuality: 'איכות נתונים',
  information: 'מידע',
  limitation: 'מגבלת ניתוח',
}

export const severityLabels: Record<FindingSeverity, string> = {
  info: 'מידע',
  attention: 'כדאי לבדוק',
  gap: 'נמצא פער',
}

export const beneficiaryRelationLabels: Record<string, string> = {
  '1': 'בן/בת זוג',
  '2': 'ילד/ה',
  '3': 'הורה',
  '4': 'אח/אחות',
  '5': 'אחר',
  '6': 'עיזבון',
  '7': 'על פי דין',
}

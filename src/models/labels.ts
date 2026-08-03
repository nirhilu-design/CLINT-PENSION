import type {
  CoverageKind,
  CoverageType,
  FindingCategory,
  FindingSeverity,
  ProductType,
} from './types'

export const productTypeLabels: Record<ProductType, string> = {
  pension: 'קרן פנסיה',
  managers: 'ביטוח מנהלים',
  gemel: 'קופת גמל',
  gemelInvestment: 'גמל להשקעה',
  education: 'קרן השתלמות',
  life: 'ביטוח חיים',
  mortgage: 'ביטוח חיים משכנתא',
  incomeProtection: 'אובדן כושר עבודה',
  unknown: 'מוצר לא מזוהה',
}

export const coverageTypeLabels: Record<CoverageType, string> = {
  disability: 'נכות / אובדן כושר עבודה',
  survivors: 'שאירים',
  death: 'מקרה מוות',
  other: 'כיסוי אחר',
}

export const coverageKindLabels: Record<CoverageKind, string> = {
  death: 'מקרה מוות (ביטוח חיים)',
  accidentalDeath: 'מוות מתאונה',
  deathAndIncomeProtection: 'מוות + אכ"ע',
  occupationalDisability: 'נכות מקצועית',
  accidentalDisability: 'נכות מתאונה',
  incomeProtection: 'אובדן כושר עבודה (אכ"ע)',
  pensionDisability: 'פנסיית נכות',
  survivors: 'קצבת שאירים',
  criticalIllness: 'מחלות קשות',
  other: 'כיסוי אחר',
}

export const findingCategoryLabels: Record<FindingCategory, string> = {
  retirement: 'פרישה',
  cost: 'עלויות',
  investment: 'השקעות',
  deposits: 'הפקדות ורציפות',
  insurance: 'ביטוח',
  death: 'תמונת מוות',
  dataQuality: 'איכות נתונים',
  information: 'מידע',
  insight: 'הארה',
  limitation: 'מגבלת ניתוח',
}

export const severityLabels: Record<FindingSeverity, string> = {
  info: 'מידע',
  attention: 'כדאי לבדוק',
  gap: 'נמצא פער',
}

// SUG-ZIHUY-MUTAV (סוג זיהוי מוטב) per the מבנה אחיד value list.
export const beneficiaryRelationLabels: Record<string, string> = {
  '1': 'פרטי',
  '2': 'תאגיד',
  '3': 'יורשים חוקיים',
  '4': 'צוואה',
  '5': 'שאיר',
  '6': 'אחר',
  '7': 'לא נקבעו מוטבים',
}

// The catalog of every analysis logic ("engine"), packaged for the Logic Editor.
// Each entry documents what the logic does and which numeric thresholds an
// advisor may tune. The `id` matches the engine id in engines/index.ts.

import type { ProductType } from '../models/types'
import { DEFAULT_THRESHOLDS, cloneThresholds, type ThresholdValues } from './thresholds'

// A single editable numeric threshold, addressed by its flat key on ThresholdValues.
export interface LogicParam {
  key: Exclude<keyof ThresholdValues, 'marketFees'>
  label: string
  unit?: '%' | '₪' | 'חודשים' | 'שנים' | 'יחס' | 'נק׳ אחוז'
}

export interface LogicDef {
  id: string
  label: string
  products: ProductType[] // which products this logic touches ([] = all products)
  explanation: string // how the insight/finding is built, in plain Hebrew
  params: LogicParam[] // editable flat thresholds (fees are edited separately)
  editsMarketFees?: boolean // true → also render the per-product fee table
}

export const LOGIC_CATALOG: LogicDef[] = [
  {
    id: 'managersGeneration',
    label: 'דורות ביטוח מנהלים',
    products: ['managers'],
    explanation:
      'בוחן את כל דורות ביטוח המנהלים. לפני 6/2001 (מקדם מובטח יקר-ערך): חלוקה עם פנסיה ללא בן/בת זוג או ילדים מסומנת לתשומת לב. 6/2001–2004: בחינת הפניית ההפקדות למוצר אחר. 2004–2013 עם מקדם חדש לצד פנסיה: אם דמי הניהול מצבירה מעל הסף — בחינת השילוב (חומרה פחותה מעל תקרת המקיפה). הכל ניטרלי, מפנה לבעל רישיון.',
    params: [
      { key: 'managersNewFactorFeeThreshold', label: 'סף דמי ניהול (מנהלים 2004–2013, מקדם חדש)', unit: '%' },
      { key: 'mekifaSalaryCap', label: 'תקרת שכר לפנסיה מקיפה', unit: '₪' },
    ],
  },
  {
    id: 'cost',
    label: 'דמי ניהול',
    products: [],
    explanation:
      'משווה את דמי הניהול (מהפקדה ומצבירה) מול סף השוק לכל מוצר, מול הסכם מפעלי אם הוזן, ומול ממוצע הקופה מנתוני האוצר. חריגה מעל הסף פותחת הארה.',
    params: [{ key: 'feeAboveFundAvgTolerance', label: 'סבילות מעל הסכם/ממוצע קופה', unit: 'נק׳ אחוז' }],
    editsMarketFees: true,
  },
  {
    id: 'retirement',
    label: 'קצבת פרישה',
    products: ['pension', 'managers'],
    explanation:
      'מסכם את הקצבה החודשית הצפויה מהמוצרים הפעילים ובוחן את יחסה לשכר. אם הקצבה נמוכה מהיחס המינימלי לשכר — נפתחת הארה.',
    params: [{ key: 'pensionToSalaryMinRatio', label: 'יחס קצבה-לשכר מינימלי', unit: 'יחס' }],
  },
  {
    id: 'investment',
    label: 'תשואות והשקעה',
    products: [],
    explanation:
      'משווה את התשואה נטו המדווחת מול נתוני האוצר (בנצ׳מרק) ומול מדד שארפ. פער מתחת לסבילות מהבנצ׳מרק פותח הארה.',
    params: [{ key: 'returnBelowBenchmarkTolerance', label: 'סבילות מתחת לבנצ׳מרק', unit: 'נק׳ אחוז' }],
  },
  {
    id: 'incomeProtection',
    label: 'אובדן כושר עבודה (אכ״ע)',
    products: ['incomeProtection', 'pension', 'managers'],
    explanation:
      'בודק את שיעור כיסוי האכ״ע מול יעד הכיסוי. שיעור מתחת ליעד פחות מרווח הסבילות פותח הארה; אם השכר המבוטח נמוך מהיחס לשכר בפועל — פער.',
    params: [
      { key: 'ipTargetCoveragePercent', label: 'יעד כיסוי אכ״ע', unit: '%' },
      { key: 'ipCoveragePercentSlack', label: 'מרווח סבילות מתחת ליעד', unit: '%' },
      { key: 'ipCoveredSalaryRatio', label: 'יחס שכר מבוטח מינימלי', unit: 'יחס' },
    ],
  },
  {
    id: 'deathPicture',
    label: 'תמונת מוות',
    products: ['life', 'pension', 'managers'],
    explanation:
      'מרכז את כיסויי המוות והשאירים ובוחן אותם מול הקשר המשפחתי. סכומי נכסים או כיסוי גבוהים מהסף מודגשים לבדיקת התאמה.',
    params: [
      { key: 'largeAssetsThreshold', label: 'סף נכסים משמעותי', unit: '₪' },
      { key: 'largeLifeCoverThreshold', label: 'סף כיסוי ביטוחי משמעותי', unit: '₪' },
    ],
  },
  {
    id: 'dataQuality',
    label: 'איכות נתונים',
    products: [],
    explanation:
      'מצליב את השכר שהוזן מול השכר המבוטח בקבצים ומסמן נתונים חסרים. פער מעל הסף בין השכרים פותח הארה.',
    params: [{ key: 'salaryCrosscheckDiffRatio', label: 'סף פער שכר מוזן מול מבוטח', unit: 'יחס' }],
  },
  {
    id: 'savings',
    label: 'חיסכון ונזילות',
    products: ['gemel', 'gemelInvestment', 'education'],
    explanation:
      'בוחן נזילות קרן השתלמות (ותק לנזילות) ובסיס ההפקדה מול תקרת השכר המוטבת, ומאיר הזדמנויות/מגבלות נזילות.',
    params: [
      { key: 'educationFundLiquidityYears', label: 'ותק לנזילות קרן השתלמות', unit: 'שנים' },
      { key: 'educationFundMonthlySalaryCap', label: 'תקרת שכר מוטבת (השתלמות)', unit: '₪' },
    ],
  },
  {
    id: 'managersInsight',
    label: 'תובנות מנהלים',
    products: ['managers', 'incomeProtection'],
    explanation:
      'תובנות ברמת פוליסת מנהלים: רובד מעל תקרת הפנסיה המקיפה, מקדם מובטח, ורכיב אכ״ע. משווה שכר מול תקרת המקיפה.',
    params: [{ key: 'mekifaSalaryCap', label: 'תקרת שכר לפנסיה מקיפה', unit: '₪' }],
  },
  {
    id: 'pensionInsight',
    label: 'תובנות פנסיה',
    products: ['pension'],
    explanation:
      'הארות ברמת קרן פנסיה (ניטרליות בלבד): כיסוי שאירים מול הקשר המשפחתי; וכשכיסוי הנכות בקרן נמוך מהסף — בדיקה חוצת-מוצרים האם קיים כיסוי אכ"ע במוצר אחר (כגון רכיב אכ"ע בביטוח מנהלים).',
    params: [
      { key: 'pensionDisabilityLowPercent', label: 'סף נכות נמוך → בדיקת אכ"ע במוצר אחר', unit: '%' },
      { key: 'maxPensionDisabilityPercent', label: 'שיעור כיסוי נכות מקסימלי (הקשר)', unit: '%' },
    ],
  },
  {
    id: 'deposits',
    label: 'הפקדות ורציפות',
    products: ['pension', 'managers', 'gemel', 'education'],
    explanation:
      'בודק עדכניות ורציפות הפקדות: הפקדה אחרונה מול תאריך הקובץ, ופערי חודשים בתוך חלון הרציפות. פוליסה בסטטוס ריסק זמני מסומנת בנפרד (ההפקדות פסקו והכיסוי נשמר זמנית).',
    params: [
      { key: 'depositRecencyMonths', label: 'חודשים מותרים מההפקדה האחרונה', unit: 'חודשים' },
      { key: 'depositContinuityWindowMonths', label: 'חלון בדיקת רציפות', unit: 'חודשים' },
    ],
  },
]

// The editable, serializable state the Logic Editor screen owns.
export interface LogicConfig {
  thresholds: ThresholdValues
  disabledLogics: string[] // logic ids turned off
}

export function defaultLogicConfig(): LogicConfig {
  return { thresholds: cloneThresholds(DEFAULT_THRESHOLDS), disabledLogics: [] }
}

// Control-rules catalog — a human-readable description of the logics the
// analysis engines apply. This is presentation metadata for the "חוקי בקרה"
// page; the engines remain the source of truth. Numbers are pulled from
// thresholds.ts so the page never drifts from the actual checks.

import type { FindingCategory, FindingSeverity, ProductType } from '../models/types'
import {
  MARKET_FEE_THRESHOLDS,
  FEE_ABOVE_FUND_AVG_TOLERANCE,
  IP_TARGET_COVERAGE_PERCENT,
  IP_COVERAGE_PERCENT_SLACK,
  IP_COVERED_SALARY_RATIO,
  PENSION_TO_SALARY_MIN_RATIO,
  RETURN_BELOW_BENCHMARK_TOLERANCE,
  EDUCATION_FUND_LIQUIDITY_YEARS,
  MEKIFA_SALARY_CAP,
  DEPOSIT_RECENCY_MONTHS,
  DEPOSIT_CONTINUITY_WINDOW_MONTHS,
  SALARY_CROSSCHECK_DIFF_RATIO,
  LARGE_LIFE_COVER_THRESHOLD,
} from './thresholds'

export interface ControlRule {
  /** Trigger — the condition that raises a finding. */
  condition: string
  /** Severity the rule produces when it fires. */
  severity: FindingSeverity
  /** Finding category, for the colored tag. */
  category: FindingCategory
  /** Which data the check reads. */
  basedOn: string
  /** The concrete threshold, shown as a chip. Optional. */
  threshold?: string
}

export interface RuleGroup {
  key: string
  title: string
  subtitle: string
  rules: ControlRule[]
}

const pct = (n: number) => `${n}%`

// ---------------------------------------------------------------------------
// General logics — cross-cutting checks that run across the whole portfolio,
// regardless of product type.
// ---------------------------------------------------------------------------
export const GENERAL_RULES: RuleGroup = {
  key: 'general',
  title: 'לוגיקות כלליות',
  subtitle: 'בקרות רוחביות שרצות על כל התיק, ללא תלות בסוג המוצר',
  rules: [
    {
      condition: 'זוהתה בעיה חוסמת בפוליסה (למשל נתונים סותרים או סטטוס בעייתי) — הפוליסה מסומנת ושאר הבדיקות לגביה מושהות',
      severity: 'gap',
      category: 'dataQuality',
      basedOn: 'סטטוס ותקינות הנתונים בקובץ המסלקה',
    },
    {
      condition: 'פער בין השכר המוצהר בטופס לשכר המבוטח בקבצים',
      severity: 'attention',
      category: 'dataQuality',
      basedOn: 'שכר מוצהר בטופס מול SACHAR-POLISA בקבצי המסלקה',
      threshold: `פער מעל ${pct(SALARY_CROSSCHECK_DIFF_RATIO * 100)}`,
    },
    {
      condition: 'ההפקדה האחרונה אינה עדכנית ביחס לתאריך הנתונים בקובץ',
      severity: 'attention',
      category: 'deposits',
      basedOn: 'חודש ההפקדה האחרון מול תאריך הנכונות (TAARICH-NECHONUT)',
      threshold: `מעל ${DEPOSIT_RECENCY_MONTHS} חודשים`,
    },
    {
      condition: 'זוהו חודשים ללא הפקדה בתוך חלון הרציפות שנבדק',
      severity: 'attention',
      category: 'deposits',
      basedOn: 'רצף ההפקדות החודשיות המדווחות',
      threshold: `חלון של ${DEPOSIT_CONTINUITY_WINDOW_MONTHS} חודשים`,
    },
    {
      condition: 'התשואה נמוכה מהמדד הייחוס של המסלול',
      severity: 'attention',
      category: 'investment',
      basedOn: 'תשואת המסלול מול מדד הייחוס בנתוני האוצר',
      threshold: `מתחת ליעד ביותר מ-${RETURN_BELOW_BENCHMARK_TOLERANCE} נק׳ אחוז`,
    },
    {
      condition: 'ביטוח חיים למקרה מוות בהיקף משמעותי — מוצג לתשומת לב בתמונת המוות',
      severity: 'info',
      category: 'death',
      basedOn: 'סכומי כיסוי למקרה מוות בכלל הפוליסות',
      threshold: `מעל ${LARGE_LIFE_COVER_THRESHOLD.toLocaleString()} ₪`,
    },
  ],
}

// ---------------------------------------------------------------------------
// Per-product logics.
// ---------------------------------------------------------------------------

/** Build the market-fee rule for a product that has a threshold configured. */
function feeRule(product: ProductType): ControlRule[] {
  const t = MARKET_FEE_THRESHOLDS[product]
  if (!t) return []
  const parts: string[] = []
  if (t.fromDeposit !== null) parts.push(`מהפקדה עד ${pct(t.fromDeposit)}`)
  if (t.fromAccumulation !== null) parts.push(`מצבירה עד ${pct(t.fromAccumulation)}`)
  return [
    {
      condition: 'דמי ניהול גבוהים מהמקובל בשוק למוצר',
      severity: 'attention',
      category: 'cost',
      basedOn: 'דמי הניהול בקובץ המסלקה מול ספי שוק לפי סוג המוצר',
      threshold: parts.join(' · '),
    },
    {
      condition: 'דמי ניהול מצבירה גבוהים מהממוצע למצטרפי הקופה',
      severity: 'attention',
      category: 'cost',
      basedOn: 'דמי ניהול מדווחים מול ממוצע הקופה בנתוני האוצר',
      threshold: `מעל הממוצע ביותר מ-${FEE_ABOVE_FUND_AVG_TOLERANCE} נק׳ אחוז`,
    },
    {
      condition: 'דמי הניהול בפועל גבוהים מדמי הניהול שסוכמו בהסכם',
      severity: 'gap',
      category: 'cost',
      basedOn: 'דמי ניהול בפועל מול הסכם דמי הניהול שהוזן',
    },
  ]
}

export const PRODUCT_RULE_GROUPS: RuleGroup[] = [
  {
    key: 'pension',
    title: 'קרן פנסיה',
    subtitle: 'דמי ניהול, קצבה צפויה וכיסויי שאירים',
    rules: [
      ...feeRule('pension'),
      {
        condition: 'הקצבה החודשית הצפויה נמוכה מיחס סביר מול השכר',
        severity: 'attention',
        category: 'retirement',
        basedOn: 'קצבה צפויה מדווחת מול השכר האפקטיבי',
        threshold: `מתחת ל-${pct(PENSION_TO_SALARY_MIN_RATIO * 100)} מהשכר`,
      },
    ],
  },
  {
    key: 'managers',
    title: 'ביטוח מנהלים',
    subtitle: 'דמי ניהול ותקרת הפקדה לקרן מקיפה',
    rules: [
      ...feeRule('managers'),
      {
        condition: 'השכר חורג מתקרת ההפקדה המזכה לקרן פנסיה מקיפה — כדאי לבחון פיצול שכבות',
        severity: 'info',
        category: 'insight',
        basedOn: 'השכר האפקטיבי מול תקרת השכר להפקדה מקיפה',
        threshold: `תקרה ≈ ${MEKIFA_SALARY_CAP.toLocaleString()} ₪`,
      },
    ],
  },
  {
    key: 'gemel',
    title: 'קופת גמל וגמל להשקעה',
    subtitle: 'בקרת דמי ניהול מול השוק ומול הקופה',
    rules: feeRule('gemel'),
  },
  {
    key: 'education',
    title: 'קרן השתלמות',
    subtitle: 'דמי ניהול ונזילות',
    rules: [
      ...feeRule('education'),
      {
        condition: 'הקרן הפכה נזילה — ניתן למשוך את הכספים ללא אירוע מס',
        severity: 'info',
        category: 'insight',
        basedOn: 'ותק הקרן ממועד הפתיחה',
        threshold: `נזילות אחרי ${EDUCATION_FUND_LIQUIDITY_YEARS} שנים`,
      },
    ],
  },
  {
    key: 'incomeProtection',
    title: 'אובדן כושר עבודה',
    subtitle: 'שיעור הכיסוי והתאמת השכר המבוטח',
    rules: [
      {
        condition: 'לא אותר כיסוי לאובדן כושר עבודה במוצרים שנותחו (מחמיר כשהמשפחה מסתמכת על ההכנסה)',
        severity: 'attention',
        category: 'insurance',
        basedOn: 'כיסויי הנכות בכל הפוליסות הפעילות',
      },
      {
        condition: 'שיעור כיסוי אכ"ע נמוך מהיעד המקובל',
        severity: 'attention',
        category: 'insurance',
        basedOn: 'שיעור הכיסוי לנכות בפוליסה',
        threshold: `יעד ${pct(IP_TARGET_COVERAGE_PERCENT)} (מרווח ${IP_COVERAGE_PERCENT_SLACK} נק׳)`,
      },
      {
        condition: 'השכר המבוטח לאכ"ע נמוך מהשכר בפועל',
        severity: 'gap',
        category: 'insurance',
        basedOn: 'השכר המבוטח לנכות מול השכר האפקטיבי',
        threshold: `מתחת ל-${pct(IP_COVERED_SALARY_RATIO * 100)} מהשכר`,
      },
    ],
  },
]

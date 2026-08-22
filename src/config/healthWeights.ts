// Weights for the portfolio health score (מדד בריאות התיק). Each dimension
// contributes a 0–100 sub-score to a weighted average. Weights are percents and
// are renormalized over the dimensions that actually have data, so a missing
// input (e.g. no salary → no replacement ratio) never silently drags the score
// down. Editable in the Logic Editor.

export type HealthDimensionKey =
  | 'retirement'
  | 'coverage'
  | 'fees'
  | 'exposure'
  | 'findings'
  | 'completeness'

export type HealthWeights = Record<HealthDimensionKey, number>

export const DEFAULT_HEALTH_WEIGHTS: HealthWeights = {
  retirement: 30,
  coverage: 25,
  fees: 15,
  exposure: 10,
  findings: 15,
  completeness: 5,
}

export interface HealthDimensionMeta {
  key: HealthDimensionKey
  label: string
  hint: string
}

// Order + copy for the editor and the "i" tooltip.
export const HEALTH_DIMENSIONS: HealthDimensionMeta[] = [
  { key: 'retirement', label: 'יחס תחלופה', hint: 'הקצבה הצפויה כאחוז מהשכר, מול היעד' },
  { key: 'coverage', label: 'כיסויים ביטוחיים', hint: 'אכ"ע, שאירים ומוות — פערים מול הצורך' },
  { key: 'fees', label: 'דמי ניהול', hint: 'עלויות התיק מול השוק' },
  { key: 'exposure', label: 'חשיפה לגיל', hint: 'רכיב מנייתי מול מסלול מתאים לגיל' },
  { key: 'findings', label: 'ממצאים פתוחים', hint: 'שאר ההארות, משוקלל לפי חומרה' },
  { key: 'completeness', label: 'שלמות נתונים', hint: 'כמה מהבדיקות בכלל התאפשרו' },
]

export function cloneHealthWeights(w: HealthWeights): HealthWeights {
  return { ...w }
}

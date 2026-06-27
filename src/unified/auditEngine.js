// ============================================================
// Management Fees Audit
// ============================================================

export function auditManagementFees(row, agreements) {
  const { issuer, feeFromPremium, feeFromAccumulation } = row

  if (!issuer) return { feeStatus: 'invalid', feeReason: 'חסר שם יצרן' }

  const relevant = agreements.filter(a => a.issuer === issuer)
  if (!relevant.length) return { feeStatus: 'no_agreement', feeReason: 'אין הסכם' }

  // If multiple models (tiers), use the best (lowest) agreement
  let bestPremium = null
  let bestAccum = null
  for (const ag of relevant) {
    if (ag.feeFromPremium != null && (bestPremium === null || ag.feeFromPremium < bestPremium))
      bestPremium = ag.feeFromPremium
    if (ag.feeFromAccumulation != null && (bestAccum === null || ag.feeFromAccumulation < bestAccum))
      bestAccum = ag.feeFromAccumulation
  }

  const premiumOk = bestPremium == null || feeFromPremium == null || feeFromPremium <= bestPremium + 0.001
  const accumOk = bestAccum == null || feeFromAccumulation == null || feeFromAccumulation <= bestAccum + 0.001

  if (premiumOk && accumOk) return { feeStatus: 'ok', feeReason: null, agreedPremium: bestPremium, agreedAccum: bestAccum }

  const reasons = []
  if (!premiumOk) reasons.push(`מפרמיה: ${feeFromPremium}% > הסכם ${bestPremium}%`)
  if (!accumOk) reasons.push(`מצבירה: ${feeFromAccumulation}% > הסכם ${bestAccum}%`)
  return { feeStatus: 'overpaying', feeReason: reasons.join(' | '), agreedPremium: bestPremium, agreedAccum: bestAccum }
}

// ============================================================
// Insurance Track Audit
// ============================================================

export function isVeteranFund(planType) {
  if (!planType) return false
  return String(planType).includes('ותיקה')
}

export function auditInsuranceTrack(row) {
  const { planType, section14, compensationPension, clientChoice } = row

  if (isVeteranFund(planType)) return { insuranceStatus: 'not_applicable', insuranceReason: 'קרן ותיקה' }

  if (section14 === null || section14 === undefined) {
    return { insuranceStatus: 'missing', insuranceReason: 'חסר מידע על ס׳14' }
  }

  if (!section14) return { insuranceStatus: 'ok', insuranceReason: null }

  // section14 = true
  if (compensationPension === true) {
    return { insuranceStatus: 'ok', insuranceReason: 'ס׳14 + פנסיית פיצויים' }
  }

  return { insuranceStatus: 'suspicious', insuranceReason: 'ס׳14 ללא פנסיית פיצויים' }
}

// Merge multiple rows per employee — worst status wins
export function mergeEmployeeInsuranceRows(rows) {
  const STATUS_RANK = { suspicious: 3, missing: 2, ok: 1, not_applicable: 0 }
  const byEmployee = new Map()

  for (const row of rows) {
    const key = row.employeeCode || row.employeeName || '_unknown'
    const audit = auditInsuranceTrack(row)
    const prev = byEmployee.get(key)

    if (!prev || STATUS_RANK[audit.insuranceStatus] > STATUS_RANK[prev.insuranceStatus]) {
      byEmployee.set(key, {
        employeeCode: row.employeeCode,
        employeeName: row.employeeName,
        issuer: row.issuer,
        ...audit,
        fundCount: 1,
      })
    } else {
      prev.fundCount = (prev.fundCount || 1) + 1
    }
  }

  return [...byEmployee.values()]
}

// ============================================================
// Investment Track Audit
// ============================================================

const TRACK_CATEGORIES = [
  { category: 'AGE_BASED', label: 'מבוסס גיל', keywords: ['גיל', 'age', 'lifecycle', 'תלוי גיל', 'מותאם גיל'] },
  { category: 'STOCKS', label: 'מניות', keywords: ['מניות', 'stocks', 'equity', 'אקוויטי', 'מניה'] },
  { category: 'SP500', label: 'S&P 500', keywords: ['s&p', 'sp500', 'sp 500', 'סנופי', 'סנופ'] },
  { category: 'INDEX', label: 'מחקה מדד', keywords: ['מחקה מדד', 'index', 'מדד', 'פסיבי', 'passive'] },
  { category: 'BONDS', label: 'אג"ח', keywords: ['אגח', "אג\"ח", 'bonds', 'bond', 'אגרות חוב', 'obligaciot'] },
  { category: 'SHEKEL', label: 'שקלי', keywords: ['שקלי', 'shekel', 'כספי', 'money market', 'שוק כספי'] },
  { category: 'GENERAL', label: 'כללי', keywords: ['כללי', 'general', 'balanced', 'מאוזן'] },
]

export function categorizeTrack(trackName) {
  if (!trackName) return { category: null, label: 'לא ידוע' }
  const lower = String(trackName).toLowerCase()
  for (const { category, label, keywords } of TRACK_CATEGORIES) {
    if (keywords.some(k => lower.includes(k))) return { category, label }
  }
  return { category: 'GENERAL', label: 'כללי' }
}

export function getAgeGroup(age, birthYear) {
  const currentYear = new Date().getFullYear()
  const effectiveAge = age ?? (birthYear ? currentYear - birthYear : null)
  if (effectiveAge == null) return null
  if (effectiveAge < 40) return 'young'
  if (effectiveAge < 50) return 'middle'
  if (effectiveAge < 60) return 'preretirement'
  return 'retirement'
}

const SUSPICIOUS_BY_AGE = {
  young: ['BONDS', 'SHEKEL'],
  middle: ['SHEKEL'],
  preretirement: ['STOCKS', 'SP500', 'INDEX'],
  retirement: ['STOCKS', 'SP500', 'INDEX'],
}

export function auditInvestmentTrack(row) {
  const { investmentTrack, age, birthYear, clientChoice, section14, compensationPension } = row
  const { category, label } = categorizeTrack(investmentTrack)
  const ageGroup = getAgeGroup(age, birthYear)

  if (!category) return { trackStatus: 'missing', trackReason: 'חסר מסלול השקעה', trackCategory: null, trackLabel: label }

  if (clientChoice === true) {
    return { trackStatus: 'ok', trackReason: 'בחירת לקוח', trackCategory: category, trackLabel: label }
  }

  if (section14 === null) {
    return { trackStatus: 'missing_section14', trackReason: 'נדרש בירור ס׳14', trackCategory: category, trackLabel: label }
  }

  if (ageGroup === null) {
    return { trackStatus: 'ok', trackReason: 'גיל לא ידוע', trackCategory: category, trackLabel: label }
  }

  const suspicious = SUSPICIOUS_BY_AGE[ageGroup] || []
  if (suspicious.includes(category)) {
    return {
      trackStatus: 'suspicious',
      trackReason: `מסלול ${label} לא מתאים לגיל (${ageGroup})`,
      trackCategory: category,
      trackLabel: label,
    }
  }

  // section14=true + פיצויים + not AGE_BASED
  if (section14 === true && compensationPension === true && category !== 'AGE_BASED') {
    return {
      trackStatus: 'suspicious',
      trackReason: 'ס׳14 + פיצויים — מסלול לא מבוסס גיל',
      trackCategory: category,
      trackLabel: label,
    }
  }

  return { trackStatus: 'ok', trackReason: null, trackCategory: category, trackLabel: label }
}

// ============================================================
// Insurance End Age Audit
// ============================================================

export function evaluateInsuranceEndAge(row) {
  const { insuranceEndAge, planType } = row
  if (isVeteranFund(planType)) return { insuranceEndAgeFlag: false, insuranceEndAgeReason: 'קרן ותיקה' }
  if (insuranceEndAge == null) return { insuranceEndAgeFlag: false, insuranceEndAgeReason: null }
  if (insuranceEndAge < 67) {
    return { insuranceEndAgeFlag: true, insuranceEndAgeReason: `תום ביטוח בגיל ${insuranceEndAge} (מתחת ל-67)` }
  }
  return { insuranceEndAgeFlag: false, insuranceEndAgeReason: null }
}

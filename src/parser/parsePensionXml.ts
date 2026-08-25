// Parser for Israeli pension clearinghouse (מסלקה פנסיונית) מבנה אחיד XML.
// Isolated from UI: input is raw XML text, output is typed model objects.

import type {
  Beneficiary,
  Client,
  Contribution,
  Coverage,
  CoverageType,
  ManagersGeneration,
  MonthlyDeposit,
  Policy,
  ProductType,
} from '../models/types'
import { getNumber, getText, mofidFromKidodAchid, normalizeClientId, parseDate } from './xmlUtils'
import { beneficiaryRelationLabels } from '../models/labels'

export class XmlParseError extends Error {}

export interface ParsedFile {
  fileName: string
  client: Client
  policies: Policy[]
}

function mapProductType(
  sugMutzar: string | null,
  hasSavings: boolean,
  hasDeathCoverage: boolean,
  planName: string | null,
): ProductType {
  // SUG-MUTZAR value list per the מבנה אחיד (נספח ערכים):
  // 1=ביטוח חיים משולב חיסכון, 2=קרן פנסיה, 3=קופת גמל, 4=קרן השתלמות,
  // 5=חיסכון טהור, 6=סיכון טהור (ריסק/אכ"ע), 7=ביטוח חיים משכנתא,
  // 8=סיכון טהור קולקטיב, 9=קופת גמל להשקעה, 10=חיסכון לכל ילד.
  switch (sugMutzar) {
    case '2':
      return 'pension'
    case '4':
      return 'education'
    case '9':
      return 'gemelInvestment'
    case '3':
      // גמל להשקעה also shows up under code 3 for some issuers; identify by plan name
      return planName?.includes('להשקעה') ? 'gemelInvestment' : 'gemel'
    case '10':
      return 'gemel' // חיסכון לכל ילד — a gemel savings account
    case '1': // ביטוח חיים משולב חיסכון
    case '5': // פוליסת חיסכון טהור
    case '6': // פוליסת סיכון טהור (ריסק מוות ו/או אכ"ע)
    case '7': // ביטוח חיים משכנתא
    case '8': // פוליסת סיכון טהור קולקטיב
      // Insurance products: distinguish by content
      if (hasSavings) return 'managers'
      if (hasDeathCoverage) return 'life'
      return 'incomeProtection'
    default:
      return 'unknown'
  }
}

function classifyManagersGeneration(openDate: string | null): ManagersGeneration | null {
  if (!openDate) return null
  if (openDate < '2001-06-01') return 'before-2001-06'
  if (openDate < '2004-01-01') return '2001-06-to-2004'
  if (openDate < '2013-01-01') return '2004-to-2013'
  return '2013-plus'
}

function parseClient(yeshutLakoach: Element): Client {
  const firstName = getText(yeshutLakoach, 'SHEM-PRATI')
  const lastName = getText(yeshutLakoach, 'SHEM-MISHPACHA')
  const min = getText(yeshutLakoach, 'MIN')
  return {
    id: normalizeClientId(getText(yeshutLakoach, 'MISPAR-ZIHUY-LAKOACH')),
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(' '),
    birthDate: parseDate(getText(yeshutLakoach, 'TAARICH-LEYDA')),
    gender: min === '1' ? 'male' : min === '2' ? 'female' : null,
    email: getText(yeshutLakoach, 'E-MAIL'),
    phone: getText(yeshutLakoach, 'MISPAR-CELLULARI'),
  }
}

// Maps SUG-KISUY-BITOCHI (מבנה אחיד, נספח ערכים) to our coverage taxonomy.
// null = not a risk coverage we surface (premium waiver / pure savings).
function coverageTypeFromKisuyBituchi(code: string | null): CoverageType | null {
  switch (code) {
    case '1': // כיסוי למקרה מוות
    case '3': // מוות מתאונה
    case '9': // מוות + אכ"ע (פנסיה ותיקה)
      return 'death'
    case '2': // נכות מקצועית
    case '4': // נכות מתאונה
    case '5': // אבדן כושר עבודה (אכ"ע)
      return 'disability'
    case '7': // מחלות קשות
    case '10': // אחר
      return 'other'
    case '6': // שחרור (ויתור על תשלום פרמיה) — לא כיסוי תשלום
    case '8': // תוכנית משולבת חיסכון — חיסכון, לא סיכון
      return null
    default:
      return null
  }
}

// A coverage is active unless it carries an end date that has already passed.
function coverageStatusFromEndDate(endRaw: string | null): 'active' | 'inactive' | null {
  const end = parseDate(endRaw)
  if (!end) return 'active'
  return end < new Date().toISOString().slice(0, 10) ? 'inactive' : 'active'
}

// Sum the capital-status (הון) balance layers: PerutYitraLeTkufa rows whose
// SUG-ITRA-LETKUFA = 1 (1=הון, 2=קצבה משלמת, 3=קצבה לא משלמת). null when none reported.
function parseCapitalBalance(heshbon: Element): number | null {
  let sum = 0
  let found = false
  for (const row of heshbon.querySelectorAll('PerutYitraLeTkufa')) {
    if (getText(row, 'SUG-ITRA-LETKUFA') === '1') {
      const amount = getNumber(row, 'SACH-ITRA-LESHICHVA-BESHACH')
      if (amount !== null) {
        sum += amount
        found = true
      }
    }
  }
  return found ? sum : null
}

// Death sum insured for the capital-at-death picture. Prefers the dedicated
// SCHUM-BITUAH-LEMAVET (מבנה אחיד שדה 396, בבלוק SchumeiBituahYesodi) summed across
// the basic-cover blocks; falls back to summing death-typed coverage amounts.
// IND-SCHUM-BITUAH-KOLEL-CHISACHON (שדה 391) says whether that sum already embeds the
// accumulated savings: '1' ⇒ true, '2' ⇒ false, else null (unknown).
function parseDeathSum(
  heshbon: Element,
  coverages: Coverage[],
): { deathSumInsured: number | null; deathSumIncludesSavings: boolean | null } {
  let sum = 0
  let found = false
  let includesSavings: boolean | null = null
  for (const block of heshbon.querySelectorAll('SchumeiBituahYesodi')) {
    const amount = getNumber(block, 'SCHUM-BITUAH-LEMAVET')
    if (amount !== null && amount > 0) {
      sum += amount
      found = true
    }
    if (includesSavings === null) {
      const flag = getText(block, 'IND-SCHUM-BITUAH-KOLEL-CHISACHON')
      if (flag === '1') includesSavings = true
      else if (flag === '2') includesSavings = false
    }
  }
  if (found) return { deathSumInsured: sum, deathSumIncludesSavings: includesSavings }

  // Fallback: sum the parsed death-type coverages (SCHUM-BITUACH under death codes).
  const fromCoverages = coverages
    .filter((c) => c.type === 'death')
    .reduce((s, c) => s + (c.amount ?? 0), 0)
  return {
    deathSumInsured: fromCoverages > 0 ? fromCoverages : null,
    deathSumIncludesSavings: includesSavings,
  }
}

function parseCoverages(heshbon: Element, policyNumber: string): Coverage[] {
  const coverages: Coverage[] = []

  // Pension fund coverages (disability + survivors)
  for (const kisui of heshbon.querySelectorAll('Kisuim ZihuiKisui')) {
    const name = getText(kisui, 'SHEM-KISUI-YATZRAN')
    const pensionCover = kisui.querySelector('KisuiBKerenPensia')
    if (pensionCover) {
      const coveredSalary = getNumber(pensionCover, 'SACHAR-KOVEA-LE-NECHUT-VE-SHEERIM')
      const disabilityAmount = getNumber(pensionCover, 'SACH-PENSIAT-NECHUT')
      if (disabilityAmount !== null) {
        coverages.push({
          type: 'disability',
          name,
          amount: disabilityAmount,
          percent: getNumber(pensionCover, 'SHEUR-KISUY-NECHUT'),
          coveredSalary,
          cost: getNumber(pensionCover, 'ALUT-KISUI-NECHUT'),
          status: 'active',
          policyNumber,
        })
      }
      // Survivor pensions, itemized per beneficiary type (widow/orphan/dependent parent)
      const widowAmount = getNumber(pensionCover, 'KITZBAT-SHEERIM-LEALMAN-O-ALMANA')
      if (widowAmount !== null) {
        coverages.push({
          type: 'survivors',
          name: 'קצבת שאירים לאלמן/ה',
          amount: widowAmount,
          percent: getNumber(pensionCover, 'SHIUR-KISUY-ALMAN-O-ALMANA'),
          coveredSalary,
          cost: getNumber(pensionCover, 'ALUT-KISUY-SHEERIM'),
          status: 'active',
          policyNumber,
        })
      }
      const orphanAmount = getNumber(pensionCover, 'KITZBAT-SHEERIM-LEYATOM')
      if (orphanAmount !== null) {
        coverages.push({
          type: 'survivors',
          name: 'קצבת שאירים ליתום',
          amount: orphanAmount,
          percent: getNumber(pensionCover, 'SHIUR-KISUY-YATOM'),
          coveredSalary,
          cost: null,
          status: 'active',
          policyNumber,
        })
      }
    }

    // Insurance-company coverages (managers / life): each PirteiKisuiBeMutzar row
    // carries SUG-KISUY-BITOCHI identifying what it insures — death, disability,
    // income protection (אכ"ע), etc. The amount is SCHUM-BITUACH, the premium is
    // DMEI-BITUAH-LETASHLUM-BAPOAL. (Previously we mis-read PirteiTosafot — a rider
    // block with no SCHUM-BITUACH — and hard-coded every row as death coverage.)
    for (const cover of kisui.querySelectorAll('PirteiKisuiBeMutzar')) {
      const type = coverageTypeFromKisuyBituchi(getText(cover, 'SUG-KISUY-BITOCHI'))
      if (type === null) continue // savings / premium-waiver rows are not risk covers
      const amount = getNumber(cover, 'SCHUM-BITUACH')
      // ACHUZ-MESACHAR is the אכ"ע rate of salary. Per the מבנה אחיד it is a decimal
      // fraction (0.75), but many issuers report a whole percent (75) — normalize
      // ≤1 ⇒ ×100. For death it is a salary multiple, so it is left untouched.
      const rawPercent = getNumber(cover, 'ACHUZ-MESACHAR')
      const percent =
        type === 'disability' && rawPercent !== null && rawPercent <= 1
          ? rawPercent * 100
          : rawPercent
      // The insurance side carries no explicit insured salary (SACHAR-KOVEA exists
      // only on the pension side), so derive it: monthly benefit ÷ rate.
      const coveredSalary =
        type === 'disability' && amount !== null && percent !== null && percent > 0
          ? Math.round(amount / (percent / 100))
          : null
      coverages.push({
        type,
        name,
        amount,
        percent,
        coveredSalary,
        cost: getNumber(cover, 'DMEI-BITUAH-LETASHLUM-BAPOAL'),
        status: coverageStatusFromEndDate(getText(cover, 'TAARICH-TOM-KISUY')),
        policyNumber,
      })
    }
  }

  return coverages
}

function parseContributions(heshbon: Element): Contribution[] {
  const contributions: Contribution[] = []
  for (const h of heshbon.querySelectorAll('PerutHafrashotLePolisa')) {
    const sug = getText(h, 'SUG-HAFRASHA')
    const percent = getNumber(h, 'ACHUZ-HAFRASHA')
    // SUG-HAFRASHA: 1=פיצויים, 2=תגמולים עובד, 3=תגמולים מעביד, 6=שונות עובד,
    // 7=שונות מעביד, 8=קה"ש עובד, 9=קה"ש מעביד.
    const role =
      sug === '2' || sug === '8' || sug === '6'
        ? 'employee'
        : sug === '3' || sug === '9' || sug === '7'
          ? 'employer'
          : sug === '1'
            ? 'severance'
            : 'other'
    contributions.push({ role, percent })
  }
  return contributions
}

function parseBeneficiaries(heshbon: Element): Beneficiary[] {
  const beneficiaries: Beneficiary[] = []
  // The same beneficiary is often repeated across sub-accounts/tracks (one Mutav
  // block each), producing identical rows. Collapse rows that match on identity
  // and allocation so the same beneficiary/percent is shown only once.
  const seen = new Set<string>()
  for (const mutav of heshbon.querySelectorAll('Mutav')) {
    const first = getText(mutav, 'SHEM-PRATI-MUTAV')
    const last = getText(mutav, 'SHEM-MISHPACHA-MUTAV')
    // SUG-ZIHUY-MUTAV is the beneficiary identity type (פרטי / תאגיד / יורשים חוקיים…),
    // per the מבנה אחיד — the standard carries no kinship field. Code 7 = "no
    // beneficiaries set by the client", so it is not a real beneficiary row.
    const relationCode = getText(mutav, 'SUG-ZIHUY-MUTAV')
    if (relationCode === '7') continue
    const name = [first, last].filter(Boolean).join(' ') || null
    const relation = relationCode ? (beneficiaryRelationLabels[relationCode] ?? relationCode) : null
    if (name || relation) {
      const allocationPercent = getNumber(mutav, 'ACHUZ-MUTAV')
      const key = `${name ?? ''}|${relation ?? ''}|${allocationPercent ?? ''}`
      if (seen.has(key)) continue
      seen.add(key)
      beneficiaries.push({ name, relation, allocationPercent })
    }
  }
  return beneficiaries
}

export function parsePensionXml(xmlText: string, fileName: string): ParsedFile {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml')

  if (doc.querySelector('parsererror')) {
    throw new XmlParseError(`הקובץ "${fileName}" אינו קובץ XML תקין`)
  }
  if (!doc.querySelector('Mimshak')) {
    throw new XmlParseError(`הקובץ "${fileName}" אינו בפורמט מסלקה פנסיונית (חסר אלמנט Mimshak)`)
  }

  const managingCompany = getText(doc, 'YeshutYatzran > SHEM-YATZRAN')
  const mutzarim = doc.querySelectorAll('Mutzar')
  if (mutzarim.length === 0) {
    throw new XmlParseError(`הקובץ "${fileName}" ריק — לא נמצאו מוצרים`)
  }

  let client: Client | null = null
  const policies: Policy[] = []

  for (const mutzar of mutzarim) {
    const netunei = mutzar.querySelector('NetuneiMutzar')
    const sugMutzar = getText(netunei, 'SUG-MUTZAR')

    const yeshutLakoach = netunei?.querySelector('YeshutLakoach')
    if (yeshutLakoach) {
      const parsed = parseClient(yeshutLakoach)
      if (client && client.id && parsed.id && client.id !== parsed.id) {
        throw new XmlParseError(
          `בקובץ "${fileName}" נמצאו מספרי זהות שונים (${client.id}, ${parsed.id}). יש להעלות קבצים של לקוח אחד בלבד.`,
        )
      }
      client = client ?? parsed
    }

    for (const heshbon of mutzar.querySelectorAll('HeshbonOPolisa')) {
      const policyNumber = getText(heshbon, 'MISPAR-POLISA-O-HESHBON') ?? ''

      // The same track appears once per contribution type — merge rows by track name
      const trackRows = [...heshbon.querySelectorAll('PerutMasluleiHashkaa')].map((m) => ({
        name: getText(m, 'SHEM-MASLUL-HASHKAA'),
        value: getNumber(m, 'SCHUM-TZVIRA-BAMASLUL'),
        depositPercent: getNumber(m, 'ACHUZ-HAFKADA-LEHASHKAA'),
        returnNet: getNumber(m, 'TSUA-NETO'),
        feeFromDeposit: getNumber(m, 'SHEUR-DMEI-NIHUL-HAFKADA'),
        feeFromAccumulation: getNumber(m, 'SHEUR-DMEI-NIHUL-HISACHON'),
      }))
      const trackByName = new Map<string, (typeof trackRows)[number]>()
      for (const row of trackRows) {
        const key = row.name ?? `#${trackByName.size}`
        const existing = trackByName.get(key)
        if (!existing) {
          trackByName.set(key, { ...row })
        } else {
          existing.value = (existing.value ?? 0) + (row.value ?? 0)
          existing.depositPercent = (existing.depositPercent ?? 0) + (row.depositPercent ?? 0)
          existing.returnNet = existing.returnNet ?? row.returnNet
          existing.feeFromDeposit = existing.feeFromDeposit ?? row.feeFromDeposit
          existing.feeFromAccumulation = existing.feeFromAccumulation ?? row.feeFromAccumulation
        }
      }
      const tracks = [...trackByName.values()]
      const currentValue = tracks.reduce((sum, t) => sum + (t.value ?? 0), 0) || null

      const planName = getText(heshbon, 'SHEM-TOCHNIT')
      const coverages = parseCoverages(heshbon, policyNumber)
      const hasDeathCoverage = coverages.some((c) => c.type === 'death' || c.type === 'survivors')
      const { deathSumInsured, deathSumIncludesSavings } = parseDeathSum(heshbon, coverages)
      const productType = mapProductType(sugMutzar, (currentValue ?? 0) > 0, hasDeathCoverage, planName)

      // Fees: SUG-HOTZAA 1 = from accumulation, 2 = from deposit
      // (verified against sample files: hishtalmut reports 0.60% under code 1,
      // matching the track-level SHEUR-DMEI-NIHUL-HISACHON)
      let feeFromDeposit: number | null = null
      let feeFromAccumulation: number | null = null
      for (const fee of heshbon.querySelectorAll('PerutMivneDmeiNihul')) {
        const sug = getText(fee, 'SUG-HOTZAA')
        const value = getNumber(fee, 'SHEUR-DMEI-NIHUL')
        if (sug === '1' && feeFromAccumulation === null) feeFromAccumulation = value
        if (sug === '2' && feeFromDeposit === null) feeFromDeposit = value
      }

      // Deposits: last deposit + monthly rows (aggregated per salary month)
      const lastDepositRaw = getText(heshbon, 'PerutPirteiHafkadaAchrona > TAARICH-HAFKADA-ACHARON')
      const lastDepositMonth =
        lastDepositRaw && /^\d{6}/.test(lastDepositRaw)
          ? `${lastDepositRaw.slice(0, 4)}-${lastDepositRaw.slice(4, 6)}`
          : null
      const lastDepositTotal = getNumber(heshbon, 'PerutPirteiHafkadaAchrona > TOTAL-HAFKADA')

      const depositsByMonth = new Map<string, number>()
      for (const row of heshbon.querySelectorAll('PerutHafkadotMetchilatShana')) {
        const monthRaw = getText(row, 'CHODESH-SACHAR')
        const amount = getNumber(row, 'SCHUM-HAFKADA-SHESHULAM')
        if (!monthRaw || !/^\d{6}$/.test(monthRaw) || amount === null) continue
        const month = `${monthRaw.slice(0, 4)}-${monthRaw.slice(4, 6)}`
        depositsByMonth.set(month, (depositsByMonth.get(month) ?? 0) + amount)
      }
      const monthlyDeposits: MonthlyDeposit[] = [...depositsByMonth.entries()]
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))

      const yitra = heshbon.querySelector('YitraLefiGilPrisha')
      const openDate = parseDate(
        getText(heshbon, 'TAARICH-HITZTARFUT-MUTZAR') ?? getText(heshbon, 'TAARICH-HITZTARFUT-RISHON'),
      )

      const statusRaw = getText(heshbon, 'STATUS-POLISA-O-CHESHBON')

      policies.push({
        policyNumber,
        productType,
        productName: planName,
        managingCompany,
        mofid: mofidFromKidodAchid(getText(heshbon, 'KIDOD-ACHID')),
        openDate,
        status: statusRaw === '1' ? 'active' : statusRaw ? 'inactive' : null,
        statusCode: statusRaw,
        // ACHUZ-HAKTZAA-LE-CHISACHON — savings allocation share (e.g. 100% vs 90%),
        // relevant for old managers policies where part of the premium funds riders.
        savingsAllocationPercent: getNumber(
          heshbon,
          'SchumeiBituahYesodi ACHUZ-HAKTZAA-LE-CHISACHON',
        ),
        capitalBalance: parseCapitalBalance(heshbon),
        // STATUS-POLISA-O-CHESHBON 4 = ריסק זמני, 8 = ריסק זמני אוטומטי:
        // deposits stopped but risk coverage is kept temporarily from the accumulation.
        temporaryRisk: statusRaw === '4' || statusRaw === '8',
        currentValue,
        deathSumInsured,
        deathSumIncludesSavings,
        coveredSalary: getNumber(heshbon, 'PirteiHaasaka > SACHAR-POLISA'),
        // קצבה חודשית חזויה: עם המשך הפקדות מול ללא הפקדות (שני שדות נפרדים בדיווח)
        expectedPensionWithDeposits: getNumber(yitra, 'SCHUM-KITZVAT-ZIKNA'),
        expectedPensionWithoutDeposits: getNumber(yitra, 'KITZVAT-HODSHIT-TZFUYA'),
        // צבירה חזויה לפרישה: עם/ללא הפקדות (עם נפילה חזרה לשדות ה-LEKITZBA המפורשים)
        expectedAccumulationWithDeposits:
          getNumber(yitra, 'TOTAL-CHISACHON-MITZTABER-TZAFUY') ??
          getNumber(yitra, 'TOTAL-SCHUM-MTZBR-TZAFUY-LEGIL-PRISHA-MECHUSHAV-LEKITZBA-IM-PREMIYOT'),
        expectedAccumulationWithoutDeposits:
          getNumber(yitra, 'TZVIRAT-CHISACHON-CHAZUYA-LELO-PREMIYOT') ??
          getNumber(yitra, 'TOTAL-SCHUM-MITZVTABER-TZFUY-LEGIL-PRISHA-MECHUSHAV-HAMEYOAD-LEKITZBA-LELO-PREMIYOT'),
        retirementAge: getNumber(yitra, 'GIL-PRISHA'),
        fees: { fromDeposit: feeFromDeposit, fromAccumulation: feeFromAccumulation },
        netReturn: getNumber(heshbon, 'Tsua > SHEUR-TSUA-NETO'),
        investmentTracks: tracks,
        coverages,
        contributions: parseContributions(heshbon),
        beneficiaries: parseBeneficiaries(heshbon),
        managersGeneration:
          productType === 'managers' ? classifyManagersGeneration(openDate) : null,
        // Guaranteed annuity coefficients were abolished for policies opened from
        // Jan 2013. Insurers still populate MEKADEM-MOVTACH-LEPRISHA with an
        // illustrative coefficient on newer policies, so a positive value alone
        // isn't proof — a policy opened in 2013+ cannot carry a guaranteed factor.
        hasGuaranteedFactor:
          (getNumber(yitra, 'MEKADEM-MOVTACH-LEPRISHA') ?? 0) > 0 &&
          (openDate === null || openDate < '2013-01-01'),
        reportDate: parseDate(getText(heshbon, 'TAARICH-NECHONUT')),
        lastDepositMonth,
        lastDepositTotal,
        monthlyDeposits,
        survivorsWaiver: (() => {
          // VITUR-KISUY-BITUCHI: 1=waived, 2=not waived; SUG-VITOR-SHAERIM > 0 also indicates waiver
          const vitur = getText(heshbon, 'VITUR-KISUY-BITUCHI')
          const sugVitor = getNumber(heshbon, 'SUG-VITOR-SHAERIM')
          if (vitur === null && sugVitor === null) return null
          return vitur === '1' || (sugVitor !== null && sugVitor > 0)
        })(),
        sourceFileName: fileName,
      })
    }
  }

  if (!client || !client.id) {
    throw new XmlParseError(`בקובץ "${fileName}" לא נמצאו פרטי לקוח (מספר זהות)`)
  }

  return { fileName, client, policies }
}

import { normalizeIssuer } from '../utils/issuerAliases.js'

/**
 * Get text content of first matching child element.
 * Returns null if element not found or has xsi:nil="true".
 */
function getText(parent, tag) {
  if (!parent) return null
  const el = parent.querySelector(tag)
  if (!el) return null
  if (el.getAttribute('xsi:nil') === 'true') return null
  const text = el.textContent?.trim()
  return text === '' ? null : text
}

function parseDate(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length < 8) return null
  const y = parseInt(yyyymmdd.slice(0, 4), 10)
  const m = parseInt(yyyymmdd.slice(4, 6), 10)
  const d = parseInt(yyyymmdd.slice(6, 8), 10)
  return `${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`
}

function calcAge(birthDateStr) {
  if (!birthDateStr || birthDateStr.length < 8) return null
  const year = parseInt(birthDateStr.slice(0, 4), 10)
  const now = new Date()
  return now.getFullYear() - year
}

function mapProductType(sugMutzar) {
  switch (String(sugMutzar).trim()) {
    case '1': return 'bituach_menahalim'
    case '2': return 'pension'
    case '3': return 'gemul'
    case '4': return 'hishtalmut'
    default: return 'pension'
  }
}

/**
 * Parse XML string of Israeli pension "מימשק XML" format.
 * Returns array of unified row objects (one per HeshbonOPolisa).
 */
export function parseXmlPension(xmlText) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlText, 'text/xml')

  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    throw new Error('XML parse error: ' + parseError.textContent?.slice(0, 200))
  }

  // Report date
  const reportDate = getText(doc, 'TAARICH-BITZUA')

  // Issuer name
  const rawIssuer = getText(doc, 'SHEM-YATZRAN')
  const issuer = normalizeIssuer(rawIssuer)

  const rows = []

  const mutzarim = doc.querySelectorAll('Mutzar')
  for (const mutzar of mutzarim) {
    const netunei = mutzar.querySelector('NetuneiMutzar')

    const sugMutzar = getText(netunei, 'SUG-MUTZAR')
    const productType = mapProductType(sugMutzar)

    // Employer
    const yeshutMaasik = netunei?.querySelector('YeshutMaasik')
    const employerName = getText(yeshutMaasik, 'SHEM-MAASIK')
    const employerId = getText(yeshutMaasik, 'MISPAR-MEZAHE-MAASIK')

    // Client
    const yeshutLakoach = netunei?.querySelector('YeshutLakoach')
    const clientId = getText(yeshutLakoach, 'MISPAR-ZIHUY-LAKOACH')
    const firstName = getText(yeshutLakoach, 'SHEM-PRATI')
    const lastName = getText(yeshutLakoach, 'SHEM-MISHPACHA')
    const clientName = [firstName, lastName].filter(Boolean).join(' ')
    const birthDateRaw = getText(yeshutLakoach, 'TAARICH-LEYDA')
    const birthDate = parseDate(birthDateRaw)
    const birthYear = birthDateRaw ? parseInt(birthDateRaw.slice(0, 4), 10) : null
    const age = calcAge(birthDateRaw)

    const heshbonot = mutzar.querySelectorAll('HeshbonOPolisa')
    for (const heshbon of heshbonot) {
      const policyNumber = getText(heshbon, 'MISPAR-POLISA-O-HESHBON')
      const planName = getText(heshbon, 'SHEM-TOCHNIT')
      const pensiaType = getText(heshbon, 'PENSIA-VATIKA-O-HADASHA')
      const isVetika = pensiaType === '1'
      const statusRaw = getText(heshbon, 'STATUS-POLISA-O-CHESHBON')
      const status = statusRaw === '1' ? 'active' : 'inactive'

      const maslulBituach = heshbon.querySelector('MaslulBituach')
      const insuranceTrackName = getText(maslulBituach, 'SHEM-MASLUL-HABITUAH')

      // Work terms
      const pirteiHaasaka = heshbon.querySelector('PirteiHaasaka')
      const seif14Raw = getText(pirteiHaasaka, 'SEIF-14')
      const section14 = seif14Raw === '1' ? true : seif14Raw === '2' ? false : null
      const salary = parseFloat(getText(pirteiHaasaka, 'SACHAR-POLISA')) || null
      const zakautRaw = getText(pirteiHaasaka, 'ZAKAUT-LELO-TNAI')
      const unconditionalEntitlement = zakautRaw === '1' ? true : zakautRaw === '2' ? false : null

      // Deposits
      let depositEmployeePercent = null
      let depositEmployerPercent = null
      let depositPitzuimPercent = null

      const hafrashot = heshbon.querySelectorAll('PerutHafrashotLePolisa')
      for (const h of hafrashot) {
        const sugHafrasha = getText(h, 'SUG-HAFRASHA')
        const achuz = parseFloat(getText(h, 'ACHUZ-HAFRASHA')) || null
        // SUG-HAFRASHA: 1=pitzuim, 2=tagmulim-oved, 3=tagmulim-maavid, 8=hishtalmut-oved, 9=hishtalmut-maavid
        if (sugHafrasha === '2' || sugHafrasha === '8') {
          depositEmployeePercent = achuz
        } else if (sugHafrasha === '3' || sugHafrasha === '9') {
          depositEmployerPercent = achuz
        } else if (sugHafrasha === '1') {
          depositPitzuimPercent = achuz
        }
      }

      // Investment tracks
      const maslulimEls = heshbon.querySelectorAll('PerutMasluleiHashkaa')
      const investmentTracks = []
      for (const m of maslulimEls) {
        investmentTracks.push({
          name: getText(m, 'SHEM-MASLUL-HASHKAA'),
          accumulation: parseFloat(getText(m, 'SCHUM-TZVIRA-BAMASLUL')) || null,
          feeFromPremium: parseFloat(getText(m, 'SHEUR-DMEI-NIHUL-HAFKADA')) || null,
          feeFromAccumulation: parseFloat(getText(m, 'SHEUR-DMEI-NIHUL-HISACHON')) || null,
          depositPercent: parseFloat(getText(m, 'ACHUZ-HAFKADA-LEHASHKAA')) || null,
          returnNet: parseFloat(getText(m, 'TSUA-NETO')) || null,
        })
      }

      // Aggregated fields (from first/main track)
      const mainTrack = investmentTracks[0] || {}
      const investmentTrack = mainTrack.name || null
      const feeFromPremium = mainTrack.feeFromPremium ?? null
      const feeFromAccumulation = mainTrack.feeFromAccumulation ?? null
      const accumulation = investmentTracks.reduce((sum, t) => sum + (t.accumulation || 0), 0) || null

      // Overall net return
      const tsua = heshbon.querySelector('Tsua')
      const returnNet = parseFloat(getText(tsua, 'SHEUR-TSUA-NETO')) || mainTrack.returnNet || null

      rows.push({
        // Client
        clientId,
        clientName,
        birthDate,
        birthYear,
        age,
        // Employer
        employerName,
        employerId,
        // Issuer
        issuer,
        // Product
        policyNumber,
        planName,
        productType,
        isVetika,
        status,
        // Insurance
        insuranceTrackName,
        // Work terms
        section14,
        salary,
        unconditionalEntitlement,
        // Deposits
        depositEmployeePercent,
        depositEmployerPercent,
        depositPitzuimPercent,
        // Investment tracks
        investmentTracks,
        // Aggregated
        investmentTrack,
        feeFromPremium,
        feeFromAccumulation,
        accumulation,
        returnNet,
        // Report date
        reportDate,
      })
    }
  }

  return rows
}

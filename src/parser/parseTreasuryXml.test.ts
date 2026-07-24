import { describe, expect, it } from 'vitest'
import { parseTreasuryXml } from './parseTreasuryXml'

// All ids, names and figures below are synthetic placeholders — never real data.

const returnsFile = `<ROWSET><Row>
  <ID>7001</ID><SHM_KUPA>קרן בדיקה</SHM_KUPA><SHM_HEVRA_MENAHELET>חברה</SHM_HEVRA_MENAHELET>
  <SHIUR_DMEI_NIHUL_AHARON>0.53</SHIUR_DMEI_NIHUL_AHARON>
  <TSUA_MITZTABERET_LETKUFA>15.00</TSUA_MITZTABERET_LETKUFA>
  <SHARP_RIBIT_HASRAT_SIKUN>0.80</SHARP_RIBIT_HASRAT_SIKUN>
  <AD_TKUFAT_DIVUACH>202605</AD_TKUFAT_DIVUACH>
</Row><Row>
  <ID>9999</ID><SHM_KUPA>לא בתיק</SHM_KUPA><TSUA_MITZTABERET_LETKUFA>10</TSUA_MITZTABERET_LETKUFA>
</Row></ROWSET>`

const allocationFile = `<ROWSET><Row>
  <ID_KUPA>7001</ID_KUPA><TKF_DIVUACH>202605</TKF_DIVUACH>
  <KVUTZAT_NECHASIM>חלוקת נכסים ל-9 קבוצות ראשיות</KVUTZAT_NECHASIM>
  <SHM_SUG_NECHES>מניות</SHM_SUG_NECHES><ACHUZ_SUG_NECHES>28.00</ACHUZ_SUG_NECHES>
</Row><Row>
  <ID_KUPA>7001</ID_KUPA><TKF_DIVUACH>202605</TKF_DIVUACH>
  <KVUTZAT_NECHASIM>חשיפות</KVUTZAT_NECHASIM>
  <SHM_SUG_NECHES>חשיפה למניות</SHM_SUG_NECHES><ACHUZ_SUG_NECHES>50</ACHUZ_SUG_NECHES>
</Row></ROWSET>`

// Companies (hevrot / ביטוח-נט) format: uppercase <ROW>, ID_GUF/SHEM_GUF field names
const companiesFile = `<ROWSET><ROW>
  <ID_GUF>7003</ID_GUF><SHEM_GUF>מנהלים כללי</SHEM_GUF>
  <SHIUR_D_NIHUL_NECHASIM>0.82</SHIUR_D_NIHUL_NECHASIM><SHIUR_D_NIHUL_HAFKADOT>1.10</SHIUR_D_NIHUL_HAFKADOT>
  <TSUA_MITZ_LE_TKUFA>9</TSUA_MITZ_LE_TKUFA>
  <TSUA_SHNATIT_MEMUZAAT_3_SHANIM>8.50</TSUA_SHNATIT_MEMUZAAT_3_SHANIM>
  <STIAT_TEKEN_36_HODASHIM>1.50</STIAT_TEKEN_36_HODASHIM>
  <SHARP_RIBIT_HASRAT_SIKUN>1.00</SHARP_RIBIT_HASRAT_SIKUN>
  <AD_TKUFAT_DIVUACH>202606</AD_TKUFAT_DIVUACH>
</ROW><ROW>
  <ID_GUF>9999</ID_GUF><SHEM_GUF>לא בתיק</SHEM_GUF><TSUA_MITZ_LE_TKUFA>4</TSUA_MITZ_LE_TKUFA>
</ROW></ROWSET>`

describe('parseTreasuryXml', () => {
  const portfolio = new Set(['7001', '7002', '7003'])

  it('detects a returns file and keeps only portfolio mofids', () => {
    const out = parseTreasuryXml(returnsFile, 'kupot_58.xml', portfolio)
    expect(out.type).toBe('returns')
    expect(out.funds).toHaveLength(1)
    expect(out.funds[0]).toMatchObject({ mofid: '7001', return12m: 15, sharpe: 0.8 })
  })

  it('detects an allocation file and keeps only the main 9-group breakdown', () => {
    const out = parseTreasuryXml(allocationFile, 'kupot_59.xml', portfolio)
    expect(out.type).toBe('allocation')
    expect(out.allocations).toHaveLength(1)
    expect(out.allocations[0].groups).toEqual([{ name: 'מניות', percent: 28 }])
  })

  it('parses the companies (hevrot / מנהלים) returns format with uppercase ROW', () => {
    const out = parseTreasuryXml(companiesFile, 'hevrot_25.xml', portfolio)
    expect(out.type).toBe('returns')
    expect(out.funds).toHaveLength(1)
    expect(out.funds[0]).toMatchObject({
      mofid: '7003',
      name: 'מנהלים כללי',
      avgFeeFromAccumulation: 0.82,
      avgFeeFromDeposit: 1.1,
      return12m: 9,
      return3yAnnualized: 8.5,
      sharpe: 1.0,
      periodTo: '202606',
    })
  })

  it('parses the pension (פנסיה-נט) returns format: uppercase ROW, ID, SHM_KRN name', () => {
    const pensionFile = `<ROWSET><ROW>
      <ID>7004</ID><SHM_KRN>קרן פנסיה לדוגמה</SHM_KRN><SHM_HEVRA_MENAHELET>חברה לדוגמה</SHM_HEVRA_MENAHELET>
      <TSUA_MITZTABERET_LETKUFA>11.00</TSUA_MITZTABERET_LETKUFA>
      <SHARP_RIBIT_HASRAT_SIKUN>0.90</SHARP_RIBIT_HASRAT_SIKUN>
      <AD_TKUFAT_DIVUACH>202606</AD_TKUFAT_DIVUACH>
    </ROW></ROWSET>`
    const out = parseTreasuryXml(pensionFile, 'PensiaNet_15.xml', new Set(['7004']))
    expect(out.type).toBe('returns')
    expect(out.funds[0]).toMatchObject({
      mofid: '7004',
      name: 'קרן פנסיה לדוגמה',
      managingCompany: 'חברה לדוגמה',
      return12m: 11,
      sharpe: 0.9,
    })
  })

  it('reports unknown format', () => {
    expect(parseTreasuryXml('<foo/>', 'x.xml', portfolio).type).toBe('unknown')
  })
})

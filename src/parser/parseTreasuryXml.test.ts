import { describe, expect, it } from 'vitest'
import { parseTreasuryXml } from './parseTreasuryXml'

const returnsFile = `<ROWSET><Row>
  <ID>1093</ID><SHM_KUPA>קרן בדיקה</SHM_KUPA><SHM_HEVRA_MENAHELET>חברה</SHM_HEVRA_MENAHELET>
  <SHIUR_DMEI_NIHUL_AHARON>0.53</SHIUR_DMEI_NIHUL_AHARON>
  <TSUA_MITZTABERET_LETKUFA>15.03</TSUA_MITZTABERET_LETKUFA>
  <SHARP_RIBIT_HASRAT_SIKUN>0.76</SHARP_RIBIT_HASRAT_SIKUN>
  <AD_TKUFAT_DIVUACH>202605</AD_TKUFAT_DIVUACH>
</Row><Row>
  <ID>9999</ID><SHM_KUPA>לא בתיק</SHM_KUPA><TSUA_MITZTABERET_LETKUFA>10</TSUA_MITZTABERET_LETKUFA>
</Row></ROWSET>`

const allocationFile = `<ROWSET><Row>
  <ID_KUPA>1093</ID_KUPA><TKF_DIVUACH>202605</TKF_DIVUACH>
  <KVUTZAT_NECHASIM>חלוקת נכסים ל-9 קבוצות ראשיות</KVUTZAT_NECHASIM>
  <SHM_SUG_NECHES>מניות</SHM_SUG_NECHES><ACHUZ_SUG_NECHES>28.27</ACHUZ_SUG_NECHES>
</Row><Row>
  <ID_KUPA>1093</ID_KUPA><TKF_DIVUACH>202605</TKF_DIVUACH>
  <KVUTZAT_NECHASIM>חשיפות</KVUTZAT_NECHASIM>
  <SHM_SUG_NECHES>חשיפה למניות</SHM_SUG_NECHES><ACHUZ_SUG_NECHES>50</ACHUZ_SUG_NECHES>
</Row></ROWSET>`

describe('parseTreasuryXml', () => {
  const portfolio = new Set(['1093', '209'])

  it('detects a returns file and keeps only portfolio mofids', () => {
    const out = parseTreasuryXml(returnsFile, 'kupot_58.xml', portfolio)
    expect(out.type).toBe('returns')
    expect(out.funds).toHaveLength(1)
    expect(out.funds[0]).toMatchObject({ mofid: '1093', return12m: 15.03, sharpe: 0.76 })
  })

  it('detects an allocation file and keeps only the main 9-group breakdown', () => {
    const out = parseTreasuryXml(allocationFile, 'kupot_59.xml', portfolio)
    expect(out.type).toBe('allocation')
    expect(out.allocations).toHaveLength(1)
    expect(out.allocations[0].groups).toEqual([{ name: 'מניות', percent: 28.27 }])
  })

  it('reports unknown format', () => {
    expect(parseTreasuryXml('<foo/>', 'x.xml', portfolio).type).toBe('unknown')
  })
})

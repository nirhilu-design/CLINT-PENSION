import { describe, expect, it } from 'vitest'
import { parsePensionXml, XmlParseError } from './parsePensionXml'

// Compact fixture mirroring the real clearinghouse structure
function fixture({ clientId = '027864610', clientId2 = '' } = {}) {
  const secondMutzar = clientId2
    ? `<Mutzar><NetuneiMutzar><SUG-MUTZAR>4</SUG-MUTZAR>
        <YeshutLakoach><MISPAR-ZIHUY-LAKOACH>${clientId2}</MISPAR-ZIHUY-LAKOACH><SHEM-PRATI>ב</SHEM-PRATI><SHEM-MISHPACHA>ב</SHEM-MISHPACHA></YeshutLakoach>
       </NetuneiMutzar>
       <HeshbonotOPolisot><HeshbonOPolisa><MISPAR-POLISA-O-HESHBON>P2</MISPAR-POLISA-O-HESHBON></HeshbonOPolisa></HeshbonotOPolisot></Mutzar>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<Mimshak><YeshutYatzran><SHEM-YATZRAN>יצרן בדיקה</SHEM-YATZRAN><Mutzarim>
<Mutzar><NetuneiMutzar><SUG-MUTZAR>2</SUG-MUTZAR>
  <YeshutLakoach><MISPAR-ZIHUY-LAKOACH>${clientId}</MISPAR-ZIHUY-LAKOACH><SHEM-PRATI>א</SHEM-PRATI><SHEM-MISHPACHA>ב</SHEM-MISHPACHA><TAARICH-LEYDA>19930515</TAARICH-LEYDA></YeshutLakoach>
</NetuneiMutzar>
<HeshbonotOPolisot><HeshbonOPolisa>
  <MISPAR-POLISA-O-HESHBON>P1</MISPAR-POLISA-O-HESHBON>
  <SHEM-TOCHNIT>קרן בדיקה</SHEM-TOCHNIT>
  <KIDOD-ACHID>513026484000000000002090000000</KIDOD-ACHID>
  <TAARICH-NECHONUT>20240930</TAARICH-NECHONUT>
  <TAARICH-HITZTARFUT-MUTZAR>20191222</TAARICH-HITZTARFUT-MUTZAR>
  <STATUS-POLISA-O-CHESHBON>1</STATUS-POLISA-O-CHESHBON>
  <PirteiHaasaka><SACHAR-POLISA>14442.00</SACHAR-POLISA></PirteiHaasaka>
  <PerutHafrashotLePolisa><SUG-HAFRASHA>2</SUG-HAFRASHA><ACHUZ-HAFRASHA>6.00</ACHUZ-HAFRASHA></PerutHafrashotLePolisa>
  <PerutHafrashotLePolisa><SUG-HAFRASHA>3</SUG-HAFRASHA><ACHUZ-HAFRASHA>6.50</ACHUZ-HAFRASHA></PerutHafrashotLePolisa>
  <PirteiHafkadaAchrona><PerutPirteiHafkadaAchrona><TAARICH-HAFKADA-ACHARON>202409</TAARICH-HAFKADA-ACHARON><TOTAL-HAFKADA>3008.27</TOTAL-HAFKADA></PerutPirteiHafkadaAchrona></PirteiHafkadaAchrona>
  <PerutHafkadotMetchilatShana><CHODESH-SACHAR>202408</CHODESH-SACHAR><SCHUM-HAFKADA-SHESHULAM>1000</SCHUM-HAFKADA-SHESHULAM><SUG-HAFRASHA>2</SUG-HAFRASHA></PerutHafkadotMetchilatShana>
  <PerutHafkadotMetchilatShana><CHODESH-SACHAR>202408</CHODESH-SACHAR><SCHUM-HAFKADA-SHESHULAM>500</SCHUM-HAFKADA-SHESHULAM><SUG-HAFRASHA>3</SUG-HAFRASHA></PerutHafkadotMetchilatShana>
  <MivneDmeiNihul>
    <PerutMivneDmeiNihul><SUG-HOTZAA>1</SUG-HOTZAA><SHEUR-DMEI-NIHUL>0.1400</SHEUR-DMEI-NIHUL></PerutMivneDmeiNihul>
    <PerutMivneDmeiNihul><SUG-HOTZAA>2</SUG-HOTZAA><SHEUR-DMEI-NIHUL>1.2000</SHEUR-DMEI-NIHUL></PerutMivneDmeiNihul>
  </MivneDmeiNihul>
  <Kisuim><ZihuiKisui><KisuiBKerenPensia>
    <SACH-PENSIAT-NECHUT>10790.58</SACH-PENSIAT-NECHUT><SHEUR-KISUY-NECHUT>75.00</SHEUR-KISUY-NECHUT>
    <KITZBAT-SHEERIM-LEALMAN-O-ALMANA>8632.46</KITZBAT-SHEERIM-LEALMAN-O-ALMANA>
    <KITZBAT-SHEERIM-LEYATOM>5754.98</KITZBAT-SHEERIM-LEYATOM>
  </KisuiBKerenPensia></ZihuiKisui></Kisuim>
  <PerutMasluleiHashkaa><SCHUM-TZVIRA-BAMASLUL>100000</SCHUM-TZVIRA-BAMASLUL><SHEM-MASLUL-HASHKAA>מסלול א</SHEM-MASLUL-HASHKAA><TSUA-NETO>9.5</TSUA-NETO></PerutMasluleiHashkaa>
  <PerutMasluleiHashkaa><SCHUM-TZVIRA-BAMASLUL>50000</SCHUM-TZVIRA-BAMASLUL><SHEM-MASLUL-HASHKAA>מסלול א</SHEM-MASLUL-HASHKAA></PerutMasluleiHashkaa>
  <YitraLefiGilPrisha><GIL-PRISHA>67.00</GIL-PRISHA><Kupot><Kupa><KITZVAT-HODSHIT-TZFUYA>4444.61</KITZVAT-HODSHIT-TZFUYA></Kupa></Kupot></YitraLefiGilPrisha>
</HeshbonOPolisa></HeshbonotOPolisot></Mutzar>
${secondMutzar}
</Mutzarim></YeshutYatzran></Mimshak>`
}

describe('parsePensionXml', () => {
  const { client, policies } = parsePensionXml(fixture(), 'test.xml')
  const p = policies[0]

  it('reads client and product core', () => {
    expect(client.id).toBe('027864610')
    expect(p.productType).toBe('pension')
    expect(p.policyNumber).toBe('P1')
    expect(p.mofid).toBe('209')
    expect(p.reportDate).toBe('2024-09-30')
  })

  it('maps fees correctly: SUG-HOTZAA 1=accumulation, 2=deposit', () => {
    expect(p.fees.fromAccumulation).toBe(0.14)
    expect(p.fees.fromDeposit).toBe(1.2)
  })

  it('sums accumulation and merges duplicate track rows', () => {
    expect(p.currentValue).toBe(150000)
    expect(p.investmentTracks).toHaveLength(1)
    expect(p.investmentTracks[0].returnNet).toBe(9.5)
  })

  it('itemizes survivors coverage per beneficiary type', () => {
    const survivors = p.coverages.filter((c) => c.type === 'survivors')
    expect(survivors.map((s) => s.name)).toEqual(
      expect.arrayContaining(['קצבת שאירים לאלמן/ה', 'קצבת שאירים ליתום']),
    )
  })

  it('aggregates monthly deposits across contribution types', () => {
    expect(p.monthlyDeposits).toEqual([{ month: '2024-08', total: 1500 }])
    expect(p.lastDepositMonth).toBe('2024-09')
    expect(p.lastDepositTotal).toBe(3008.27)
  })

  it('reads expected pension and contributions', () => {
    expect(p.expectedPension).toBe(4444.61)
    expect(p.contributions).toEqual(
      expect.arrayContaining([
        { role: 'employee', percent: 6 },
        { role: 'employer', percent: 6.5 },
      ]),
    )
  })

  it('rejects different IDs in one file, accepts padded variants of the same ID', () => {
    expect(() => parsePensionXml(fixture({ clientId2: '123456789' }), 'multi.xml')).toThrow(
      XmlParseError,
    )
    expect(() =>
      parsePensionXml(fixture({ clientId2: '0000000027864610' }), 'padded.xml'),
    ).not.toThrow()
  })

  it('rejects invalid XML with a clear error', () => {
    expect(() => parsePensionXml('not xml <<<', 'bad.xml')).toThrow(XmlParseError)
  })
})

import { describe, expect, it } from 'vitest'
import { buildAnalysis, emptySupplementary, parseFiles } from './analysisService'

// Minimal clearinghouse fixture — one pension account. Synthetic placeholders only.
function miniFile(policyNumber: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Mimshak><YeshutYatzran><SHEM-YATZRAN>יצרן בדיקה</SHEM-YATZRAN><Mutzarim>
<Mutzar><NetuneiMutzar><SUG-MUTZAR>2</SUG-MUTZAR>
  <YeshutLakoach><MISPAR-ZIHUY-LAKOACH>100000009</MISPAR-ZIHUY-LAKOACH><SHEM-PRATI>א</SHEM-PRATI><SHEM-MISHPACHA>ב</SHEM-MISHPACHA></YeshutLakoach>
</NetuneiMutzar>
<HeshbonotOPolisot><HeshbonOPolisa>
  <MISPAR-POLISA-O-HESHBON>${policyNumber}</MISPAR-POLISA-O-HESHBON>
  <STATUS-POLISA-O-CHESHBON>1</STATUS-POLISA-O-CHESHBON>
</HeshbonOPolisa></HeshbonotOPolisot></Mutzar>
</Mutzarim></YeshutYatzran></Mimshak>`
}

describe('buildAnalysis', () => {
  it('stamps a globally-unique id even for two pension funds sharing a policy number', () => {
    // Two separate funds report the same policy number (the national ID). Even
    // when uploaded as identically-named files, every policy must be distinct.
    const parsed = parseFiles([
      { name: 'clearing.xml', text: miniFile('123456789') },
      { name: 'clearing.xml', text: miniFile('123456789') },
    ])
    const analysis = buildAnalysis(parsed, emptySupplementary())
    expect(analysis.policies).toHaveLength(2)
    expect(analysis.policies[0].policyNumber).toBe(analysis.policies[1].policyNumber)
    const ids = analysis.policies.map((p) => p.id)
    expect(new Set(ids).size).toBe(2)
  })
})

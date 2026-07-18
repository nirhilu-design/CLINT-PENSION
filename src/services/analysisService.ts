// Orchestrates the full flow: parse files → validate → unified model → engines → analysis.
// Backend-ready: pure functions over data, no UI dependencies.

import type { Analysis, Policy, SupplementaryInfo } from '../models/types'
import { parsePensionXml, XmlParseError, type ParsedFile } from '../parser/parsePensionXml'
import { runEngines, buildExecutiveSummary } from '../engines'

export { XmlParseError }

export function emptySupplementary(): SupplementaryInfo {
  return {
    hasChildrenUnder21: null,
    hasSpouse: null,
    hasOtherMaterialAssets: null,
    otherAssetsRealEstateValue: null,
    otherAssetsPortfolioValue: null,
    otherAssetsLiquidValue: null,
    employmentStatus: null,
    currentGrossSalary: null,
    familyReliesOnIncome: null,
    feeAgreements: [],
    benchmarks: [],
    treasuryFunds: [],
    treasuryAllocations: [],
  }
}

/** Parse all uploaded XML files. Throws XmlParseError on invalid input or multiple client IDs. */
export function parseFiles(files: { name: string; text: string }[]): ParsedFile[] {
  if (files.length === 0) {
    throw new XmlParseError('לא הועלו קבצים')
  }

  const parsed = files.map((f) => parsePensionXml(f.text, f.name))

  const ids = new Set(parsed.map((p) => p.client.id))
  if (ids.size > 1) {
    throw new XmlParseError(
      `הקבצים שהועלו שייכים ליותר מלקוח אחד (תעודות זהות: ${[...ids].join(', ')}). יש להעלות קבצים של לקוח אחד בלבד.`,
    )
  }

  return parsed
}

/** Build the full analysis from parsed files + supplementary info. */
export function buildAnalysis(parsedFiles: ParsedFile[], supplementary: SupplementaryInfo): Analysis {
  const client = parsedFiles[0].client
  const policies: Policy[] = parsedFiles.flatMap((f) => f.policies)

  const findings = runEngines({ client, policies, supplementary })
  const executiveSummary = buildExecutiveSummary(findings, policies)

  return {
    createdAt: new Date().toISOString(),
    client,
    policies,
    findings,
    executiveSummary,
    supplementary,
  }
}

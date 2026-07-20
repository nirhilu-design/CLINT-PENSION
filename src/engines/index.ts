import type { Engine, EngineInput } from './engineTypes'
import type { Finding } from '../models/types'
import { stopIssueEngine } from './stopIssueEngine'
import { costEngine } from './costEngine'
import { retirementEngine } from './retirementEngine'
import { investmentEngine } from './investmentEngine'
import { incomeProtectionEngine } from './incomeProtectionEngine'
import { deathPictureEngine } from './deathPictureEngine'
import { dataQualityEngine } from './dataQualityEngine'
import { savingsEngine } from './savingsEngine'
import { managersInsightEngine } from './managersInsightEngine'
import { pensionInsightEngine } from './pensionInsightEngine'
import { depositsEngine } from './depositsEngine'
import { issuerEngine } from './issuerEngine'
import { crossChecksEngine } from './crossChecksEngine'

export { buildExecutiveSummary } from './executiveSummaryEngine'

const engines: Engine[] = [
  stopIssueEngine,
  costEngine,
  retirementEngine,
  investmentEngine,
  incomeProtectionEngine,
  deathPictureEngine,
  dataQualityEngine,
  savingsEngine,
  managersInsightEngine,
  pensionInsightEngine,
  depositsEngine,
  issuerEngine,
  crossChecksEngine,
]

export function runEngines(input: EngineInput): Finding[] {
  return engines.flatMap((engine) => engine(input))
}

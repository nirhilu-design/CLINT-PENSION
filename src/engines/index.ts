import type { Engine, EngineInput } from './engineTypes'
import { resetFindingIds } from './engineTypes'
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

export { buildExecutiveSummary } from './executiveSummaryEngine'

// id must match the catalog id in config/logicConfig.ts so the editor can toggle it.
const engines: { id: string; engine: Engine }[] = [
  { id: 'managersGeneration', engine: stopIssueEngine },
  { id: 'cost', engine: costEngine },
  { id: 'retirement', engine: retirementEngine },
  { id: 'investment', engine: investmentEngine },
  { id: 'incomeProtection', engine: incomeProtectionEngine },
  { id: 'deathPicture', engine: deathPictureEngine },
  { id: 'dataQuality', engine: dataQualityEngine },
  { id: 'savings', engine: savingsEngine },
  { id: 'managersInsight', engine: managersInsightEngine },
  { id: 'pensionInsight', engine: pensionInsightEngine },
  { id: 'deposits', engine: depositsEngine },
]

export function runEngines(input: EngineInput, disabledLogics: string[] = []): Finding[] {
  resetFindingIds()
  const off = new Set(disabledLogics)
  return engines.flatMap(({ id, engine }) => (off.has(id) ? [] : engine(input)))
}

// How many findings each logic currently raises for the loaded client, keyed by
// logic id — the "X התאמות" count in the Logic Editor. Runs every engine
// regardless of enabled state so the count reflects the logic's actual reach.
export function findingCountsByLogic(input: EngineInput): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const { id, engine } of engines) {
    counts[id] = engine(input).length
  }
  return counts
}

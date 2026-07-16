// Unified Pension Data Model — MVP entities per PRD

export type ProductType =
  | 'pension'
  | 'managers'
  | 'gemel'
  | 'education'
  | 'life'
  | 'incomeProtection'
  | 'unknown'

export interface Client {
  id: string
  firstName: string | null
  lastName: string | null
  fullName: string
  birthDate: string | null // ISO yyyy-mm-dd
  gender: 'male' | 'female' | null
  email: string | null
  phone: string | null
}

export type CoverageType = 'disability' | 'survivors' | 'death' | 'other'

export interface Coverage {
  type: CoverageType
  name: string | null
  amount: number | null // monthly benefit or lump sum
  percent: number | null // coverage percent of salary
  coveredSalary: number | null
  cost: number | null // monthly cost
  status: 'active' | 'inactive' | null
  policyNumber: string
}

export type ContributionRole = 'employee' | 'employer' | 'severance' | 'other'

export interface Contribution {
  role: ContributionRole
  percent: number | null
}

export interface Beneficiary {
  name: string | null
  relation: string | null
  allocationPercent: number | null
}

export interface InvestmentTrack {
  name: string | null
  value: number | null
}

export interface FeeStructure {
  fromDeposit: number | null // percent
  fromAccumulation: number | null // percent
}

// Managers insurance regulatory generations
export type ManagersGeneration =
  | 'before-2001-06'
  | '2001-06-to-2004'
  | '2004-to-2013'
  | '2013-plus'

export interface Policy {
  policyNumber: string
  productType: ProductType
  productName: string | null
  managingCompany: string | null
  mofid: string | null // מספר אוצר derived from KIDOD-ACHID
  openDate: string | null // ISO
  status: 'active' | 'inactive' | null
  currentValue: number | null
  coveredSalary: number | null
  expectedPension: number | null // KITZVAT-HODSHIT-TZFUYA
  expectedAccumulationAtRetirement: number | null
  retirementAge: number | null
  fees: FeeStructure
  netReturn: number | null // percent, SHEUR-TSUA-NETO
  investmentTracks: InvestmentTrack[]
  coverages: Coverage[]
  contributions: Contribution[]
  beneficiaries: Beneficiary[]
  managersGeneration: ManagersGeneration | null
  hasGuaranteedFactor: boolean // מקדם קצבה מובטח (MEKADEM-MOVTACH-LEPRISHA)
  sourceFileName: string
}

export type FindingCategory =
  | 'retirement'
  | 'cost'
  | 'investment'
  | 'insurance'
  | 'death'
  | 'dataQuality'
  | 'information'
  | 'limitation'

export type FindingLevel = 'analysis' | 'client' | 'product' | 'policy' | 'coverage'

export type FindingSeverity = 'info' | 'attention' | 'gap'

export interface Finding {
  id: string
  category: FindingCategory
  level: FindingLevel
  severity: FindingSeverity
  title: string
  description: string
  productType?: ProductType
  policyNumber?: string
}

// ---- Supplementary info (user-entered, not from XML) ----

export interface FeeAgreement {
  policyNumber: string
  agreedFeeFromDeposit: number | null
  agreedFeeFromAccumulation: number | null
}

// Manual benchmark data from גמל-נט / ביטוח-נט / פנסיה-נט, keyed by מספר אוצר
export type BenchmarkSource = 'gemelnet' | 'bituachnet' | 'pensianet'

export interface FundBenchmark {
  mofid: string
  source: BenchmarkSource
  annualReturn: number | null // percent
  sharpe: number | null
}

export interface SupplementaryInfo {
  // Smart context questions that sharpen the insurance/death-picture analysis.
  // null = not answered; analysis proceeds without guessing.
  hasChildrenUnder21: boolean | null
  hasSpouse: boolean | null
  hasOtherMaterialAssets: boolean | null
  feeAgreements: FeeAgreement[]
  benchmarks: FundBenchmark[]
}

// ---- Analysis (root aggregate) ----

export interface ExecutiveSummary {
  topFindings: Finding[]
  strengths: string[]
  limitations: string[]
}

export interface Analysis {
  createdAt: string
  client: Client
  policies: Policy[]
  findings: Finding[]
  executiveSummary: ExecutiveSummary
  supplementary: SupplementaryInfo
}

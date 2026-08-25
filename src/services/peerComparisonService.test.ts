import { describe, expect, it } from 'vitest'
import type { Policy, PeerComparisonGroup, TreasuryFundData } from '../models/types'
import { comparePeers, findPeerGroupFor } from './peerComparisonService'

function fund(mofid: string, return12m: number | null): TreasuryFundData {
  return {
    mofid,
    name: `קופה ${mofid}`,
    managingCompany: null,
    avgFeeFromAccumulation: 0.5,
    avgFeeFromDeposit: null,
    return12m,
    return3yAnnualized: null,
    return5yAnnualized: null,
    stdDev36m: null,
    sharpe: null,
    liquidityRatio: null,
    periodTo: null,
  }
}

function policy(mofid: string): Policy {
  return {
    policyNumber: `P-${mofid}`,
    productType: 'education',
    productName: `הקופה של הלקוח ${mofid}`,
    managingCompany: null,
    mofid,
    openDate: null,
    status: 'active',
    statusCode: '1',
    temporaryRisk: false,
    savingsAllocationPercent: null,
    capitalBalance: null,
    currentValue: 100000,
    deathSumInsured: null,
    deathSumIncludesSavings: null,
    coveredSalary: null,
    expectedPensionWithDeposits: null,
    expectedPensionWithoutDeposits: null,
    expectedAccumulationWithDeposits: null,
    expectedAccumulationWithoutDeposits: null,
    retirementAge: null,
    fees: { fromDeposit: null, fromAccumulation: null },
    netReturn: null,
    investmentTracks: [],
    coverages: [],
    contributions: [],
    beneficiaries: [],
    managersGeneration: null,
    hasGuaranteedFactor: false,
    survivorsWaiver: null,
    reportDate: null,
    lastDepositMonth: null,
    lastDepositTotal: null,
    monthlyDeposits: [],
    sourceFileName: 't.xml',
  }
}

const group: PeerComparisonGroup = {
  id: 'g1',
  category: 'מסלול כללי',
  members: [
    { mofid: '880', name: 'מיטב כללי' },
    { mofid: '579', name: 'מגדל כללי' },
    { mofid: '456', name: 'כלל כללי' },
  ],
}

describe('peerComparisonService', () => {
  it('finds the peer group by the client mofid', () => {
    expect(findPeerGroupFor('579', [group])?.category).toBe('מסלול כללי')
    expect(findPeerGroupFor('999', [group])).toBeNull()
  })

  it('ranks the client fund among the peers by 12m return', () => {
    const funds = [fund('880', 6.0), fund('579', 8.0), fund('456', 5.0)]
    const [cmp] = comparePeers([policy('579')], funds, [group])
    expect(cmp.group?.category).toBe('מסלול כללי')
    expect(cmp.ranked).toBe(3)
    expect(cmp.clientRank).toBe(1) // 8.0 is the highest
    expect(cmp.rows[0].isClient).toBe(true)
    expect(cmp.rows.map((r) => r.mofid)).toEqual(['579', '880', '456'])
  })

  it('places funds without treasury data last and ranks only those with data', () => {
    const funds = [fund('880', 6.0), fund('579', 4.0)] // 456 has no treasury row
    const [cmp] = comparePeers([policy('579')], funds, [group])
    expect(cmp.ranked).toBe(2)
    expect(cmp.clientRank).toBe(2) // client 4.0 below 880's 6.0
    expect(cmp.rows[cmp.rows.length - 1].mofid).toBe('456') // no-data row is last
    expect(cmp.rows[cmp.rows.length - 1].fund).toBeNull()
  })

  it('returns a null group when the client fund is not in any table', () => {
    const [cmp] = comparePeers([policy('999')], [fund('999', 7)], [group])
    expect(cmp.group).toBeNull()
    expect(cmp.rows).toHaveLength(1)
    expect(cmp.rows[0].isClient).toBe(true)
  })
})

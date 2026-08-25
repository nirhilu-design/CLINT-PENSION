import { describe, expect, it } from 'vitest'
import { parsePeerTable } from './parsePeerTable'

describe('parsePeerTable', () => {
  it('parses the section layout (category header rows + name,mofid rows)', () => {
    const csv = [
      'מסלול כללי',
      'שם קופה,מ"ה',
      'מיטב השתלמות כללי,880',
      'מגדל השתלמות כללי,579',
      'מסלול מניות',
      'שם קופה,מ"ה',
      'מור השתלמות מניות,12536',
      'מגדל השתלמות מניות,869',
    ].join('\n')
    const { groups, totalMembers } = parsePeerTable(csv)
    expect(groups.map((g) => g.category)).toEqual(['מסלול כללי', 'מסלול מניות'])
    expect(totalMembers).toBe(4)
    expect(groups[0].members).toEqual([
      { mofid: '880', name: 'מיטב השתלמות כללי' },
      { mofid: '579', name: 'מגדל השתלמות כללי' },
    ])
  })

  it('parses an explicit category column', () => {
    const csv = [
      'מסלול,שם קופה,מ"ה',
      'כללי,מיטב כללי,880',
      'מניות,מור מניות,12536',
      'כללי,מגדל כללי,579',
    ].join('\n')
    const { groups } = parsePeerTable(csv)
    const general = groups.find((g) => g.category === 'כללי')!
    expect(general.members.map((m) => m.mofid).sort()).toEqual(['579', '880'])
    expect(groups.find((g) => g.category === 'מניות')!.members).toHaveLength(1)
  })

  it('normalizes leading zeros in the mofid', () => {
    const { groups } = parsePeerTable('כללי\nמיטב,0880')
    expect(groups[0].members[0].mofid).toBe('880')
  })

  it('handles tab-separated input and dedupes repeats', () => {
    const tsv = 'כללי\nמיטב\t880\nמיטב\t880\nמגדל\t579'
    const { totalMembers } = parsePeerTable(tsv)
    expect(totalMembers).toBe(2)
  })
})

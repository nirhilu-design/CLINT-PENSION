// Parser for advisor-uploaded peer-comparison tables (CSV / TSV / pasted text).
// Two supported layouts:
//   1. Section layout (as exported from the treasury site) — a lone label row names
//      a category ("מסלול כללי"), followed by "שם קופה, מ"ה" rows until the next label.
//   2. Explicit-column layout — a header row naming a category/track column plus name
//      and מ"ה columns, then one row per fund.
// Only the fund identity (name + מ"ה) is captured; return/fee numbers come from the
// official treasury files, matched by mofid.

import type { PeerComparisonGroup, PeerGroupMember } from '../models/types'
import { normalizeMofid } from './xmlUtils'

const DELIMS = [',', '\t', ';']

function pickDelimiter(text: string): string {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  let best = ','
  let bestCount = 1
  for (const d of DELIMS) {
    // The delimiter that splits the most columns on any data row wins.
    const count = Math.max(1, ...lines.map((l) => l.split(d).length))
    if (count > bestCount) {
      bestCount = count
      best = d
    }
  }
  return best
}

function splitRow(line: string, delim: string): string[] {
  return line.split(delim).map((c) => c.trim().replace(/^"(.*)"$/, '$1').trim())
}

const MOFID_RE = /^\d{2,7}$/
const isMofidCell = (c: string) => MOFID_RE.test(c)

// Header cells we recognise, to locate columns and to skip header rows.
const NAME_HINT = /שם|קופה|קרן|מוצר/
const MOFID_HINT = /מ["'׳״]?ה|מספר\s*אוצר|אוצר|mofid/i
const CATEGORY_HINT = /קטגור|מסלול|סוג|קבוצה/

function looksLikeHeader(cells: string[]): boolean {
  return cells.some((c) => MOFID_HINT.test(c)) && cells.some((c) => NAME_HINT.test(c)) && !cells.some(isMofidCell)
}

export interface PeerTableParseResult {
  groups: PeerComparisonGroup[]
  totalMembers: number
}

let seq = 0

export function parsePeerTable(text: string, fallbackCategory = 'כללי'): PeerTableParseResult {
  const delim = pickDelimiter(text)
  const lines = text.split(/\r?\n/)

  // Detect an explicit category column from the first header row, if any.
  let catIdx = -1
  let nameIdx = -1
  let mofidIdx = -1
  for (const line of lines) {
    if (!line.trim()) continue
    const cells = splitRow(line, delim)
    if (looksLikeHeader(cells)) {
      catIdx = cells.findIndex((c) => CATEGORY_HINT.test(c))
      nameIdx = cells.findIndex((c) => NAME_HINT.test(c))
      mofidIdx = cells.findIndex((c) => MOFID_HINT.test(c))
      break
    }
  }
  const explicitCategory = catIdx >= 0

  const byCategory = new Map<string, Map<string, string | null>>()
  const add = (category: string, mofid: string, name: string | null) => {
    let group = byCategory.get(category)
    if (!group) {
      group = new Map()
      byCategory.set(category, group)
    }
    if (!group.has(mofid) || (name && !group.get(mofid))) group.set(mofid, name)
  }

  let currentCategory = fallbackCategory
  for (const line of lines) {
    if (!line.trim()) continue
    const cells = splitRow(line, delim)
    if (looksLikeHeader(cells)) continue

    const nonEmpty = cells.filter(Boolean)
    if (nonEmpty.length === 0) continue

    // A lone, non-numeric row is a section header naming the next category.
    if (!explicitCategory && nonEmpty.length === 1 && !isMofidCell(nonEmpty[0])) {
      currentCategory = nonEmpty[0]
      continue
    }

    const mofidRaw = explicitCategory && mofidIdx >= 0 ? cells[mofidIdx] : cells.find(isMofidCell)
    const mofid = normalizeMofid(mofidRaw ?? null)
    if (!mofid) continue // no fund id on this row → not a member

    let name: string | null
    let category: string
    if (explicitCategory) {
      name = nameIdx >= 0 ? cells[nameIdx] || null : null
      category = cells[catIdx] || currentCategory
    } else {
      name = nonEmpty.find((c) => !isMofidCell(c)) ?? null
      category = currentCategory
    }
    add(category, mofid, name)
  }

  const groups: PeerComparisonGroup[] = [...byCategory.entries()]
    .filter(([, members]) => members.size > 0)
    .map(([category, members]) => ({
      id: `pg-${Date.now().toString(36)}-${seq++}`,
      category,
      members: [...members.entries()].map(
        ([mofid, name]): PeerGroupMember => ({ mofid, name }),
      ),
    }))

  return { groups, totalMembers: groups.reduce((s, g) => s + g.members.length, 0) }
}

// Low-level helpers for reading מבנה אחיד XML safely.
// Missing/nil elements return null — never throw.

export function getText(parent: Element | Document | null, tag: string): string | null {
  if (!parent) return null
  const el = parent.querySelector(tag)
  if (!el) return null
  if (el.getAttribute('xsi:nil') === 'true') return null
  const text = el.textContent?.trim()
  return text ? text : null
}

export function getNumber(parent: Element | Document | null, tag: string): number | null {
  const text = getText(parent, tag)
  if (text === null) return null
  const n = parseFloat(text)
  return Number.isFinite(n) ? n : null
}

/** yyyymmdd (possibly with time suffix) -> ISO yyyy-mm-dd */
export function parseDate(raw: string | null): string | null {
  if (!raw || raw.length < 8) return null
  const y = raw.slice(0, 4)
  const m = raw.slice(4, 6)
  const d = raw.slice(6, 8)
  if (!/^\d{8}$/.test(raw.slice(0, 8))) return null
  return `${y}-${m}-${d}`
}

/**
 * Normalize an Israeli ID number (תעודת זהות) for comparison.
 * The same ID can arrive with different zero-padding across files and
 * even across records in one file (e.g. "0000000012345674", "012345674",
 * "12345674"). Strip every leading zero to the significant digits, then
 * pad back to the canonical 9 digits, so the same person is never treated
 * as two different clients.
 */
export function normalizeClientId(id: string | null): string {
  if (!id) return ''
  const core = id.replace(/\D/g, '').replace(/^0+/, '')
  return core ? core.padStart(9, '0') : ''
}

/** מספר אוצר (fund/product code) from the 30-digit KIDOD-ACHID. Per נספח ט',
 *  chars 0-8 are the company ח"פ, 9-22 the אמ"ה fund number (or the product id
 *  for insurers), 23-29 the investment-track code. We return the middle segment
 *  stripped of leading zeros — present for pension/gemel/managers, empty (null)
 *  when the product carries only the company ח"פ (e.g. products outside the
 *  אוצר population). */
export function mofidFromKidodAchid(kidod: string | null): string | null {
  if (!kidod || kidod.length < 23) return null
  const code = kidod.slice(9, 23).replace(/^0+/, '')
  return code || null
}

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

/** מספר אוצר derived from KIDOD-ACHID: chars 18-23 (zero-padded fund code) */
export function mofidFromKidodAchid(kidod: string | null): string | null {
  if (!kidod || kidod.length < 23) return null
  const code = kidod.slice(18, 23).replace(/^0+/, '')
  return code || null
}

// Treasury (גמל-נט / פנסיה-נט) keys funds differently per product: pension and
// education match the product-level code (KIDOD-ACHID digits 19–23), while gemel
// lehashkaa is keyed by the investment-track (מסלול) code — the last 5 digits of
// KOD-MASLUL-HASHKAA. We collect every plausible code so matching can try them
// all, since a single account may span several tracks (each its own kupa).
export function fundCandidatesFromCodes(kidod: string | null, maslulCodes: string[]): string[] {
  const set = new Set<string>()
  const primary = mofidFromKidodAchid(kidod)
  if (primary) set.add(primary)
  for (const code of maslulCodes) {
    if (code && code.length >= 5) {
      const last5 = code.slice(-5).replace(/^0+/, '')
      if (last5) set.add(last5)
    }
  }
  return [...set]
}

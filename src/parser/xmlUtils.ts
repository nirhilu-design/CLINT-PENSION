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

/**
 * מספר מסלול (investment-track code) from KOD-MASLUL-HASHKAA.
 * The code mirrors KIDOD-ACHID's 30-char layout and ends in a 4-char track field,
 * e.g. ...002090002187 -> "2187" (הפניקס פנסיה מקיפה מניות). For single-track
 * products the track field repeats the fund code (...010930001093 -> "1093"),
 * so this doubles as the פנסיה-נט/גמל-נט join key at track granularity.
 * Returns null when absent.
 */
export function trackCodeFromKodMaslul(kod: string | null): string | null {
  if (!kod || kod.length < 4) return null
  const code = kod.slice(-4).replace(/^0+/, '')
  return code || null
}

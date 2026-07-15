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

/** מספר אוצר derived from KIDOD-ACHID: chars 18-23 (zero-padded fund code) */
export function mofidFromKidodAchid(kidod: string | null): string | null {
  if (!kidod || kidod.length < 23) return null
  const code = kidod.slice(18, 23).replace(/^0+/, '')
  return code || null
}

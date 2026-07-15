export function formatCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `₪${Math.round(value).toLocaleString('he-IL')}`
}

export function formatPercent(value: number | null, digits = 2): string {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

export function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

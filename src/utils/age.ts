import type { Client } from '../models/types'

/** Client age in whole years from birthDate, or null when unknown. */
export function ageOf(client: Client, now = new Date()): number | null {
  if (!client.birthDate) return null
  const birth = new Date(client.birthDate)
  if (Number.isNaN(birth.getTime())) return null
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1
  return age
}

// Producer catalog — the institutional bodies (גופים מוסדיים) that manufacture
// pension/insurance/investment products, split into insurance companies
// (חברות ביטוח) and investment houses (בתי השקעות). Single source of truth for:
//  - the advisor fee-agreement producer dropdown, and
//  - normalizing a reported managingCompany name to a canonical key (so an
//    agreement entered for "מגדל" matches a policy whose issuer is reported as
//    "מגדל חברה לביטוח בע\"מ").

export type ProducerCategory = 'insurance' | 'investment'

export interface Producer {
  key: string
  name: string // canonical display name
  category: ProducerCategory
}

// Canonical producers + the reported-name variants that map to each. The alias
// lists mirror the market's common brand/legal-entity spellings.
const PRODUCER_DEFS: { key: string; name: string; category: ProducerCategory; aliases: string[] }[] = [
  { key: 'migdal', name: 'מגדל', category: 'insurance', aliases: ['מגדל', 'מגדל ביטוח', 'מגדל חברה לביטוח', 'מקפת', 'מגדל מקפת', 'קרן פנסיה מקיפה מגדל', 'קרן פנסיה משלימה מגדל'] },
  { key: 'harel', name: 'הראל', category: 'insurance', aliases: ['הראל', 'הראל ביטוח', 'הראל ביטוח ופיננסים', 'הראל פנסיה', 'הראל גמל', 'הראל פיננסים'] },
  { key: 'menora', name: 'מנורה מבטחים', category: 'insurance', aliases: ['מנורה', 'מבטחים', 'מנורה מבטחים', 'מנורה מבטחים פנסיה וגמל', 'מנורה מבטחים ביטוח'] },
  { key: 'clal', name: 'כלל', category: 'insurance', aliases: ['כלל', 'כלל ביטוח', 'כלל פנסיה', 'כלל פנסיה וגמל', 'כלל חברה לביטוח'] },
  { key: 'phoenix', name: 'הפניקס', category: 'insurance', aliases: ['הפניקס', 'הפניקס ביטוח', 'הפניקס פנסיה וגמל', 'הפניקס חברה לביטוח', 'אקסלנס'] },
  { key: 'hachshara', name: 'הכשרה', category: 'insurance', aliases: ['הכשרה', 'הכשרה ביטוח', 'הכשרה ביטוח ופיננסים', 'הכשרה חברה לביטוח'] },
  { key: 'ayalon', name: 'איילון', category: 'insurance', aliases: ['איילון', 'איילון ביטוח', 'איילון חברה לביטוח', 'איילון ביטוח ופיננסים'] },
  { key: 'meitav', name: 'מיטב', category: 'investment', aliases: ['מיטב', 'מיטב דש', 'מיטב בית השקעות', 'מיטב גמל ופנסיה', 'מיטב פנסיה'] },
  { key: 'altshuler', name: 'אלטשולר שחם', category: 'investment', aliases: ['אלטשולר', 'אלטשולר שחם', 'אלטשולר שחם בית השקעות', 'אלטשולר שחם גמל ופנסיה'] },
  { key: 'more', name: 'מור', category: 'investment', aliases: ['מור', 'מור בית השקעות', 'מור גמל ופנסיה', 'י.ד. מור'] },
  { key: 'analyst', name: 'אנליסט', category: 'investment', aliases: ['אנליסט', 'אנליסט בית השקעות', 'אנליסט קופות גמל'] },
  { key: 'yelin-lapidot', name: 'ילין לפידות', category: 'investment', aliases: ['ילין לפידות', 'ילין לפידות בית השקעות', 'ילין לפידות קופות גמל'] },
]

export const PRODUCERS: Producer[] = PRODUCER_DEFS.map(({ key, name, category }) => ({ key, name, category }))

export const INSURANCE_PRODUCERS = PRODUCERS.filter((p) => p.category === 'insurance')
export const INVESTMENT_PRODUCERS = PRODUCERS.filter((p) => p.category === 'investment')

/** trim, collapse spaces, strip quotes/dots, lowercase (affects Latin only). */
export function normalizeProducerName(s: string): string {
  return s
    .trim()
    .replace(/["'׳״.]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

// [alias, key] pairs, longest alias first so specific names win over generic ones.
const ALIAS_INDEX: { alias: string; key: string }[] = PRODUCER_DEFS.flatMap(({ key, aliases }) =>
  aliases.map((alias) => ({ alias: normalizeProducerName(alias), key })),
).sort((a, b) => b.alias.length - a.alias.length)

/** Canonical producer key for a reported company name, or null when unrecognized. */
export function producerKey(name: string | null | undefined): string | null {
  if (!name) return null
  const n = normalizeProducerName(name)
  return ALIAS_INDEX.find((a) => n.includes(a.alias))?.key ?? null
}

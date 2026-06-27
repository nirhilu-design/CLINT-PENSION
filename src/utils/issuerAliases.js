// Maps raw issuer name variants → canonical name
const ISSUER_MAP = [
  { canonical: 'כלל', aliases: ['כלל ביטוח', 'כלל פנסיה', 'כלל חברה לביטוח', 'clal'] },
  { canonical: 'הראל', aliases: ['הראל ביטוח', 'הראל פנסיה', 'הראל גמל', 'harel'] },
  { canonical: 'מנורה', aliases: ['מנורה מבטחים', 'מנורה ביטוח', 'menora', 'מנורה מבטחים ביטוח'] },
  { canonical: 'מגדל', aliases: ['מגדל ביטוח', 'מגדל גמל', 'migdal'] },
  { canonical: 'הפניקס', aliases: ['פניקס', 'הפניקס ביטוח', 'הפניקס גמל', 'phoenix'] },
  { canonical: 'אלטשולר שחם', aliases: ['אלטשולר', 'altschuler', 'אלטשולר שחם גמל'] },
  { canonical: 'מיטב', aliases: ['מיטב דש', 'מיטב גמל', 'מיטב פנסיה', 'meitav'] },
  { canonical: 'ילין לפידות', aliases: ['ילין', 'יל"פ', 'yalin lapidot'] },
  { canonical: 'אנליסט', aliases: ['analyst'] },
  { canonical: 'פסגות', aliases: ['פסגות גמל', 'psagot'] },
  { canonical: 'מור', aliases: ['מור גמל', 'מור פנסיה', 'mor'] },
  { canonical: 'אינפיניטי', aliases: ['infinity'] },
  { canonical: 'ביטוח ישיר', aliases: ['direct insurance'] },
]

const _lookup = new Map()
for (const { canonical, aliases } of ISSUER_MAP) {
  _lookup.set(canonical.trim().toLowerCase(), canonical)
  for (const a of aliases) {
    _lookup.set(a.trim().toLowerCase(), canonical)
  }
}

export function normalizeIssuer(raw) {
  if (!raw) return raw
  const key = String(raw).trim().toLowerCase()
  return _lookup.get(key) ?? raw.trim()
}

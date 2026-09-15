import { useState } from 'react'

/**
 * Managing-company badge. Renders the company's real logo when a matching asset
 * exists under /public/logos; if the file is missing (or not yet uploaded) it
 * falls back gracefully to a colored monogram — never a broken image. No logos
 * are bundled in the repo; drop the asset files (from logo-sources.csv) into
 * public/logos with the exact filenames below.
 */

// key → logo file (served from /public/logos). Extensions per the supplied pack.
export const companyLogos: Record<string, string> = {
  migdal: '/logos/migdal.svg',
  harel: '/logos/harel.png',
  menora: '/logos/menora.jpg',
  clal: '/logos/clal.svg',
  phoenix: '/logos/phoenix.svg',
  meitav: '/logos/meitav.png',
  altshuler: '/logos/altshuler-shaham.png',
  more: '/logos/more.png',
  analyst: '/logos/analyst.png',
  'yelin-lapidot': '/logos/yelin-lapidot.png',
  hachshara: '/logos/hachshara.svg',
  ayalon: '/logos/ayalon.png',
}

// Hebrew name variations → key (from logo-map.json). Includes brand variants
// like מקפת→migdal, מבטחים→menora, "מיטב דש"→meitav, אקסלנס→phoenix.
const ALIASES: Record<string, string[]> = {
  migdal: ['מגדל', 'מגדל ביטוח', 'מגדל חברה לביטוח', 'מקפת', 'מגדל מקפת', 'קרן פנסיה מקיפה מגדל', 'קרן פנסיה משלימה מגדל'],
  harel: ['הראל', 'הראל ביטוח', 'הראל ביטוח ופיננסים', 'הראל פנסיה', 'הראל גמל', 'הראל פיננסים'],
  menora: ['מנורה', 'מבטחים', 'מנורה מבטחים', 'מנורה מבטחים פנסיה וגמל', 'מנורה מבטחים ביטוח'],
  clal: ['כלל', 'כלל ביטוח', 'כלל פנסיה', 'כלל פנסיה וגמל', 'כלל חברה לביטוח'],
  phoenix: ['הפניקס', 'הפניקס ביטוח', 'הפניקס פנסיה וגמל', 'הפניקס חברה לביטוח', 'אקסלנס'],
  meitav: ['מיטב', 'מיטב דש', 'מיטב בית השקעות', 'מיטב גמל ופנסיה', 'מיטב פנסיה'],
  altshuler: ['אלטשולר', 'אלטשולר שחם', 'אלטשולר שחם בית השקעות', 'אלטשולר שחם גמל ופנסיה'],
  more: ['מור', 'מור בית השקעות', 'מור גמל ופנסיה', 'י.ד. מור'],
  analyst: ['אנליסט', 'אנליסט בית השקעות', 'אנליסט קופות גמל'],
  'yelin-lapidot': ['ילין לפידות', 'ילין לפידות בית השקעות', 'ילין לפידות קופות גמל'],
  hachshara: ['הכשרה', 'הכשרה ביטוח', 'הכשרה ביטוח ופיננסים', 'הכשרה חברה לביטוח'],
  ayalon: ['איילון', 'איילון ביטוח', 'איילון חברה לביטוח', 'איילון ביטוח ופיננסים'],
}

// Flatten to [alias, key] pairs, longest alias first so specific names win.
const ALIAS_INDEX: { alias: string; key: string }[] = Object.entries(ALIASES)
  .flatMap(([key, list]) => list.map((alias) => ({ alias: normalize(alias), key })))
  .sort((a, b) => b.alias.length - a.alias.length)

/** trim, collapse spaces, strip quotes/dots, lowercase (affects Latin only). */
function normalize(s: string): string {
  return s
    .trim()
    .replace(/["'׳״.]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function logoFor(name: string): string | undefined {
  const n = normalize(name)
  const hit = ALIAS_INDEX.find((a) => n.includes(a.alias))
  return hit ? companyLogos[hit.key] : undefined
}

const PALETTE = [
  { fg: '#1e54e0', bg: '#eaf1ff' },
  { fg: '#1f9bbd', bg: '#e8f7fb' },
  { fg: '#22a06b', bg: '#e7f6ef' },
  { fg: '#b45309', bg: '#fef3c7' },
  { fg: '#7c5cbf', bg: '#f0eafb' },
  { fg: '#b4262b', bg: '#fdecec' },
  { fg: '#0f766e', bg: '#e6f5f3' },
]
function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}
function firstLetter(name: string): string {
  const m = name.trim().match(/[֐-׿A-Za-z]/)
  return m ? m[0] : '?'
}

export default function CompanyLogo({ company, size = 40 }: { company: string | null; size?: number }) {
  const name = company?.trim() || 'גוף לא דווח'
  const src = logoFor(name)
  const [broken, setBroken] = useState(false)

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setBroken(true)}
        style={{ width: size, height: size, borderRadius: 'var(--radius-md)', objectFit: 'contain', background: '#fff', border: '1px solid var(--color-border-base)', padding: 3, flexShrink: 0 }}
      />
    )
  }
  const c = PALETTE[hash(name) % PALETTE.length]
  return (
    <span
      aria-hidden
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: 'var(--radius-md)',
        background: c.bg,
        color: c.fg,
        display: 'grid',
        placeItems: 'center',
        fontWeight: 800,
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {firstLetter(name)}
    </span>
  )
}

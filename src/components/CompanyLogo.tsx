import { useState } from 'react'

/**
 * Managing-company badge. Renders the company's real logo when a matching asset
 * exists under /public/logos; if the file is missing (or not yet uploaded) it
 * falls back gracefully to a colored monogram. No logos are bundled in the repo.
 */

// Logo assets served from /public/logos (drop the SVG files there).
export const companyLogos: Record<string, string> = {
  migdal: '/logos/migdal.svg',
  harel: '/logos/harel.svg',
  menora: '/logos/menora.svg',
  clal: '/logos/clal.svg',
  phoenix: '/logos/phoenix.svg',
  ayalon: '/logos/ayalon.svg',
  hachshara: '/logos/hachshara.svg',
  meitav: '/logos/meitav.svg',
  altshuler: '/logos/altshuler-shaham.svg',
  more: '/logos/more.svg',
  analyst: '/logos/analyst.svg',
  yelin: '/logos/yelin-lapidot.svg',
  infinity: '/logos/infinity.svg',
}

// Match the (Hebrew) managing-company name reported in the file to a logo key.
const NAME_TO_KEY: { match: RegExp; key: keyof typeof companyLogos }[] = [
  { match: /מגדל/, key: 'migdal' },
  { match: /הראל/, key: 'harel' },
  { match: /מנורה/, key: 'menora' },
  { match: /כלל/, key: 'clal' },
  { match: /פניקס/, key: 'phoenix' },
  { match: /איילון|אילון/, key: 'ayalon' },
  { match: /הכשרה/, key: 'hachshara' },
  { match: /מיטב/, key: 'meitav' },
  { match: /אלטשולר/, key: 'altshuler' },
  { match: /ילין/, key: 'yelin' },
  { match: /אנליסט/, key: 'analyst' },
  { match: /אינפיניטי/, key: 'infinity' },
  { match: /מור(?!ה)/, key: 'more' },
]

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
function logoFor(name: string): string | undefined {
  const hit = NAME_TO_KEY.find((r) => r.match.test(name))
  return hit ? companyLogos[hit.key] : undefined
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

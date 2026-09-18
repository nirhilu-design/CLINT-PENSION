import { useState } from 'react'
import { producerKey } from '../config/producers'

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

// Name → canonical key mapping (incl. brand variants like מקפת→migdal,
// מבטחים→menora) lives in ../config/producers as the single source of truth.
function logoFor(name: string): string | undefined {
  const key = producerKey(name)
  return key ? companyLogos[key] : undefined
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

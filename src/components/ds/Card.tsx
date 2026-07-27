import type { CSSProperties, ReactNode } from 'react'

// Design-system card: white surface, large radius, soft shadow, generous padding.
export default function Card({
  children,
  style,
  padding = 24,
  className,
}: {
  children: ReactNode
  style?: CSSProperties
  padding?: number
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border-base)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// Section header used across cards: icon chip + title.
export function CardHeader({
  icon,
  title,
  tone = 'brand',
}: {
  icon: ReactNode
  title: string
  tone?: 'brand' | 'teal'
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 'var(--radius-md)',
          background: tone === 'teal' ? 'var(--teal-50)' : 'var(--clint-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: tone === 'teal' ? 'var(--teal-600)' : 'var(--clint-600)',
        }}
      >
        {icon}
      </span>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</div>
    </div>
  )
}

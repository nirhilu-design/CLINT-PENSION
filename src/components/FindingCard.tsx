import type { Finding } from '../models/types'
import { findingCategoryLabels, productTypeLabels } from '../models/labels'
import { useApp } from '../hooks/useAppState'

// Display kind derived from category+severity — six distinct visual levels,
// red reserved for real gaps only.
type DisplayKind = 'block' | 'gap' | 'attention' | 'missing' | 'insight' | 'info'

function kindOf(f: Finding): DisplayKind {
  if (f.category === 'limitation' && f.severity !== 'info') return 'block'
  if (f.category === 'limitation' || f.category === 'dataQuality') return 'missing'
  if (f.severity === 'gap') return 'gap'
  if (f.severity === 'attention') return 'attention'
  if (f.category === 'insight') return 'insight'
  return 'info'
}

// Every colour is a project design token (index.css), so findings match the rest
// of the app; chip text uses the darker token variants for WCAG-AA contrast.
const kindStyles: Record<DisplayKind, { border: string; chipBg: string; chipText: string; label: string }> = {
  block: { border: 'var(--neutral-600)', chipBg: 'var(--neutral-100)', chipText: 'var(--neutral-800)', label: 'ניתוח מוגבל' },
  gap: { border: 'var(--color-danger)', chipBg: 'var(--color-danger-bg)', chipText: 'var(--color-danger-dark)', label: 'נמצא פער' },
  attention: { border: 'var(--color-warning)', chipBg: 'var(--color-warning-bg)', chipText: 'var(--color-warning-dark)', label: 'נקודה לבדיקה' },
  missing: { border: 'var(--clint-400)', chipBg: 'var(--clint-50)', chipText: 'var(--clint-700)', label: 'מידע חסר' },
  insight: { border: 'var(--color-teal)', chipBg: 'var(--color-success-bg)', chipText: 'var(--color-success-dark)', label: 'הארה' },
  info: { border: 'var(--neutral-300)', chipBg: 'var(--neutral-100)', chipText: 'var(--neutral-600)', label: 'מידע' },
}

const linkStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-primary)',
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

export default function FindingCard({
  finding,
  interactive = true,
}: {
  finding: Finding
  interactive?: boolean
}) {
  const { dispatch } = useApp()
  const k = kindStyles[kindOf(finding)]

  return (
    <div
      style={{
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-base)',
        borderInlineStartWidth: 4,
        borderInlineStartColor: k.border,
        background: 'var(--color-bg-card)',
        padding: 14,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 'var(--radius-full)', background: k.chipBg, color: k.chipText }}>
          {k.label}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{findingCategoryLabels[finding.category]}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{finding.title}</span>
      </div>
      <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{finding.description}</p>

      {finding.basedOn && (
        <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--neutral-500)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>מבוסס על:</span> {finding.basedOn}
        </p>
      )}
      {finding.missingInfo && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--clint-700)' }}>
          <span style={{ fontWeight: 600 }}>להשלמת הבדיקה:</span> {finding.missingInfo}
        </p>
      )}

      {interactive && (finding.policyNumber || finding.productType) && (
        <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
          {finding.productType && (
            <button onClick={() => dispatch({ type: 'OPEN_PRODUCT', productType: finding.productType! })} style={linkStyle}>
              למסך {productTypeLabels[finding.productType]} ←
            </button>
          )}
          {finding.policyNumber && (
            <button onClick={() => dispatch({ type: 'OPEN_POLICY', policyNumber: finding.policyNumber! })} style={linkStyle}>
              לפרטי הפוליסה ←
            </button>
          )}
        </div>
      )}
    </div>
  )
}

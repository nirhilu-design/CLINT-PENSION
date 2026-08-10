import { useMemo, useState } from 'react'
import type { Finding } from '../models/types'
import { sortFindings, findingTier } from '../engines/findingPriority'
import { useApp } from '../hooks/useAppState'
import FindingList from './FindingList'
import { AlertTriangle, Lightbulb, TrendingUp, Check, type LucideIcon } from 'lucide-react'

// Three business buckets shown as circles, mirroring the dashboard structure.
type Bucket = 'findings' | 'returns' | 'insights'

// Returns/performance findings (return vs benchmark, Sharpe) go to "תשואות";
// remaining actionable findings (gap/attention) to "ממצאים"; the rest
// (info/insight observations) to "הארות".
function bucketOf(f: Finding): Bucket {
  if (f.category === 'investment' || f.title.startsWith('תשואה') || f.title.includes('שארפ')) return 'returns'
  if (f.severity === 'gap' || f.severity === 'attention') return 'findings'
  return 'insights'
}

const BUCKET_ORDER: Bucket[] = ['findings', 'returns', 'insights']

const bucketMeta: Record<Bucket, { label: string; Icon: LucideIcon; base: string; baseBg: string; baseText: string }> = {
  findings: { label: 'ממצאים', Icon: AlertTriangle, base: 'var(--clint-600)', baseBg: 'var(--clint-50)', baseText: 'var(--clint-700)' },
  returns: { label: 'תשואות', Icon: TrendingUp, base: 'var(--clint-700)', baseBg: 'var(--clint-50)', baseText: 'var(--clint-700)' },
  insights: { label: 'הארות', Icon: Lightbulb, base: 'var(--teal-500)', baseBg: 'var(--teal-50)', baseText: 'var(--teal-600)' },
}

interface Group {
  key: Bucket
  label: string
  Icon: LucideIcon
  findings: Finding[]
  gapCount: number
  attentionCount: number
}

// Highest severity present drives the accent; otherwise the bucket's base color.
function tone(g: Group) {
  const meta = bucketMeta[g.key]
  if (g.gapCount > 0)
    return { ring: '#fb7185', badgeBg: '#fee2e2', badgeText: '#be123c', grad: 'linear-gradient(135deg,#f43f5e,#be123c)' }
  if (g.attentionCount > 0)
    return { ring: '#fbbf24', badgeBg: '#fef3c7', badgeText: '#b45309', grad: 'linear-gradient(135deg,#f59e0b,#b45309)' }
  if (g.findings.length > 0)
    return { ring: meta.base, badgeBg: meta.baseBg, badgeText: meta.baseText, grad: `linear-gradient(135deg,${meta.base},${meta.base})` }
  return { ring: 'var(--color-border-base)', badgeBg: 'var(--neutral-100)', badgeText: 'var(--neutral-400)', grad: 'linear-gradient(135deg,var(--neutral-400),var(--neutral-500))' }
}

export default function ProductFindingCategories({ findings }: { findings: Finding[] }) {
  const groups = useMemo<Group[]>(() => {
    return BUCKET_ORDER.map((key) => {
      const fs = sortFindings(findings.filter((f) => bucketOf(f) === key))
      return {
        key,
        label: bucketMeta[key].label,
        Icon: bucketMeta[key].Icon,
        findings: fs,
        gapCount: fs.filter((f) => f.severity === 'gap').length,
        attentionCount: fs.filter((f) => f.severity === 'attention').length,
      }
    })
  }, [findings])

  const defaultKey = useMemo<Bucket | null>(() => {
    const withGap = groups.find((g) => g.gapCount > 0)
    const withAttention = groups.find((g) => g.attentionCount > 0)
    const withAny = groups.find((g) => g.findings.length > 0)
    return (withGap ?? withAttention ?? withAny ?? groups[0])?.key ?? null
  }, [groups])

  const [selected, setSelected] = useState<Bucket | null>(defaultKey)
  const active = groups.find((g) => g.key === (selected ?? defaultKey)) ?? null

  const { state } = useApp()
  const clientView = state.viewMode === 'client'
  const visibleCount = (g: Group) =>
    clientView ? g.findings.filter((f) => findingTier(f) !== 'note').length : g.findings.length

  return (
    <div>
      {/* Category circles */}
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {groups.map((g) => {
          const t = tone(g)
          const isActive = active?.key === g.key
          const empty = visibleCount(g) === 0
          return (
            <button
              key={g.key}
              onClick={() => setSelected(g.key)}
              aria-pressed={isActive}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 0',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: empty ? 'var(--color-bg-card)' : t.grad,
                  color: empty ? 'var(--neutral-400)' : '#fff',
                  boxShadow: isActive ? `0 0 0 3px var(--color-bg-card), 0 0 0 6px ${t.ring}` : 'var(--shadow-card)',
                  border: empty ? '1px solid var(--color-border-base)' : 'none',
                  transition: 'box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                <g.Icon size={26} />
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    insetInlineStart: -4,
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    borderRadius: 'var(--radius-full)',
                    background: empty ? 'var(--teal-50)' : t.badgeBg,
                    color: empty ? 'var(--teal-600)' : t.badgeText,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--color-bg-card)',
                  }}
                >
                  {empty ? <Check size={12} /> : visibleCount(g)}
                </span>
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                }}
              >
                {g.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected bucket panel */}
      {active && (
        <div style={{ marginTop: 18, borderTop: '1px solid var(--color-border-base)', paddingTop: 18 }}>
          <FindingList findings={active.findings} />
        </div>
      )}
    </div>
  )
}

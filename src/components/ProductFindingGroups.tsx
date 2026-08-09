import { useMemo, useState } from 'react'
import type { Finding, ProductType, Policy } from '../models/types'
import { productTypeLabels } from '../models/labels'
import { sortFindings } from '../engines/findingPriority'
import FindingCard from './FindingCard'
import {
  Landmark,
  Briefcase,
  Wallet,
  TrendingUp,
  GraduationCap,
  HeartPulse,
  Umbrella,
  HelpCircle,
  Layers,
  Check,
  type LucideIcon,
} from 'lucide-react'

const PRODUCT_ORDER: ProductType[] = [
  'pension',
  'managers',
  'gemel',
  'gemelInvestment',
  'education',
  'life',
  'incomeProtection',
  'unknown',
]

// Findings without a productType (client/analysis-level) collect under this key.
const GENERAL = 'general'
type GroupKey = ProductType | typeof GENERAL

const productIcon: Record<ProductType, LucideIcon> = {
  pension: Landmark,
  managers: Briefcase,
  gemel: Wallet,
  gemelInvestment: TrendingUp,
  education: GraduationCap,
  life: HeartPulse,
  incomeProtection: Umbrella,
  unknown: HelpCircle,
}

const groupLabel: Record<GroupKey, string> = {
  ...productTypeLabels,
  [GENERAL]: 'כללי / חוצה-מוצר',
}

interface Group {
  key: GroupKey
  label: string
  Icon: LucideIcon
  findings: Finding[]
  gapCount: number
  attentionCount: number
}

// Highest severity present in the group drives its accent color.
function severityTone(g: Group): { ring: string; badgeBg: string; badgeText: string; grad: string } {
  if (g.gapCount > 0)
    return {
      ring: 'var(--rose-400, #fb7185)',
      badgeBg: '#fee2e2',
      badgeText: '#be123c',
      grad: 'linear-gradient(135deg,#f43f5e,#be123c)',
    }
  if (g.attentionCount > 0)
    return {
      ring: 'var(--amber-400, #fbbf24)',
      badgeBg: '#fef3c7',
      badgeText: '#b45309',
      grad: 'linear-gradient(135deg,#f59e0b,#b45309)',
    }
  if (g.findings.length > 0)
    return {
      ring: 'var(--teal-400, #2dd4bf)',
      badgeBg: 'var(--teal-50)',
      badgeText: 'var(--teal-600)',
      grad: 'linear-gradient(135deg,var(--teal-500),var(--teal-600))',
    }
  return {
    ring: 'var(--color-border-base)',
    badgeBg: 'var(--neutral-100)',
    badgeText: 'var(--neutral-400)',
    grad: 'linear-gradient(135deg,var(--neutral-400),var(--neutral-500))',
  }
}

export default function ProductFindingGroups({
  findings,
  policies,
}: {
  findings: Finding[]
  policies: Policy[]
}) {
  const groups = useMemo<Group[]>(() => {
    // Products present in the portfolio, plus any product a finding points at.
    const present = new Set<ProductType>(policies.map((p) => p.productType))
    findings.forEach((f) => f.productType && present.add(f.productType))

    const productGroups: Group[] = PRODUCT_ORDER.filter((t) => present.has(t)).map((t) => {
      const fs = sortFindings(findings.filter((f) => f.productType === t))
      return {
        key: t,
        label: groupLabel[t],
        Icon: productIcon[t],
        findings: fs,
        gapCount: fs.filter((f) => f.severity === 'gap').length,
        attentionCount: fs.filter((f) => f.severity === 'attention').length,
      }
    })

    const generalFindings = sortFindings(findings.filter((f) => !f.productType))
    if (generalFindings.length > 0) {
      productGroups.push({
        key: GENERAL,
        label: groupLabel[GENERAL],
        Icon: Layers,
        findings: generalFindings,
        gapCount: generalFindings.filter((f) => f.severity === 'gap').length,
        attentionCount: generalFindings.filter((f) => f.severity === 'attention').length,
      })
    }
    return productGroups
  }, [findings, policies])

  // Open the most pressing group by default so the client lands on real content.
  const defaultKey = useMemo<GroupKey | null>(() => {
    const withGap = groups.find((g) => g.gapCount > 0)
    const withAttention = groups.find((g) => g.attentionCount > 0)
    const withAny = groups.find((g) => g.findings.length > 0)
    return (withGap ?? withAttention ?? withAny ?? groups[0])?.key ?? null
  }, [groups])

  const [selected, setSelected] = useState<GroupKey | null>(defaultKey)
  const active = groups.find((g) => g.key === (selected ?? defaultKey)) ?? null

  if (groups.length === 0) return null

  return (
    <div>
      {/* Circles */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(112px,1fr))',
          gap: 14,
        }}
      >
        {groups.map((g) => {
          const tone = severityTone(g)
          const isActive = active?.key === g.key
          const empty = g.findings.length === 0
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
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  background: empty ? 'var(--color-bg-card)' : tone.grad,
                  color: empty ? 'var(--neutral-400)' : '#fff',
                  boxShadow: isActive ? `0 0 0 3px var(--color-bg-page), 0 0 0 6px ${tone.ring}` : 'var(--shadow-card)',
                  border: empty ? '1px solid var(--color-border-base)' : 'none',
                  transition: 'box-shadow 200ms var(--ease-out), transform 200ms var(--ease-out)',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                }}
              >
                <g.Icon size={28} />
                {/* Count badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    insetInlineStart: -4,
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    borderRadius: 'var(--radius-full)',
                    background: empty ? 'var(--teal-50)' : tone.badgeBg,
                    color: empty ? 'var(--teal-600)' : tone.badgeText,
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    display: 'grid',
                    placeItems: 'center',
                    border: '2px solid var(--color-bg-page)',
                  }}
                >
                  {empty ? <Check size={12} /> : g.findings.length}
                </span>
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  textAlign: 'center',
                  lineHeight: 1.3,
                  maxWidth: 100,
                }}
              >
                {g.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel for the selected group */}
      {active && (
        <div
          style={{
            marginTop: 20,
            borderTop: '1px solid var(--color-border-base)',
            paddingTop: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              הארות · {active.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
              {active.findings.length > 0
                ? `${active.findings.length} הארות`
                : 'לא עלו הארות למוצר זה'}
            </span>
          </div>
          {active.findings.length === 0 ? (
            <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', margin: 0 }}>
              לא נמצאו נקודות לבדיקה במוצר זה על בסיס הנתונים שנקלטו.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12 }}>
              {active.findings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

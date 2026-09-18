import { useState } from 'react'
import Card from './ds/Card'
import AssetDonut, { type AssetSlice } from './AssetDonut'
import RetirementProjection from './RetirementProjection'
import ReturnsPerformance from './ReturnsPerformance'
import { useIsMobile } from '../hooks/useMediaQuery'
import type { Policy, ProductType } from '../models/types'
import { PieChart, BarChart3, ChevronRight, ChevronLeft } from 'lucide-react'

type Tab = 'overview' | 'performance'

/**
 * "תמונת התיק" — the single central card of the dashboard. Two tabs switch its
 * body in place (no extra big card is added to the screen):
 *   - תמונת מצב: asset-allocation donut + today-vs-retirement pension, side by side.
 *   - ביצועים ותשואות: per-product returns.
 */
export default function PortfolioOverviewCard({
  slices,
  onSelectProduct,
  currentAge,
  retirementAge,
  currentAccumulation,
  currentPension,
  projectedAccumulation,
  projectedPension,
  hasProjection,
  policies,
  colorFor,
}: {
  slices: AssetSlice[]
  onSelectProduct: (t: ProductType) => void
  currentAge: number | null
  retirementAge: number
  currentAccumulation: number
  currentPension: number
  projectedAccumulation: number
  projectedPension: number
  hasProjection: boolean
  policies: Policy[]
  colorFor: (t: ProductType) => string
}) {
  const mobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('overview')

  const TABS: { key: Tab; label: string; icon: typeof PieChart }[] = [
    { key: 'overview', label: 'תמונת מצב', icon: PieChart },
    { key: 'performance', label: 'ביצועים ותשואות', icon: BarChart3 },
  ]

  return (
    <Card padding={mobile ? 16 : 22} style={{ marginBottom: 24 }}>
      {/* Header: title · tabs · 1/2 nav */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          marginBottom: mobile ? 16 : 20,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: mobile ? 17 : 19, fontWeight: 800, color: 'var(--color-text-primary)' }}>תמונת התיק</div>
          {!mobile && (
            <div style={{ fontSize: 12.5, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              ניתוח כולל של הנכסים, הקצבה והביצועים
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Tabs (segmented control) */}
          <div style={{ display: 'inline-flex', background: 'var(--neutral-100)', borderRadius: 'var(--radius-full)', padding: 4, gap: 2 }} role="tablist">
            {TABS.map((t) => {
              const active = tab === t.key
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: mobile ? '7px 12px' : '8px 16px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: 13,
                    fontWeight: active ? 700 : 600,
                    fontFamily: 'inherit',
                    border: 'none',
                    cursor: 'pointer',
                    background: active ? 'var(--clint-600)' : 'transparent',
                    color: active ? '#fff' : 'var(--color-text-secondary)',
                    boxShadow: active ? '0 1px 4px rgba(47,107,255,0.35)' : 'none',
                    transition: 'background 160ms var(--ease-out), color 160ms var(--ease-out)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Secondary 1/2 pager */}
          {!mobile && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <PagerBtn
                dir="prev"
                disabled={tab === 'overview'}
                onClick={() => setTab('overview')}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', minWidth: 26, textAlign: 'center' }}>
                {tab === 'overview' ? 1 : 2} / 2
              </span>
              <PagerBtn
                dir="next"
                disabled={tab === 'performance'}
                onClick={() => setTab('performance')}
              />
            </div>
          )}
        </div>
      </div>

      {/* Body — switches in place */}
      <div key={tab} className="clint-rise">
        {tab === 'overview' ? (
          mobile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {slices.length > 0 && <AssetDonut slices={slices} onSelect={onSelectProduct} bare heading="התפלגות נכסים" />}
              {slices.length > 0 && hasProjection && <div style={{ height: 1, background: 'var(--color-border-base)' }} />}
              {hasProjection && (
                <RetirementProjection
                  bare
                  heading="קצבה היום ובגיל פרישה"
                  currentAge={currentAge}
                  retirementAge={retirementAge}
                  currentAccumulation={currentAccumulation}
                  currentPension={currentPension}
                  projectedAccumulation={projectedAccumulation}
                  projectedPension={projectedPension}
                />
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: hasProjection && slices.length > 0 ? 'minmax(0,1fr) 1px minmax(0,1.15fr)' : '1fr', gap: 22, alignItems: 'stretch' }}>
              {slices.length > 0 && <AssetDonut slices={slices} onSelect={onSelectProduct} bare heading="התפלגות נכסים" />}
              {slices.length > 0 && hasProjection && <div style={{ background: 'var(--color-border-base)' }} />}
              {hasProjection && (
                <RetirementProjection
                  bare
                  heading="קצבה היום ובגיל פרישה"
                  currentAge={currentAge}
                  retirementAge={retirementAge}
                  currentAccumulation={currentAccumulation}
                  currentPension={currentPension}
                  projectedAccumulation={projectedAccumulation}
                  projectedPension={projectedPension}
                />
              )}
            </div>
          )
        ) : (
          <ReturnsPerformance policies={policies} colorFor={colorFor} />
        )}
      </div>
    </Card>
  )
}

function PagerBtn({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  // In RTL, "next" (advance the pager) points left.
  const Icon = dir === 'next' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'next' ? 'הבא' : 'הקודם'}
      style={{
        width: 30,
        height: 30,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-base)',
        background: 'var(--color-bg-card)',
        display: 'grid',
        placeItems: 'center',
        cursor: disabled ? 'default' : 'pointer',
        color: disabled ? 'var(--color-text-tertiary)' : 'var(--color-text-secondary)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Icon size={16} />
    </button>
  )
}

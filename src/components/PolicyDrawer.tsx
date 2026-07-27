import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Finding, Policy, TreasuryAllocation } from '../models/types'
import { coverageTypeLabels, productTypeLabels } from '../models/labels'
import { formatCurrency, formatDate, formatPercent } from '../utils/format'
import FindingCard from './FindingCard'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '22px 0 10px' }}>
      {children}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)', marginTop: 2 }}>{value}</div>
    </div>
  )
}

function status(p: Policy): { label: string; dot: string } {
  if (p.temporaryRisk) return { label: 'ריסק זמני', dot: 'var(--color-warning)' }
  if (p.status === 'active') return { label: 'פעיל', dot: 'var(--color-success)' }
  return { label: 'לא פעיל', dot: 'var(--neutral-400)' }
}

export default function PolicyDrawer({
  policy,
  findings,
  allocation,
  onClose,
}: {
  policy: Policy
  findings: Finding[]
  allocation?: TreasuryAllocation
  onClose: () => void
}) {
  const [entered, setEntered] = useState(false)
  const policyFindings = findings.filter((f) => f.policyNumber === policy.policyNumber)
  const st = status(policy)
  const employer = policy.contributions.find((c) => c.role === 'employer')
  const employee = policy.contributions.find((c) => c.role === 'employee')
  const isPensionLike = policy.productType === 'pension' || policy.productType === 'managers'

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--color-bg-overlay)',
          backdropFilter: 'blur(8px)',
          opacity: entered ? 1 : 0,
          transition: 'opacity 220ms var(--ease-out)',
        }}
      />
      <aside
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: 480,
          maxWidth: '94vw',
          background: 'var(--color-bg-card)',
          boxShadow: '-8px 0 32px rgba(13,34,64,0.22)',
          transform: entered ? 'translateX(0)' : 'translateX(110%)',
          transition: 'transform 220ms var(--ease-out)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-base)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: st.dot }} />
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {policy.managingCompany ?? policy.productName ?? productTypeLabels[policy.productType]}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
              פוליסה {policy.policyNumber} · {st.label} · {productTypeLabels[policy.productType]}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="סגירה"
            style={{ cursor: 'pointer', width: 30, height: 30, borderRadius: '50%', background: 'var(--neutral-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none' }}
          >
            <X size={16} color="var(--neutral-600)" />
          </button>
        </div>

        {/* Body */}
        <div className="clint-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 24px 28px' }}>
          <SectionLabel>פרטים פיננסיים</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Tile label="שווי נוכחי" value={formatCurrency(policy.currentValue)} />
            <Tile label="שכר מבוטח" value={formatCurrency(policy.coveredSalary)} />
            <Tile label="הפקדה אחרונה" value={policy.lastDepositMonth ?? '—'} />
            <Tile label="תאריך הצטרפות" value={formatDate(policy.openDate)} />
            <Tile label="מספר אוצר" value={policy.mofid ?? '—'} />
            <Tile label="תשואה נטו" value={formatPercent(policy.netReturn)} />
          </div>

          <SectionLabel>הפקדות ודמי ניהול</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Tile label="הפקדת מעסיק" value={employer ? formatPercent(employer.percent) : '—'} />
            <Tile label="הפקדת עובד" value={employee ? formatPercent(employee.percent) : '—'} />
            <Tile label="דמי ניהול מהפקדה" value={formatPercent(policy.fees.fromDeposit)} />
            <Tile label="דמי ניהול מצבירה" value={formatPercent(policy.fees.fromAccumulation)} />
          </div>

          {isPensionLike && (
            <>
              <SectionLabel>קצבה וצבירה חזויות</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Tile label="קצבה — בהמשך הפקדות" value={formatCurrency(policy.expectedPensionWithDeposits)} />
                <Tile label="קצבה — ללא הפקדות" value={formatCurrency(policy.expectedPensionWithoutDeposits)} />
                <Tile label="צבירה חזויה — בהפקדות" value={formatCurrency(policy.expectedAccumulationWithDeposits)} />
                <Tile label="צבירה חזויה — ללא הפקדות" value={formatCurrency(policy.expectedAccumulationWithoutDeposits)} />
                {policy.productType === 'managers' && (
                  <Tile label="מקדם קצבה מובטח" value={policy.hasGuaranteedFactor ? 'קיים' : 'לא קיים'} />
                )}
                {policy.savingsAllocationPercent !== null && (
                  <Tile label="הקצאה לחיסכון" value={formatPercent(policy.savingsAllocationPercent, 0)} />
                )}
              </div>
            </>
          )}

          {policy.investmentTracks.length > 0 && (
            <>
              <SectionLabel>מסלולי השקעה</SectionLabel>
              {policy.investmentTracks.map((t, i) => (
                <div key={i} style={{ borderRadius: 'var(--radius-md)', background: 'var(--neutral-50)', padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{t.name ?? 'מסלול ללא שם'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(t.value)}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 4, fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    {t.returnNet !== null && <span>תשואה נטו: {formatPercent(t.returnNet)}</span>}
                    {t.feeFromAccumulation !== null && <span>ד"נ מצבירה: {formatPercent(t.feeFromAccumulation)}</span>}
                  </div>
                </div>
              ))}
            </>
          )}

          {allocation && allocation.groups.length > 0 && (
            <>
              <SectionLabel>אפיקי השקעה (נתוני אוצר)</SectionLabel>
              {allocation.groups.map((g) => (
                <div key={g.name} style={{ padding: '5px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>{g.name}</span>
                    <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{g.percent.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--neutral-100)', marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, background: 'var(--clint-600)', width: `${Math.min(100, Math.max(0, g.percent))}%` }} />
                  </div>
                </div>
              ))}
            </>
          )}

          <SectionLabel>כיסויים ביטוחיים</SectionLabel>
          {policy.coverages.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>לא דווחו כיסויים</p>
          ) : (
            policy.coverages.map((c, i) => (
              <div key={i} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-border-base)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{coverageTypeLabels[c.type]}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(c.amount)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                  {c.name ? `${c.name} · ` : ''}
                  {c.percent !== null ? `שיעור ${formatPercent(c.percent, 0)} · ` : ''}
                  עלות חודשית: {formatCurrency(c.cost)}
                </div>
              </div>
            ))
          )}

          <SectionLabel>מוטבים</SectionLabel>
          {policy.beneficiaries.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>לא דווחו מוטבים בקובץ</p>
          ) : (
            policy.beneficiaries.map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--color-border-base)', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{b.name ?? b.relation ?? 'מוטב'}{b.name && b.relation ? ` · ${b.relation}` : ''}</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
                  {b.allocationPercent !== null ? formatPercent(b.allocationPercent, 0) : '—'}
                </span>
              </div>
            ))
          )}

          <SectionLabel>ממצאים ({policyFindings.length})</SectionLabel>
          {policyFindings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>אין ממצאים לפוליסה זו</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policyFindings.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

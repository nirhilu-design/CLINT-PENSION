import { useState } from 'react'
import type { Finding, Policy } from '../models/types'
import { coverageTypeLabels, productTypeLabels } from '../models/labels'
import { formatCurrency, formatDate, formatPercent } from '../utils/format'
import FindingCard from './FindingCard'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-2">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium">{value}</span>
    </div>
  )
}

const contributionLabels: Record<string, string> = {
  employee: 'עובד',
  employer: 'מעסיק',
  severance: 'פיצויים',
  other: 'אחר',
}

export default function PolicyDrawer({
  policy,
  findings,
  onClose,
}: {
  policy: Policy
  findings: Finding[]
  onClose: () => void
}) {
  const [findingsOpen, setFindingsOpen] = useState(true)
  const policyFindings = findings.filter((f) => f.policyNumber === policy.policyNumber)

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute top-0 left-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{policy.productName ?? productTypeLabels[policy.productType]}</h2>
            <p className="text-sm text-slate-500">{policy.managingCompany}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none" aria-label="סגירה">
            ×
          </button>
        </div>

        <Section title="פרטי פוליסה">
          <Row label="מספר פוליסה / חשבון" value={policy.policyNumber || '—'} />
          <Row label="סוג מוצר" value={productTypeLabels[policy.productType]} />
          <Row label="מספר אוצר" value={policy.mofid ?? '—'} />
          <Row label="תאריך הצטרפות" value={formatDate(policy.openDate)} />
          <Row label="סטטוס" value={policy.status === 'active' ? 'פעיל' : policy.status === 'inactive' ? 'לא פעיל' : '—'} />
        </Section>

        <Section title="מידע פיננסי">
          <Row label="יתרה צבורה" value={formatCurrency(policy.currentValue)} />
          <Row label="קצבה חודשית צפויה" value={formatCurrency(policy.expectedPension)} />
          <Row label="צבירה צפויה לפרישה" value={formatCurrency(policy.expectedAccumulationAtRetirement)} />
          <Row label="שכר מבוטח" value={formatCurrency(policy.coveredSalary)} />
          {policy.productType === 'managers' && (
            <Row label="מקדם קצבה מובטח" value={policy.hasGuaranteedFactor ? 'קיים' : 'לא קיים'} />
          )}
          <Row label='דמי ניהול מהפקדה' value={formatPercent(policy.fees.fromDeposit)} />
          <Row label='דמי ניהול מצבירה' value={formatPercent(policy.fees.fromAccumulation)} />
          <Row label="תשואה נטו" value={formatPercent(policy.netReturn)} />
          {policy.contributions.length > 0 && (
            <div className="mt-2 text-sm text-slate-600">
              הפרשות:{' '}
              {policy.contributions
                .map((c) => `${contributionLabels[c.role]} ${formatPercent(c.percent)}`)
                .join(' · ')}
            </div>
          )}
        </Section>

        <Section title="כיסויים ביטוחיים">
          {policy.coverages.length === 0 ? (
            <p className="text-sm text-slate-400">לא דווחו כיסויים</p>
          ) : (
            policy.coverages.map((c, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-2.5 mb-2 text-sm">
                <div className="font-medium text-slate-700">{coverageTypeLabels[c.type]}</div>
                {c.name && <div className="text-xs text-slate-500 mt-0.5">{c.name}</div>}
                <div className="flex flex-wrap gap-x-4 mt-1 text-slate-600">
                  <span>סכום: {formatCurrency(c.amount)}</span>
                  {c.percent !== null && <span>שיעור: {formatPercent(c.percent, 0)}</span>}
                  {c.cost !== null && <span>עלות חודשית: {formatCurrency(c.cost)}</span>}
                </div>
              </div>
            ))
          )}
        </Section>

        <Section title="מוטבים">
          {policy.beneficiaries.length === 0 ? (
            <p className="text-sm text-slate-400">לא דווחו מוטבים בקובץ</p>
          ) : (
            policy.beneficiaries.map((b, i) => (
              <Row
                key={i}
                label={b.name ?? b.relation ?? 'מוטב'}
                value={b.allocationPercent !== null ? formatPercent(b.allocationPercent, 0) : (b.relation ?? '—')}
              />
            ))
          )}
        </Section>

        <section>
          <button
            onClick={() => setFindingsOpen(!findingsOpen)}
            className="w-full flex justify-between items-center font-semibold text-slate-700 border-b border-slate-200 pb-1 mb-2"
          >
            <span>ממצאים ({policyFindings.length})</span>
            <span className="text-slate-400">{findingsOpen ? '▴' : '▾'}</span>
          </button>
          {findingsOpen && (
            <div className="space-y-2">
              {policyFindings.length === 0 ? (
                <p className="text-sm text-slate-400">אין ממצאים לפוליסה זו</p>
              ) : (
                policyFindings.map((f) => <FindingCard key={f.id} finding={f} />)
              )}
            </div>
          )}
        </section>
      </aside>
    </div>
  )
}

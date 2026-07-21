import { useApp } from '../hooks/useAppState'
import { productTypeLabels } from '../models/labels'
import type { EmploymentStatus } from '../models/types'
import { formatCurrency, formatDate } from '../utils/format'

const employmentLabels: Record<EmploymentStatus, string> = {
  employee: 'שכיר/ה',
  selfEmployed: 'עצמאי/ת',
  both: 'שכיר/ה + עצמאי/ת',
  notWorking: 'לא עובד/ת כיום',
}

function ageFromBirthDate(iso: string | null): number | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return null
  const today = new Date()
  let age = today.getFullYear() - y
  const hadBirthday = today.getMonth() + 1 > m || (today.getMonth() + 1 === m && today.getDate() >= d)
  if (!hadBirthday) age -= 1
  return age >= 0 && age < 120 ? age : null
}

function yesNo(v: boolean | null): string {
  if (v === null) return 'לא דווח'
  return v ? 'כן' : 'לא'
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 border-t border-slate-100 first:border-t-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium tabular text-left ${muted ? 'text-slate-300' : 'text-slate-800'}`}>
        {value}
      </span>
    </div>
  )
}

function Section({
  title,
  source,
  children,
}: {
  title: string
  source: 'files' | 'client'
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        <span
          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            source === 'files' ? 'bg-brand-50 text-brand-700' : 'bg-teal-50 text-teal-700'
          }`}
        >
          {source === 'files' ? 'מהקבצים' : 'מדווח הלקוח'}
        </span>
      </div>
      <div>{children}</div>
    </section>
  )
}

export default function PersonalDetailsPage() {
  const { state, dispatch } = useApp()
  const analysis = state.analysis!
  const { client, policies, supplementary: s } = analysis

  const age = ageFromBirthDate(client.birthDate)
  const genderLabel = client.gender === 'male' ? 'זכר' : client.gender === 'female' ? 'נקבה' : 'לא דווח'

  const activePolicies = policies.filter((p) => p.status === 'active')
  const totalAssets = policies.reduce((sum, p) => sum + (p.currentValue ?? 0), 0)
  const productTypes = [...new Set(policies.map((p) => p.productType))]
  const companies = [...new Set(policies.map((p) => p.managingCompany).filter(Boolean))] as string[]
  const insuredSalaries = policies.map((p) => p.coveredSalary).filter((v): v is number => v !== null && v > 0)
  const insuredSalary = insuredSalaries.length ? Math.max(...insuredSalaries) : null
  const retirementAges = [...new Set(policies.map((p) => p.retirementAge).filter((v): v is number => v !== null))]
  const totalExpectedPension = policies.reduce((sum, p) => sum + (p.expectedPension ?? 0), 0) || null
  const lastDeposit = policies.map((p) => p.lastDepositMonth).filter(Boolean).sort().pop() as string | undefined

  return (
    <div>
      {/* Hero band — consistent identity with the other screens */}
      <div className="bg-gradient-to-l from-brand-900 via-brand-800 to-brand-700 text-white">
        <div className="max-w-4xl mx-auto px-6 pt-8 pb-10">
          <button
            onClick={() => dispatch({ type: 'GO_DASHBOARD' })}
            className="text-xs text-slate-300/80 hover:text-white transition mb-2"
          >
            → חזרה לדשבורד
          </button>
          <h1 className="text-2xl font-bold">פרטים אישיים</h1>
          <p className="text-sm text-slate-300/80 mt-1">
            תמונת מצב מסכמת — כל הפרטים מהקבצים לצד מה שדווח על ידי הלקוח
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-4 pb-12 space-y-4">
        <Section title="פרטי הלקוח" source="files">
          <Row label="שם מלא" value={client.fullName || '—'} />
          <Row label="תעודת זהות" value={client.id || '—'} />
          <Row
            label="תאריך לידה"
            value={
              client.birthDate
                ? `${formatDate(client.birthDate)}${age !== null ? ` · גיל ${age}` : ''}`
                : 'לא דווח'
            }
            muted={!client.birthDate}
          />
          <Row label="מין" value={genderLabel} muted={!client.gender} />
          <Row label='דוא"ל' value={client.email || 'לא דווח'} muted={!client.email} />
          <Row label="טלפון" value={client.phone || 'לא דווח'} muted={!client.phone} />
        </Section>

        <Section title="תעסוקה ומשפחה" source="client">
          <Row
            label="מעמד תעסוקתי"
            value={s.employmentStatus ? employmentLabels[s.employmentStatus] : 'לא דווח'}
            muted={!s.employmentStatus}
          />
          <Row
            label="שכר ברוטו נוכחי"
            value={s.currentGrossSalary !== null ? formatCurrency(s.currentGrossSalary) : 'לא דווח'}
            muted={s.currentGrossSalary === null}
          />
          <Row label="בן/בת זוג" value={yesNo(s.hasSpouse)} muted={s.hasSpouse === null} />
          <Row
            label="ילדים מתחת לגיל 21"
            value={yesNo(s.hasChildrenUnder21)}
            muted={s.hasChildrenUnder21 === null}
          />
          <Row
            label="המשפחה מסתמכת על ההכנסה"
            value={yesNo(s.familyReliesOnIncome)}
            muted={s.familyReliesOnIncome === null}
          />
        </Section>

        {s.hasOtherMaterialAssets && (
          <Section title="נכסים נוספים" source="client">
            <Row
              label="נדל״ן"
              value={s.otherAssetsRealEstateValue !== null ? formatCurrency(s.otherAssetsRealEstateValue) : 'לא דווח'}
              muted={s.otherAssetsRealEstateValue === null}
            />
            <Row
              label="תיק ניירות ערך"
              value={s.otherAssetsPortfolioValue !== null ? formatCurrency(s.otherAssetsPortfolioValue) : 'לא דווח'}
              muted={s.otherAssetsPortfolioValue === null}
            />
            <Row
              label="נכסים נזילים"
              value={s.otherAssetsLiquidValue !== null ? formatCurrency(s.otherAssetsLiquidValue) : 'לא דווח'}
              muted={s.otherAssetsLiquidValue === null}
            />
          </Section>
        )}

        <Section title="תמצית התיק" source="files">
          <Row label="מספר מוצרים · פוליסות" value={`${productTypes.length} · ${policies.length}`} />
          <Row label="פוליסות פעילות" value={String(activePolicies.length)} />
          <Row label="סוגי מוצרים" value={productTypes.map((t) => productTypeLabels[t]).join(', ') || '—'} />
          <Row label="חברות מנהלות" value={companies.join(', ') || 'לא דווח'} muted={companies.length === 0} />
          <Row label="סך נכסים" value={formatCurrency(totalAssets)} />
          <Row
            label="שכר מבוטח (מהקבצים)"
            value={insuredSalary !== null ? formatCurrency(insuredSalary) : 'לא דווח'}
            muted={insuredSalary === null}
          />
          <Row
            label="גיל פרישה"
            value={retirementAges.length ? retirementAges.join(', ') : 'לא דווח'}
            muted={retirementAges.length === 0}
          />
          <Row
            label="קצבה חודשית צפויה"
            value={totalExpectedPension !== null ? formatCurrency(totalExpectedPension) : 'לא דווח'}
            muted={totalExpectedPension === null}
          />
          <Row label="הפקדה אחרונה" value={lastDeposit ?? 'לא דווח'} muted={!lastDeposit} />
        </Section>
      </div>
    </div>
  )
}

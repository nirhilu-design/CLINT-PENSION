import type { Policy, PeerComparisonGroup, TreasuryFundData } from '../models/types'
import { comparePeers, type PeerMetric } from '../services/peerComparisonService'
import { formatPercent } from '../utils/format'
import Card from './ds/Card'

const METRIC_LABEL: Record<PeerMetric, string> = {
  return12m: '12 חודשים',
  return3yAnnualized: '3 שנים',
  return5yAnnualized: '5 שנים',
  sharpe: 'שארפ',
}

const cell: React.CSSProperties = { padding: '9px 10px', fontFamily: 'var(--font-mono)', textAlign: 'start' }
const head: React.CSSProperties = { padding: '9px 10px', fontSize: 11.5, fontWeight: 600, color: 'var(--color-text-tertiary)', textAlign: 'start', whiteSpace: 'nowrap' }

function fmtSharpe(v: number | null | undefined) {
  return v == null ? '—' : v.toFixed(2)
}

/**
 * Ranks each of this product's funds against its peer group, using treasury numbers
 * for the client's fund and every competitor alike (matched by מ"ה). The advisor loads
 * the peer tables and the treasury files in the advisor area.
 */
export default function PeerComparisonTable({
  policies,
  treasuryFunds,
  peerGroups,
  metric = 'return12m',
}: {
  policies: Policy[]
  treasuryFunds: TreasuryFundData[]
  peerGroups: PeerComparisonGroup[]
  metric?: PeerMetric
}) {
  const comparisons = comparePeers(policies, treasuryFunds, peerGroups, metric)

  if (comparisons.length === 0) {
    return (
      <Card>
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>
          אין קופות עם מספר אוצר (מ"ה) להשוואה במוצר זה.
        </p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {comparisons.map((cmp) => {
        const clientRow = cmp.rows.find((r) => r.isClient)
        const clientName = clientRow?.name ?? cmp.clientMofid
        return (
          <Card key={cmp.policyNumber}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>{clientName}</div>
              {cmp.group ? (
                cmp.clientRank ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      padding: '4px 11px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--clint-50)',
                      color: 'var(--clint-700)',
                    }}
                  >
                    מדורגת {cmp.clientRank} מתוך {cmp.ranked} · {cmp.group.category}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                    אין נתוני אוצר לקופה זו · {cmp.group.category}
                  </span>
                )
              ) : (
                <span style={{ fontSize: 12, color: 'var(--color-warning-dark)', background: 'var(--color-warning-bg)', padding: '4px 11px', borderRadius: 'var(--radius-full)' }}>
                  לא הוגדרה קבוצת השוואה — טען טבלה באזור יועץ
                </span>
              )}
            </div>

            {cmp.group && (
              <div style={{ overflowX: 'auto', marginTop: 10 }}>
                <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border-base)' }}>
                      <th style={{ ...head, width: 24 }}>#</th>
                      <th style={head}>קופה</th>
                      <th style={head}>מ"ה</th>
                      <th style={{ ...head, background: metric === 'return12m' ? 'var(--clint-50)' : undefined }}>12ח׳</th>
                      <th style={head}>3ש (שנתי)</th>
                      <th style={head}>5ש (שנתי)</th>
                      <th style={head}>שארפ</th>
                      <th style={head}>דמי ניהול</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmp.rows.map((r, i) => {
                      const hasData = r.fund !== null
                      return (
                        <tr
                          key={r.mofid}
                          style={{
                            borderBottom: '1px solid var(--color-border-base)',
                            background: r.isClient ? 'var(--clint-50)' : undefined,
                          }}
                        >
                          <td style={{ ...cell, color: 'var(--color-text-tertiary)' }}>{hasData ? i + 1 : '—'}</td>
                          <td style={{ padding: '9px 10px', fontWeight: r.isClient ? 700 : 500, color: r.isClient ? 'var(--clint-700)' : 'var(--color-text-primary)', textAlign: 'start' }}>
                            {r.isClient && <span style={{ fontSize: 11, marginInlineEnd: 6, color: 'var(--clint-600)' }}>● הקופה שלך</span>}
                            {r.name ?? '—'}
                          </td>
                          <td style={{ ...cell, color: 'var(--color-text-tertiary)' }}>{r.mofid}</td>
                          {hasData ? (
                            <>
                              <td style={{ ...cell, fontWeight: metric === 'return12m' ? 700 : 500 }}>{formatPercent(r.fund!.return12m)}</td>
                              <td style={cell}>{formatPercent(r.fund!.return3yAnnualized)}</td>
                              <td style={cell}>{formatPercent(r.fund!.return5yAnnualized)}</td>
                              <td style={cell}>{fmtSharpe(r.fund!.sharpe)}</td>
                              <td style={cell}>{formatPercent(r.fund!.avgFeeFromAccumulation)}</td>
                            </>
                          ) : (
                            <td colSpan={5} style={{ ...cell, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-ui)' }}>
                              אין נתוני אוצר למ"ה זה — טען קובץ גמל-נט/פנסיה-נט הכולל אותו
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8 }}>
                  כל המספרים מנתוני האוצר (ברוטו נומינלי), מדורג לפי {METRIC_LABEL[metric]}. השוואה עובדתית — נקודה לבחינה מול בעל רישיון.
                </div>
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// Issuer Exposure & Quality Engine (#8).
// 1. Concentration: how much of the portfolio sits with one managing company.
// 2. Quality: the client's funds' Sharpe vs the market's strong funds
//    (highest Sharpe across the whole market — not within one sector).
// Observations only.

import type { Engine } from './engineTypes'
import { makeFinding } from './engineTypes'
import { formatCurrency } from '../utils/format'
import {
  ISSUER_CONCENTRATION_SHARE,
  ISSUER_CONCENTRATION_MIN_VALUE,
  SHARPE_BELOW_LEADERS_GAP,
  MARKET_LEADERS_COUNT,
} from '../config/thresholds'

export const issuerEngine: Engine = ({ policies, supplementary }) => {
  const findings = []
  const active = policies.filter((p) => p.status === 'active' && (p.currentValue ?? 0) > 0)
  const totalValue = active.reduce((s, p) => s + (p.currentValue ?? 0), 0)

  // 1. Concentration by managing company
  if (totalValue >= ISSUER_CONCENTRATION_MIN_VALUE) {
    const byCompany = new Map<string, number>()
    for (const p of active) {
      const c = p.managingCompany ?? 'לא ידוע'
      byCompany.set(c, (byCompany.get(c) ?? 0) + (p.currentValue ?? 0))
    }
    const [topCompany, topValue] = [...byCompany.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
    const share = topValue / totalValue
    if (byCompany.size > 1 && share >= ISSUER_CONCENTRATION_SHARE) {
      findings.push(
        makeFinding({
          category: 'investment',
          level: 'client',
          severity: 'attention',
          title: 'חשיפה גבוהה ליצרן אחד',
          description:
            `כ-${Math.round(share * 100)}% מהנכסים (${formatCurrency(topValue)}) מנוהלים אצל ${topCompany}. ` +
            'ריכוז גבוה אצל גוף אחד מגדיל את התלות בו — כדאי לבחון פיזור בין גופים מנהלים.',
          basedOn: 'סכימת הצבירה לפי חברה מנהלת מקבצי המסלקה',
        }),
      )
    }
  }

  // 2. Quality vs the market's strong funds (Sharpe)
  const sharpes = supplementary.treasuryMarketFunds
    .map((f) => f.sharpe)
    .filter((s): s is number => s !== null)
    .sort((a, b) => a - b)
  if (sharpes.length >= 8) {
    const median = sharpes[Math.floor(sharpes.length / 2)]
    const leaders = [...supplementary.treasuryMarketFunds]
      .filter((f) => f.sharpe !== null)
      .sort((a, b) => (b.sharpe ?? 0) - (a.sharpe ?? 0))

    for (const fund of supplementary.treasuryFunds) {
      if (fund.sharpe === null) continue
      const ownerPolicy = policies.find((p) => p.mofid === fund.mofid)
      const belowMedian = median - fund.sharpe > SHARPE_BELOW_LEADERS_GAP
      const topList = leaders
        .filter((l) => l.name !== fund.name)
        .slice(0, MARKET_LEADERS_COUNT)
        .map((l) => `${l.company ?? l.name} (שארפ ${l.sharpe?.toFixed(2)})`)
        .join(', ')
      findings.push(
        makeFinding({
          category: 'investment',
          level: 'policy',
          severity: belowMedian ? 'attention' : 'info',
          title: belowMedian ? 'מדד שארפ נמוך מחציון השוק' : 'השוואת איכות מול השוק (שארפ)',
          description:
            `הקופה (${fund.name ?? fund.mofid}) מציגה מדד שארפ ${fund.sharpe.toFixed(2)}` +
            (fund.stdDev36m != null ? ` וסטיית תקן ${fund.stdDev36m.toFixed(2)}` : '') +
            `, לעומת חציון שוק של ${median.toFixed(2)}. ` +
            `מבין המובילים בשוק: ${topList}. ` +
            (belowMedian
              ? 'מדד שארפ גבוה יותר מעיד על תשואה טובה יותר ביחס לסיכון — כדאי לבחון את התאמת המסלול.'
              : 'מדד שארפ גבוה יותר מעיד על תשואה טובה יותר ביחס לסיכון — נקודה להכרה.'),
          basedOn: 'השוואת מדד שארפ מול כלל הקופות בקבצי נתוני האוצר שנטענו',
          productType: ownerPolicy?.productType,
          policyNumber: ownerPolicy?.policyNumber,
        }),
      )
    }
  }

  return findings
}

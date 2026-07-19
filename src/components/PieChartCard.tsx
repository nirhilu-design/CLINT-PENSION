import { useState } from 'react'
import { PieChart, Pie, Cell, Sector, Tooltip, ResponsiveContainer } from 'recharts'
import type { PieSectorDataItem } from 'recharts/types/polar/Pie'
import { formatCurrency } from '../utils/format'

// Categorical palette validated with the dataviz six-checks validator
// (light surface #ffffff): lightness band, chroma, CVD and normal-vision
// separation all pass; low-contrast slots are relieved by the visible
// value legend below the chart.
const COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7']

export interface PieSlice {
  name: string
  value: number
  key?: string // stable identifier passed back on click (falls back to name)
}

// Hovered slice pops outward
function ActiveSlice(props: PieSectorDataItem) {
  const { outerRadius = 0 } = props
  return <Sector {...props} outerRadius={outerRadius + 7} />
}

export default function PieChartCard({
  title,
  data,
  onSliceClick,
}: {
  title: string
  data: PieSlice[]
  onSliceClick?: (key: string) => void
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const [active, setActive] = useState<number | undefined>(undefined)

  const pick = (i: number) => onSliceClick?.(data[i].key ?? data[i].name)

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/70">
      <h3 className="font-semibold text-slate-700">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">אין נתונים להצגה</p>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={86}
                  paddingAngle={1.5}
                  strokeWidth={2}
                  stroke="#ffffff"
                  isAnimationActive={false}
                  activeIndex={active}
                  activeShape={ActiveSlice}
                  onMouseEnter={(_, i) => setActive(i)}
                  onMouseLeave={() => setActive(undefined)}
                  onClick={(_, i) => pick(i)}
                  className={onSliceClick ? 'cursor-pointer' : ''}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{
                    direction: 'rtl',
                    fontFamily: 'inherit',
                    borderRadius: 10,
                    border: '1px solid #e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
              <div className="text-center">
                <div className="text-xs text-slate-400">סה"כ</div>
                <div className="text-lg font-bold text-slate-800 tabular">{formatCurrency(total)}</div>
              </div>
            </div>
          </div>
          <ul className="mt-3 space-y-0.5">
            {data.map((d, i) => (
              <li key={d.name}>
                <button
                  onClick={() => pick(i)}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(undefined)}
                  disabled={!onSliceClick}
                  className={`w-full flex items-center justify-between text-sm rounded-lg px-2 py-1 transition ${
                    onSliceClick ? 'hover:bg-slate-50 cursor-pointer' : ''
                  } ${active === i ? 'bg-slate-50' : ''}`}
                >
                  <span className="flex items-center gap-2 text-slate-600 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="truncate">{d.name}</span>
                  </span>
                  <span className="text-slate-700 font-medium tabular shrink-0">
                    {formatCurrency(d.value)}
                    <span className="text-slate-400 font-normal text-xs mr-1.5">
                      {total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

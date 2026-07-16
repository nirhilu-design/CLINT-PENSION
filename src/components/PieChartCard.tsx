import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../utils/format'

// Categorical palette validated with the dataviz six-checks validator
// (light surface #ffffff): lightness band, chroma, CVD and normal-vision
// separation all pass; low-contrast slots are relieved by the visible
// value legend below the chart.
const COLORS = ['#2a78d6', '#008300', '#e87ba4', '#eda100', '#1baf7a', '#eb6834', '#4a3aa7']

export interface PieSlice {
  name: string
  value: number
}

export default function PieChartCard({ title, data }: { title: string; data: PieSlice[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)

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
                  outerRadius={88}
                  paddingAngle={1.5}
                  strokeWidth={2}
                  stroke="#ffffff"
                  isAnimationActive={false}
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
          <ul className="mt-3 space-y-1.5">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between text-sm">
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
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

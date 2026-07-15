import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../utils/format'

const COLORS = ['#2563eb', '#0891b2', '#7c3aed', '#059669', '#d97706', '#dc2626', '#64748b']

export interface PieSlice {
  name: string
  value: number
}

export default function PieChartCard({ title, data }: { title: string; data: PieSlice[] }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm border border-slate-200">
      <h3 className="font-semibold text-slate-700 mb-2">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center">אין נתונים להצגה</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatCurrency(v)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

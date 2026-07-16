const steps = ['העלאת קבצים', 'מידע משלים', 'ניתוח']

export default function StepsIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8" dir="rtl">
      {steps.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'active' : 'next'
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <span className="w-8 h-px bg-slate-300" />}
            <span
              className={`w-6 h-6 rounded-full grid place-items-center text-xs font-bold ${
                state === 'done'
                  ? 'bg-emerald-500 text-white'
                  : state === 'active'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-500'
              }`}
            >
              {state === 'done' ? '✓' : n}
            </span>
            <span className={`text-sm ${state === 'active' ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { Landmark, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react'

// THEORETICAL / DEMO screen. It does NOT contact the pension clearinghouse and
// sends nothing — it mocks the future flow (request → results arrive → auto-load).
// The demo banner makes that explicit so it is never mistaken for a real request.
type Phase = 'form' | 'sending' | 'sent'

export default function ClearinghouseRequest() {
  const [phase, setPhase] = useState<Phase>('form')
  const [id, setId] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  const idValid = /^\d{9}$/.test(id.trim())
  const phoneValid = /^0\d{8,9}$/.test(phone.trim())
  const canSend = idValid && phoneValid && consent

  function send() {
    if (!canSend) return
    setPhase('sending')
    // Demo only — simulate the round-trip; no network call is made.
    setTimeout(() => setPhase('sent'), 1600)
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm overflow-hidden">
      {/* Demo banner */}
      <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs px-4 py-2 text-center">
        מסך הדגמה — אינו שולח בקשה בפועל למסלקה. הנתונים עדיין נטענים מהעלאת קבצים.
      </div>

      <div className="p-5">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-10 h-10 rounded-xl bg-brand-50 grid place-items-center shrink-0">
            <Landmark size={20} color="#1a4270" />
          </span>
          <div>
            <h2 className="font-bold text-slate-800 text-lg leading-tight">בקשת מידע מהמסלקה הפנסיונית</h2>
            <p className="text-xs text-slate-500 mt-0.5">בקשה מרוכזת לכל המוצרים — התוצאות ייטענו אוטומטית עם קבלתן</p>
          </div>
        </div>

        {phase === 'form' && (
          <div className="mt-5 flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-slate-700">תעודת זהות</span>
              <input
                inputMode="numeric"
                value={id}
                onChange={(e) => setId(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="9 ספרות"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700">טלפון נייד</span>
              <input
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, '').slice(0, 10))}
                placeholder="לקבלת עדכון כשהתוצאות מוכנות"
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-700" />
              <span className="text-xs text-slate-600 leading-relaxed">
                אני מאשר/ת בקשת מידע פנסיוני מהמסלקה עבור תעודת הזהות שלעיל, לצורך ניתוח התיק.
              </span>
            </label>
            <button
              onClick={send}
              disabled={!canSend}
              className="w-full rounded-xl bg-gradient-to-l from-brand-800 to-brand-700 text-white font-semibold py-3.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              שליחת בקשה למסלקה
            </button>
          </div>
        )}

        {phase === 'sending' && (
          <div className="mt-6 flex flex-col items-center text-center py-6 gap-3">
            <span className="w-11 h-11 rounded-full border-2 border-brand-100 border-t-brand-700 animate-spin" />
            <div className="text-sm font-semibold text-slate-700">שולח בקשה למסלקה…</div>
            <div className="text-xs text-slate-400">מאתר את כל המוצרים הפנסיוניים המשויכים</div>
          </div>
        )}

        {phase === 'sent' && (
          <div className="mt-5 flex flex-col gap-4">
            <div className="rounded-xl bg-teal-50 border border-teal-200 p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-teal-800">הבקשה נשלחה</div>
                <div className="text-xs text-teal-700 mt-0.5 leading-relaxed">
                  עם קבלת התוצאות מהמסלקה הן ייטענו אוטומטית לניתוח. נעדכן ב-SMS כשהתיק מוכן.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock size={14} /> ממתין לתוצאות מהמסלקה…
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 border-t border-slate-100 pt-3">
              <ShieldCheck size={13} /> הנתונים מעובדים במכשיר בלבד — פרטי לחלוטין.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import type { Finding } from '../models/types'
import { findingTier } from '../engines/findingPriority'
import { useApp } from '../hooks/useAppState'
import FindingCard from './FindingCard'
import { ChevronDown, ChevronLeft } from 'lucide-react'

// Renders a finding list split by presentation tier:
//   important + insight → always shown.
//   note (background/מידע) → hidden in client view; in advisor view shown in a
//   collapsed "additional notes" accordion so it never overloads the client.
export default function FindingList({ findings }: { findings: Finding[] }) {
  const { state } = useApp()
  const clientView = state.viewMode === 'client'
  const [open, setOpen] = useState(false)

  const primary = findings.filter((f) => findingTier(f) !== 'note')
  const notes = findings.filter((f) => findingTier(f) === 'note')

  const grid: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
    gap: 12,
  }

  return (
    <div>
      {primary.length > 0 ? (
        <div style={grid}>
          {primary.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
        </div>
      ) : (
        notes.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', margin: 0 }}>אין נקודות לבדיקה</p>
        )
      )}

      {/* Background notes — advisor view only, collapsed by default */}
      {!clientView && notes.length > 0 && (
        <div style={{ marginTop: primary.length > 0 ? 14 : 0 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
              padding: '4px 0',
              color: 'var(--color-text-tertiary)',
              fontSize: 12.5,
              fontWeight: 600,
            }}
          >
            {open ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
            {open ? 'הסתרת הערות מידע' : `הצגת ${notes.length} הערות מידע (רקע)`}
          </button>
          {open && (
            <div style={{ ...grid, marginTop: 10 }}>
              {notes.map((f) => (
                <FindingCard key={f.id} finding={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

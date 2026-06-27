import React, { useRef, useState } from 'react'

export default function UploadPanel({ onParse, loading }) {
  const dataRef = useRef(null)
  const agrRef = useRef(null)
  const [dataFile, setDataFile] = useState(null)
  const [agrFile, setAgrFile] = useState(null)
  const [error, setError] = useState(null)

  function handleDrop(setter, e) {
    e.preventDefault()
    const f = e.dataTransfer?.files[0]
    if (f) setter(f)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!dataFile) { setError('יש לבחור קובץ DATA'); return }
    setError(null)
    try {
      const dataBuffer = await dataFile.arrayBuffer()
      const agrBuffer = agrFile ? await agrFile.arrayBuffer() : null
      await onParse(dataBuffer, agrBuffer)
    } catch (err) {
      setError(err.message || 'שגיאה בניתוח הקובץ')
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ background: 'var(--color-surface)', borderRadius: 16, padding: 40, width: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--color-text)' }}>מערכת ניתוח תיק פנסיה</h1>
        <p style={{ margin: '0 0 32px', color: 'var(--color-text-muted)', fontSize: 14 }}>העלה קובץ DATA לניתוח מלא</p>

        <form onSubmit={handleSubmit}>
          <DropZone
            label="קובץ DATA *"
            hint="Excel עם גיליונות קרן פנסיה"
            file={dataFile}
            onChange={setDataFile}
            inputRef={dataRef}
            accept=".xlsx,.xls"
            required
          />

          <DropZone
            label="קובץ הסכמי מעסיק (אופציונלי)"
            hint="אם חסר — יחפש גיליון 'הסכמי מעסיק' בקובץ DATA"
            file={agrFile}
            onChange={setAgrFile}
            inputRef={agrRef}
            accept=".xlsx,.xls"
          />

          {error && (
            <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !dataFile}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              background: loading || !dataFile ? '#cbd5e1' : 'var(--color-primary)',
              color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading || !dataFile ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'מנתח...' : 'נתח קובץ'}
          </button>
        </form>
      </div>
    </div>
  )
}

function DropZone({ label, hint, file, onChange, inputRef, accept, required }) {
  const [dragging, setDragging] = useState(false)

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13 }}>{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { setDragging(false); e.preventDefault(); const f = e.dataTransfer?.files[0]; if (f) onChange(f) }}
        style={{
          border: `2px dashed ${dragging ? 'var(--color-primary)' : file ? '#22c55e' : 'var(--color-border)'}`,
          borderRadius: 8, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--color-primary-light)' : file ? '#f0fdf4' : '#f8fafc',
          transition: 'all 0.2s',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>{file ? '✅' : '📂'}</div>
        <div style={{ fontSize: 13, color: file ? 'var(--color-ok)' : 'var(--color-text-muted)', fontWeight: file ? 600 : 400 }}>
          {file ? file.name : 'גרור קובץ לכאן או לחץ לבחירה'}
        </div>
        {!file && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</div>}
      </div>
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} required={required}
        onChange={e => onChange(e.target.files[0] || null)} />
    </div>
  )
}

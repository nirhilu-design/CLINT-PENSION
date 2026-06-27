import React, { useRef, useState } from 'react'

export default function UploadPanel({ onParse, loading }) {
  const inputRef = useRef(null)
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)

  function addFiles(newFiles) {
    const xmlFiles = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.xml'))
    if (xmlFiles.length === 0) {
      setError('יש לבחור קובצי XML בלבד')
      return
    }
    setError(null)
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name))
      const merged = [...prev, ...xmlFiles.filter(f => !existing.has(f.name))]
      return merged
    })
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer?.files || [])
  }

  function handleChange(e) {
    addFiles(e.target.files || [])
    e.target.value = ''
  }

  function removeFile(name) {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (files.length === 0) return
    setError(null)
    try {
      await onParse(files)
    } catch (err) {
      setError(err.message || 'שגיאה בניתוח הקבצים')
    }
  }

  const canSubmit = files.length > 0 && !loading

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)', direction: 'rtl',
    }}>
      <div style={{
        background: 'var(--color-surface)', borderRadius: 16, padding: 40, width: 540,
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, color: 'var(--color-text)' }}>
          מערכת ניתוח תיק פנסיה
        </h1>
        <p style={{ margin: '0 0 32px', color: 'var(--color-text-muted)', fontSize: 14 }}>
          העלה קובצי XML של הלקוח לניתוח מלא
        </p>

        <form onSubmit={handleSubmit}>
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragging ? 'var(--color-primary)' : files.length > 0 ? '#22c55e' : 'var(--color-border)'}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? 'var(--color-primary-light)' : files.length > 0 ? '#f0fdf4' : '#f8fafc',
              transition: 'all 0.2s', marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>{files.length > 0 ? '✅' : '📂'}</div>
            <div style={{ fontSize: 14, color: files.length > 0 ? 'var(--color-ok)' : 'var(--color-text-muted)', fontWeight: 600 }}>
              {files.length > 0
                ? `${files.length} ${files.length === 1 ? 'קובץ נבחר' : 'קבצים נבחרו'}`
                : 'גרור קבצי XML לכאן או לחץ לבחירה'}
            </div>
            {files.length === 0 && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                ניתן לבחור מספר קבצים בו-זמנית
              </div>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xml"
            multiple
            style={{ display: 'none' }}
            onChange={handleChange}
          />

          {/* File list */}
          {files.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {files.map(f => (
                <div key={f.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f1f5f9', borderRadius: 6, padding: '8px 12px', marginBottom: 6,
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>📄 {f.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#94a3b8', fontSize: 16, padding: '0 4px', lineHeight: 1,
                    }}
                    title="הסר קובץ"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div style={{
              background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
              padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 8, border: 'none',
              background: canSubmit ? 'var(--color-primary)' : '#cbd5e1',
              color: '#fff', fontWeight: 700, fontSize: 15,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'מנתח...' : 'נתח קבצים'}
          </button>
        </form>
      </div>
    </div>
  )
}

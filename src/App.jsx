import React, { useState } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import { parseManagerFile } from './parsing/parseManagerFile.js'
import { buildPensionAnalytics } from './unified/analyticsEngine.js'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState(null)

  async function handleParse(dataBuffer, agrBuffer) {
    setLoading(true)
    setError(null)
    try {
      const result = await parseManagerFile(dataBuffer, agrBuffer)
      const analyticsResult = buildPensionAnalytics(result.unifiedRows, result.agreements)
      setAnalytics(analyticsResult)
    } catch (err) {
      setError(err.message || 'שגיאה בניתוח')
    } finally {
      setLoading(false)
    }
  }

  if (analytics) {
    return <Dashboard analytics={analytics} onReset={() => setAnalytics(null)} />
  }

  return (
    <>
      <UploadPanel onParse={handleParse} loading={loading} />
      {error && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
          border: '1px solid #fecaca', borderRadius: 8, padding: '12px 18px', fontSize: 14,
        }}>
          {error}
        </div>
      )}
    </>
  )
}

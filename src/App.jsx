import React, { useState } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import { parseXmlFiles } from './parsing/parseXmlFiles.js'
import { buildPensionAnalytics } from './unified/analyticsEngine.js'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState(null)
  const [error, setError] = useState(null)

  async function handleParse(fileArray) {
    setLoading(true)
    setError(null)
    try {
      const result = await parseXmlFiles(fileArray)
      const analyticsResult = buildPensionAnalytics(result.unifiedRows, [])
      setAnalytics({ ...analyticsResult, clientInfo: result.clientInfo })
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

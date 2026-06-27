import React, { useState } from 'react'
import UploadPanel from './components/UploadPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import ClientProfileModal from './components/ClientProfileModal.jsx'
import { parseXmlFiles } from './parsing/parseXmlFiles.js'
import { buildPensionAnalytics } from './unified/analyticsEngine.js'

export default function App() {
  const [loading, setLoading] = useState(false)
  const [parseResult, setParseResult] = useState(null)   // { unifiedRows, clientInfo }
  const [analytics, setAnalytics] = useState(null)
  const [clientProfile, setClientProfile] = useState(null)
  const [error, setError] = useState(null)

  async function handleParse(fileArray) {
    setLoading(true)
    setError(null)
    try {
      const result = await parseXmlFiles(fileArray)
      if (!result.unifiedRows.length) throw new Error('לא נמצאו נתוני פנסיה בקבצים')
      setParseResult(result)
      // ClientProfileModal will open next
    } catch (err) {
      setError(err.message || 'שגיאה בניתוח הקבצים')
    } finally {
      setLoading(false)
    }
  }

  function handleProfileConfirm(profile) {
    setClientProfile(profile)
    try {
      const analyticsResult = buildPensionAnalytics(parseResult.unifiedRows, [], profile)
      setAnalytics({ ...analyticsResult, clientInfo: parseResult.clientInfo })
    } catch (err) {
      setError(err.message || 'שגיאה בבניית הניתוח')
      setParseResult(null)
    }
  }

  function handleReset() {
    setAnalytics(null)
    setParseResult(null)
    setClientProfile(null)
    setError(null)
  }

  if (analytics) {
    return <Dashboard analytics={analytics} clientProfile={clientProfile} onReset={handleReset} />
  }

  return (
    <>
      <UploadPanel onParse={handleParse} loading={loading} />

      {/* Client profile modal — shown after XML parsed, before dashboard */}
      {parseResult && !analytics && (
        <ClientProfileModal clientInfo={parseResult.clientInfo} onConfirm={handleProfileConfirm} />
      )}

      {error && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
          border: '1px solid #fecaca', borderRadius: 8, padding: '12px 18px', fontSize: 14,
          zIndex: 200,
        }}>
          {error}
        </div>
      )}
    </>
  )
}

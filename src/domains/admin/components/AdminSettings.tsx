import { useState, useEffect } from 'react'
import { Save, ExternalLink, AlertCircle } from 'lucide-react'
import { getAppSettings, updateAppSettings } from '@/lib/firebase/appSettings'

export default function AdminSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [externalUrl, setExternalUrl] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const data = await getAppSettings()
      setExternalUrl(data.externalComparisonUrl || '')
    } catch (err) {
      console.error('Error loading settings:', err)
      setError('שגיאה בטעינת ההגדרות')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      // Validate URL if provided
      if (externalUrl && !isValidUrl(externalUrl)) {
        setError('נא להזין כתובת URL תקינה')
        setSaving(false)
        return
      }

      await updateAppSettings({
        externalComparisonUrl: externalUrl || undefined,
      })

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Error saving settings:', err)
      setError('שגיאה בשמירת ההגדרות')
    } finally {
      setSaving(false)
    }
  }

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">הגדרות</h1>
        <p className="text-neon-gray-400 text-sm">הגדרות כלליות של האפליקציה</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <p className="text-green-400">ההגדרות נשמרו בהצלחה</p>
        </div>
      )}

      {/* External Comparison Link Section */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <ExternalLink className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">קישור להשוואה בין לאומית</h2>
            <p className="text-neon-gray-400 text-sm">הגדר את הקישור שיפתח בלחיצה על הקוביה בדשבורד</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm text-neon-gray-400">כתובת URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            className="input-primary w-full"
            dir="ltr"
          />
          <p className="text-xs text-neon-gray-500">
            אם השדה ריק, הקוביה לא תופיע בדשבורד
          </p>
        </div>

        {/* Preview */}
        {externalUrl && isValidUrl(externalUrl) && (
          <div className="bg-neon-gray-800 rounded-lg p-3 text-sm">
            <span className="text-neon-gray-400">תצוגה מקדימה: </span>
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline break-all"
              dir="ltr"
            >
              {externalUrl}
            </a>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saving ? 'שומר...' : 'שמור הגדרות'}</span>
        </button>
      </div>
    </div>
  )
}

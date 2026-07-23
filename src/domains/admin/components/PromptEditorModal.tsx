import { useState } from 'react'
import {
  X,
  Save,
  RotateCcw,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  History,
  Pencil,
  Braces,
  CheckCircle2,
} from 'lucide-react'
import {
  saveAIPromptConfig,
  resetAIPromptConfig,
  getAIPromptVersions,
  type AIPromptVersion,
} from '@/lib/firebase/aiPrompts'
import { consultAIPrompt, type PromptAdvisorResult } from '../services/promptAdvisorService'
import type { AIPromptDefinition } from '../data/aiPromptRegistry'

interface PromptEditorModalProps {
  def: AIPromptDefinition
  initialSystemPrompt: string
  initialModel: string
  initialMaxTokens: string
  hasOverride: boolean
  userEmail?: string
  onClose: () => void
  onSaved: (saved: { systemPrompt: string; model: string; maxTokens: number }) => void
  onReset: () => void
}

type EditorTab = 'edit' | 'consult' | 'history'

export default function PromptEditorModal({
  def,
  initialSystemPrompt,
  initialModel,
  initialMaxTokens,
  hasOverride,
  userEmail,
  onClose,
  onSaved,
  onReset,
}: PromptEditorModalProps) {
  const [tab, setTab] = useState<EditorTab>('edit')
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt)
  const [model, setModel] = useState(initialModel)
  const [maxTokens, setMaxTokens] = useState(initialMaxTokens)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Consultation state
  const [consultRequest, setConsultRequest] = useState('')
  const [consulting, setConsulting] = useState(false)
  const [consultError, setConsultError] = useState<string | null>(null)
  const [advice, setAdvice] = useState<PromptAdvisorResult | null>(null)
  const [missingPlaceholders, setMissingPlaceholders] = useState<string[]>([])

  // History state
  const [versions, setVersions] = useState<AIPromptVersion[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const markEdited = () => setDirty(true)

  const attemptClose = () => {
    if (dirty && !window.confirm('יש שינויים שלא נשמרו. לסגור בלי לשמור?')) return
    onClose()
  }

  const validate = (): string | null => {
    if (!systemPrompt.trim()) return 'הפרומפט לא יכול להיות ריק'
    if (!model.trim()) return 'שם המודל לא יכול להיות ריק'
    const tokens = Number(maxTokens)
    if (!Number.isFinite(tokens) || tokens <= 0) return 'מקסימום טוקנים חייב להיות מספר חיובי'
    for (const variable of def.templateVariables) {
      if (!systemPrompt.includes(`{{${variable.name}}}`)) {
        return `הפרומפט חייב לכלול את המשתנה {{${variable.name}}} — הוא מוחלף אוטומטית בזמן ריצה`
      }
    }
    return null
  }

  const handleSaveClick = () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setTab('edit')
      return
    }
    setError(null)
    setConfirmOpen(true)
  }

  const handleConfirmedSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const payload = {
        systemPrompt,
        model: model.trim(),
        maxTokens: Math.floor(Number(maxTokens)),
      }
      await saveAIPromptConfig(def.id, payload, userEmail)
      setDirty(false)
      setConfirmOpen(false)
      setVersions(null) // force history refresh on next open
      onSaved(payload)
    } catch (err) {
      console.error('Failed to save prompt:', err)
      setError('שגיאה בשמירת הפרומפט')
      setConfirmOpen(false)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm(`לשחזר את "${def.titleHe}" לברירת המחדל המובנית? הגרסה הערוכה תוסר מהמערכת (תישמר בהיסטוריה).`)) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      await resetAIPromptConfig(def.id, userEmail)
      setDirty(false)
      onReset()
    } catch (err) {
      console.error('Failed to reset prompt:', err)
      setError('שגיאה בשחזור לברירת מחדל')
    } finally {
      setSaving(false)
    }
  }

  const handleConsult = async () => {
    if (!consultRequest.trim()) {
      setConsultError('כתוב מה תרצה לשנות בפרומפט')
      return
    }
    setConsulting(true)
    setConsultError(null)
    setAdvice(null)
    const response = await consultAIPrompt({
      promptTitle: def.titleHe,
      currentPrompt: systemPrompt,
      userRequest: consultRequest,
    })
    setConsulting(false)
    if (!response.success || !response.result) {
      setConsultError(response.error || 'הייעוץ נכשל')
      return
    }
    setAdvice(response.result)
    setMissingPlaceholders(response.missingPlaceholders ?? [])
  }

  const applyAdvice = () => {
    if (!advice) return
    setSystemPrompt(advice.revisedPrompt)
    setDirty(true)
    setTab('edit')
  }

  const openHistory = async () => {
    setTab('history')
    if (versions !== null) return
    try {
      setHistoryError(null)
      setVersions(await getAIPromptVersions(def.id))
    } catch (err) {
      console.error('Failed to load prompt history:', err)
      setHistoryError('שגיאה בטעינת ההיסטוריה')
    }
  }

  const loadVersion = (version: AIPromptVersion) => {
    if (!version.systemPrompt) return
    setSystemPrompt(version.systemPrompt)
    if (version.model) setModel(version.model)
    if (version.maxTokens) setMaxTokens(String(version.maxTokens))
    setDirty(true)
    setTab('edit')
  }

  const tabButton = (key: EditorTab, label: string, Icon: typeof Pencil, onClick?: () => void) => (
    <button
      onClick={onClick ?? (() => setTab(key))}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors ${
        tab === key
          ? 'bg-primary-500/20 text-primary-400 font-medium'
          : 'text-neon-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center">
      {/* Backdrop — clicking it closes (iron rule) */}
      <div className="absolute inset-0 bg-black/70" onClick={attemptClose} />

      {/* Panel */}
      <div className="relative w-full h-full sm:h-[90vh] sm:max-w-4xl sm:rounded-2xl bg-dark-surface border border-dark-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 sm:p-5 border-b border-dark-border">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-white text-lg">{def.titleHe}</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300" dir="ltr">
                {def.provider} · {model}
              </span>
              {hasOverride ? (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">מותאם אישית</span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-neon-gray-700 text-neon-gray-300">ברירת מחדל</span>
              )}
            </div>
            <p className="text-neon-gray-400 text-sm mt-1">{def.descriptionHe}</p>
          </div>
          {/* Dedicated close button — 44x44 minimum (iron rule) */}
          <button
            onClick={attemptClose}
            aria-label="סגור"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-neon-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-4 sm:px-5 py-2 border-b border-dark-border overflow-x-auto">
          {tabButton('edit', 'עריכה', Pencil)}
          {tabButton('consult', 'ייעוץ AI', Sparkles)}
          {tabButton('history', 'היסטוריה', History, openHistory)}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 sm:mx-5 mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {tab === 'edit' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-neon-gray-400">מודל ({def.provider})</label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => { setModel(e.target.value); markEdited() }}
                    className="input-primary w-full"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-neon-gray-400">מקסימום טוקנים בתשובה</label>
                  <input
                    type="number"
                    min={1}
                    value={maxTokens}
                    onChange={(e) => { setMaxTokens(e.target.value); markEdited() }}
                    className="input-primary w-full"
                    dir="ltr"
                  />
                </div>
              </div>

              {def.templateVariables.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-1">
                  {def.templateVariables.map((variable) => (
                    <div key={variable.name} className="flex items-start gap-2 text-sm">
                      <Braces className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-blue-300">
                        <span className="font-mono" dir="ltr">{`{{${variable.name}}}`}</span>
                        {' — '}
                        {variable.descriptionHe}. אסור למחוק את המשתנה מהפרומפט.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-neon-gray-400">פרומפט מערכת (System Prompt)</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => { setSystemPrompt(e.target.value); markEdited() }}
                  className="input-primary w-full min-h-[45vh] text-sm leading-relaxed resize-y"
                  dir="rtl"
                  aria-label={`פרומפט מערכת — ${def.titleHe}`}
                />
              </div>

              <div className="bg-neon-gray-800 rounded-lg p-3">
                <p className="text-sm text-neon-gray-300 font-medium mb-1">
                  נתונים שמצורפים אוטומטית בזמן ריצה (לא ניתנים לעריכה):
                </p>
                <ul className="text-xs text-neon-gray-400 space-y-0.5 list-disc pr-4">
                  {def.runtimeContextHe.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {tab === 'consult' && (
            <>
              <div className="space-y-2">
                <label className="text-sm text-neon-gray-400">מה תרצה לשנות בפרומפט?</label>
                <textarea
                  value={consultRequest}
                  onChange={(e) => setConsultRequest(e.target.value)}
                  placeholder="לדוגמה: אני רוצה שההמלצות משקל יהיו שמרניות יותר למתאמנים חדשים"
                  className="input-primary w-full min-h-[100px] text-sm resize-y"
                  dir="rtl"
                  aria-label="בקשת שינוי לייעוץ AI"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleConsult}
                  disabled={consulting}
                  className="btn-primary flex items-center gap-2"
                >
                  {consulting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{consulting ? 'בוחן את הפרומפט...' : 'התייעץ עם ה-AI'}</span>
                </button>
                <p className="text-xs text-neon-gray-500">הייעוץ בוחן את הפרומפט הנוכחי בעורך (כולל שינויים שטרם נשמרו)</p>
              </div>

              {consultError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{consultError}</p>
                </div>
              )}

              {advice && (
                <div className="space-y-4">
                  <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">ניתוח</h3>
                    <p className="text-sm text-neon-gray-300 whitespace-pre-wrap">{advice.analysis}</p>
                  </div>

                  <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">המלצות</h3>
                    <ul className="space-y-2">
                      {advice.recommendations.map((rec) => (
                        <li key={rec} className="flex items-start gap-2 text-sm text-neon-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {missingPlaceholders.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-300 text-sm" >
                        שים לב: ההצעה השמיטה משתני זמן-ריצה חובה ({missingPlaceholders.join(', ')}).
                        אם תחיל אותה — החזר אותם ידנית לפני שמירה, אחרת השמירה תיחסם.
                      </p>
                    </div>
                  )}

                  <div className="card p-4 space-y-2">
                    <h3 className="text-sm font-semibold text-white">הפרומפט המוצע</h3>
                    <pre className="text-xs text-neon-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto bg-neon-gray-800 rounded-lg p-3" dir="rtl">
                      {advice.revisedPrompt}
                    </pre>
                    <button onClick={applyAdvice} className="btn-primary flex items-center gap-2">
                      <Pencil className="w-4 h-4" />
                      <span>החל את ההצעה בעורך</span>
                    </button>
                    <p className="text-xs text-neon-gray-500">
                      ההצעה תיטען לעורך בלבד — שום דבר לא מתעדכן במערכת עד שתלחץ "שמור".
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'history' && (
            <>
              {historyError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{historyError}</p>
                </div>
              )}
              {versions === null && !historyError && (
                <div className="flex items-center justify-center py-10"><div className="spinner"></div></div>
              )}
              {versions !== null && versions.length === 0 && (
                <p className="text-neon-gray-400 text-sm py-6 text-center">
                  אין עדיין היסטוריית שינויים — כל שמירה תתועד כאן.
                </p>
              )}
              {versions !== null && versions.length > 0 && (
                <ul className="space-y-3">
                  {versions.map((version) => (
                    <li key={version.id} className="card p-4 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[180px]">
                        <div className="flex items-center gap-2">
                          {version.action === 'reset' ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">שחזור לברירת מחדל</span>
                          ) : (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400">שמירה</span>
                          )}
                          {version.model && (
                            <span className="text-[11px] text-neon-gray-400" dir="ltr">{version.model}</span>
                          )}
                        </div>
                        <p className="text-xs text-neon-gray-500 mt-1">
                          {version.savedAt ? version.savedAt.toLocaleString('he-IL') : '—'}
                          {version.savedByEmail ? ` · ${version.savedByEmail}` : ''}
                        </p>
                      </div>
                      {version.action === 'save' && version.systemPrompt && (
                        <button
                          onClick={() => loadVersion(version)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>טען לעורך</span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-neon-gray-500">
                "טען לעורך" מחזיר גרסה ישנה לעורך בלבד — היא תחזור לפעול רק אחרי "שמור".
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-dark-border">
          <button
            onClick={handleReset}
            disabled={saving || !hasOverride}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-neon-gray-300 bg-neon-gray-800 hover:bg-neon-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>שחזר לברירת מחדל</span>
          </button>
          <button
            onClick={handleSaveClick}
            disabled={saving || !dirty}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            <Save className="w-4 h-4" />
            <span>שמור</span>
          </button>
        </div>
      </div>

      {/* Save-warning confirmation (nested modal, same iron rules) */}
      {confirmOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setConfirmOpen(false)} />
          <div className="relative w-full max-w-md bg-dark-surface border border-dark-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white">עדכון מערכת</h3>
              </div>
              <button
                onClick={() => setConfirmOpen(false)}
                aria-label="סגור אזהרה"
                className="w-11 h-11 flex items-center justify-center rounded-xl text-neon-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-neon-gray-300">
              שמירת הפרומפט תעדכן <span className="text-amber-300 font-medium">מיידית</span> את התנהגות
              ה-AI בפרודקשן עבור "{def.titleHe}". הגרסה הנוכחית תישמר בהיסטוריה ותוכל לשחזר אותה.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-neon-gray-300 bg-neon-gray-800 hover:bg-neon-gray-700 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={handleConfirmedSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? 'שומר...' : 'שמור ועדכן מערכת'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

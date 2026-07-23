import { useState, useEffect } from 'react'
import {
  Bot,
  Save,
  RotateCcw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Braces,
  Maximize2,
  X,
} from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import {
  getAIPromptConfig,
  saveAIPromptConfig,
  resetAIPromptConfig,
  type AIPromptId,
} from '@/lib/firebase/aiPrompts'
import { AI_PROMPT_REGISTRY, type AIPromptDefinition } from '../data/aiPromptRegistry'

interface PromptState {
  systemPrompt: string
  model: string
  maxTokens: string
  hasOverride: boolean
  updatedAt: Date | null
  updatedByEmail: string | null
}

type PromptStateMap = Partial<Record<AIPromptId, PromptState>>

function toState(def: AIPromptDefinition, override: Awaited<ReturnType<typeof getAIPromptConfig>>): PromptState {
  const updatedAtRaw = override?.updatedAt as unknown
  const updatedAt =
    updatedAtRaw instanceof Date
      ? updatedAtRaw
      : updatedAtRaw && typeof (updatedAtRaw as { toDate?: () => Date }).toDate === 'function'
        ? (updatedAtRaw as { toDate: () => Date }).toDate()
        : null

  return {
    systemPrompt: override?.systemPrompt ?? def.defaultSystemPrompt,
    model: override?.model ?? def.defaultModel,
    maxTokens: String(override?.maxTokens ?? def.defaultMaxTokens),
    hasOverride: !!override,
    updatedAt,
    updatedByEmail: override?.updatedByEmail ?? null,
  }
}

export default function PromptLibrary() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [states, setStates] = useState<PromptStateMap>({})
  const [openId, setOpenId] = useState<AIPromptId | null>(null)
  const [savingId, setSavingId] = useState<AIPromptId | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<AIPromptId | null>(null)
  const [fullscreenId, setFullscreenId] = useState<AIPromptId | null>(null)

  // Close the fullscreen editor with Escape
  useEffect(() => {
    if (!fullscreenId) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreenId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreenId])

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const entries = await Promise.all(
        AI_PROMPT_REGISTRY.map(async (def) => {
          const override = await getAIPromptConfig(def.id)
          return [def.id, toState(def, override)] as const
        })
      )
      setStates(Object.fromEntries(entries))
    } catch (err) {
      console.error('Failed to load prompt library:', err)
      setLoadError('שגיאה בטעינת ספריית הפרומפטים')
    } finally {
      setLoading(false)
    }
  }

  const updateField = (id: AIPromptId, patch: Partial<PromptState>) => {
    setStates((prev) => ({ ...prev, [id]: { ...prev[id]!, ...patch } }))
    setSavedId(null)
  }

  const validate = (def: AIPromptDefinition, state: PromptState): string | null => {
    if (!state.systemPrompt.trim()) return 'הפרומפט לא יכול להיות ריק'
    if (!state.model.trim()) return 'שם המודל לא יכול להיות ריק'
    const tokens = Number(state.maxTokens)
    if (!Number.isFinite(tokens) || tokens <= 0) return 'maxTokens חייב להיות מספר חיובי'
    for (const variable of def.templateVariables) {
      if (!state.systemPrompt.includes(`{{${variable.name}}}`)) {
        return `הפרומפט חייב לכלול את המשתנה {{${variable.name}}} — הוא מוחלף אוטומטית בזמן ריצה`
      }
    }
    return null
  }

  const handleSave = async (def: AIPromptDefinition) => {
    const state = states[def.id]
    if (!state) return

    const validationError = validate(def, state)
    if (validationError) {
      setSaveError(`${def.titleHe}: ${validationError}`)
      return
    }

    setSavingId(def.id)
    setSaveError(null)
    setSavedId(null)
    try {
      await saveAIPromptConfig(
        def.id,
        {
          systemPrompt: state.systemPrompt,
          model: state.model.trim(),
          maxTokens: Math.floor(Number(state.maxTokens)),
        },
        user?.email || undefined
      )
      updateField(def.id, { hasOverride: true, updatedAt: new Date(), updatedByEmail: user?.email ?? null })
      setSavedId(def.id)
      setTimeout(() => setSavedId(null), 3000)
    } catch (err) {
      console.error('Failed to save prompt:', err)
      setSaveError(`שגיאה בשמירת "${def.titleHe}"`)
    } finally {
      setSavingId(null)
    }
  }

  const handleReset = async (def: AIPromptDefinition) => {
    const confirmed = window.confirm(
      `לשחזר את "${def.titleHe}" לברירת המחדל המובנית? הגרסה הערוכה תימחק.`
    )
    if (!confirmed) return

    setSavingId(def.id)
    setSaveError(null)
    try {
      await resetAIPromptConfig(def.id)
      setStates((prev) => ({ ...prev, [def.id]: toState(def, null) }))
    } catch (err) {
      console.error('Failed to reset prompt:', err)
      setSaveError(`שגיאה בשחזור "${def.titleHe}"`)
    } finally {
      setSavingId(null)
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
        <h1 className="text-2xl font-bold text-white">ספריית פרומפטים</h1>
        <p className="text-neon-gray-400 text-sm">
          כל הפרומפטים והמודלים שהמערכת משתמשת בהם. שמירה כאן מעדכנת מיידית את התנהגות ה-AI.
        </p>
      </div>

      {/* Global warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300 space-y-1">
          <p>שינוי פרומפט משפיע ישירות על התוצאות בפרודקשן. מומלץ לשנות בהדרגה ולבדוק את התוצאה.</p>
          <p>אל הפרומפט מצורפים אוטומטית נתוני זמן-ריצה (היסטוריה, תרגילים וכו') — הם לא ניתנים לעריכה כאן.</p>
        </div>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{loadError}</p>
        </div>
      )}
      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{saveError}</p>
        </div>
      )}

      {/* Prompt cards */}
      {AI_PROMPT_REGISTRY.map((def) => {
        const state = states[def.id]
        if (!state) return null
        const isOpen = openId === def.id
        const isSaving = savingId === def.id

        return (
          <div key={def.id} className="card overflow-hidden">
            {/* Card header (toggle) */}
            <button
              onClick={() => setOpenId(isOpen ? null : def.id)}
              className="w-full p-4 sm:p-6 flex items-start gap-3 text-right hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-white">{def.titleHe}</h2>
                  {state.hasOverride ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                      מותאם אישית
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-neon-gray-700 text-neon-gray-300">
                      ברירת מחדל
                    </span>
                  )}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300" dir="ltr">
                    {def.provider} · {state.model}
                  </span>
                </div>
                <p className="text-neon-gray-400 text-sm mt-1">{def.descriptionHe}</p>
                {state.hasOverride && state.updatedAt && (
                  <p className="text-neon-gray-500 text-xs mt-1">
                    עודכן לאחרונה: {state.updatedAt.toLocaleString('he-IL')}
                    {state.updatedByEmail ? ` · ${state.updatedByEmail}` : ''}
                  </p>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="w-5 h-5 text-neon-gray-400 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-neon-gray-400 flex-shrink-0" />
              )}
            </button>

            {/* Card body */}
            {isOpen && (
              <div className="px-4 sm:px-6 pb-6 space-y-4 border-t border-dark-border pt-4">
                {/* Model + maxTokens */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-neon-gray-400">מודל ({def.provider})</label>
                    <input
                      type="text"
                      value={state.model}
                      onChange={(e) => updateField(def.id, { model: e.target.value })}
                      className="input-primary w-full"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-neon-gray-400">מקסימום טוקנים בתשובה</label>
                    <input
                      type="number"
                      min={1}
                      value={state.maxTokens}
                      onChange={(e) => updateField(def.id, { maxTokens: e.target.value })}
                      className="input-primary w-full"
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Template variables */}
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

                {/* System prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-neon-gray-400">פרומפט מערכת (System Prompt)</label>
                    <button
                      onClick={() => setFullscreenId(def.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neon-gray-300 bg-neon-gray-800 hover:bg-neon-gray-700 transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>ערוך במסך מלא</span>
                    </button>
                  </div>
                  <textarea
                    value={state.systemPrompt}
                    onChange={(e) => updateField(def.id, { systemPrompt: e.target.value })}
                    className="input-primary w-full min-h-[320px] text-sm leading-relaxed resize-y"
                    dir="rtl"
                    aria-label={`פרומפט מערכת — ${def.titleHe}`}
                  />
                </div>

                {/* Runtime context info */}
                <div className="bg-neon-gray-800 rounded-lg p-3">
                  <p className="text-sm text-neon-gray-300 font-medium mb-1">
                    נתונים שמצורפים אוטומטית בזמן ריצה (לא ניתנים לעריכה):
                  </p>
                  <ul className="text-xs text-neon-gray-400 space-y-0.5 list-disc pr-4">
                    {def.runtimeContextHe.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-neon-gray-500 mt-2" dir="ltr">
                    {def.sourceFile}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    onClick={() => handleReset(def)}
                    disabled={isSaving || !state.hasOverride}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-neon-gray-300 bg-neon-gray-800 hover:bg-neon-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>שחזר לברירת מחדל</span>
                  </button>

                  <div className="flex items-center gap-3">
                    {savedId === def.id && (
                      <span className="text-sm text-green-400">נשמר בהצלחה ✓</span>
                    )}
                    <button
                      onClick={() => handleSave(def)}
                      disabled={isSaving}
                      className="btn-primary flex items-center gap-2"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>{isSaving ? 'שומר...' : 'שמור פרומפט'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Fullscreen prompt editor */}
      {fullscreenId && states[fullscreenId] && (() => {
        const def = AI_PROMPT_REGISTRY.find((d) => d.id === fullscreenId)!
        const state = states[fullscreenId]!
        const isSaving = savingId === fullscreenId

        return (
          <div className="fixed inset-0 z-50 bg-dark-bg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-dark-border flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-white truncate">{def.titleHe}</h2>
                  <p className="text-neon-gray-400 text-xs" dir="ltr">
                    {def.provider} · {state.model}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setFullscreenId(null)}
                aria-label="סגור מסך מלא"
                className="w-11 h-11 rounded-lg flex items-center justify-center text-neon-gray-300 hover:bg-white/10 transition-colors flex-shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Editor */}
            <textarea
              value={state.systemPrompt}
              onChange={(e) => updateField(fullscreenId, { systemPrompt: e.target.value })}
              className="input-primary flex-1 w-full rounded-none border-0 text-sm sm:text-base leading-relaxed resize-none p-4 sm:p-6"
              dir="rtl"
              aria-label={`פרומפט מערכת במסך מלא — ${def.titleHe}`}
            />

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-t border-dark-border flex-shrink-0">
              <button
                onClick={() => setFullscreenId(null)}
                className="px-4 py-2 rounded-lg text-sm text-neon-gray-300 bg-neon-gray-800 hover:bg-neon-gray-700 transition-colors"
              >
                חזרה
              </button>
              <div className="flex items-center gap-3">
                {savedId === fullscreenId && (
                  <span className="text-sm text-green-400">נשמר בהצלחה ✓</span>
                )}
                {saveError && <span className="text-sm text-red-400">{saveError}</span>}
                <button
                  onClick={() => handleSave(def)}
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSaving ? 'שומר...' : 'שמור פרומפט'}</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

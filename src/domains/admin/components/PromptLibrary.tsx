import { useState, useEffect } from 'react'
import { Bot, AlertCircle, ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { getAIPromptConfig, type AIPromptId } from '@/lib/firebase/aiPrompts'
import { AI_PROMPT_REGISTRY, type AIPromptDefinition } from '../data/aiPromptRegistry'
import PromptEditorModal from './PromptEditorModal'

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

  const openDef = openId ? AI_PROMPT_REGISTRY.find((d) => d.id === openId) ?? null : null
  const openState = openId ? states[openId] ?? null : null

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
          כל הפרומפטים והמודלים שהמערכת משתמשת בהם. לחיצה על פרומפט פותחת עורך מלא עם ייעוץ AI והיסטוריית שינויים.
        </p>
      </div>

      {/* Global warning */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-300 space-y-1">
          <p>שמירת פרומפט מעדכנת מיידית את התנהגות ה-AI בפרודקשן. כל שמירה נרשמת בהיסטוריה וניתנת לשחזור.</p>
        </div>
      </div>

      {/* Errors */}
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{loadError}</p>
        </div>
      )}

      {/* Prompt cards — clicking opens the full editor modal */}
      {AI_PROMPT_REGISTRY.map((def) => {
        const state = states[def.id]
        if (!state) return null

        return (
          <button
            key={def.id}
            onClick={() => setOpenId(def.id)}
            className="card w-full p-4 sm:p-6 flex items-start gap-3 text-right hover:bg-white/5 transition-colors"
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
            <ChevronLeft className="w-5 h-5 text-neon-gray-400 flex-shrink-0 self-center" />
          </button>
        )
      })}

      {/* Full editor modal */}
      {openDef && openState && (
        <PromptEditorModal
          def={openDef}
          initialSystemPrompt={openState.systemPrompt}
          initialModel={openState.model}
          initialMaxTokens={openState.maxTokens}
          hasOverride={openState.hasOverride}
          userEmail={user?.email || undefined}
          onClose={() => setOpenId(null)}
          onSaved={(saved) => {
            setStates((prev) => ({
              ...prev,
              [openDef.id]: {
                systemPrompt: saved.systemPrompt,
                model: saved.model,
                maxTokens: String(saved.maxTokens),
                hasOverride: true,
                updatedAt: new Date(),
                updatedByEmail: user?.email ?? null,
              },
            }))
          }}
          onReset={() => {
            setStates((prev) => ({ ...prev, [openDef.id]: toState(openDef, null) }))
            setOpenId(null)
          }}
        />
      )}
    </div>
  )
}

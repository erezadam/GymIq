/**
 * DraftPanel — top of ExerciseForm in create mode only.
 * Name field + "create AI draft" + machine-photo upload flow
 * (compress → upload → identifyMachine → existing-exercise gate).
 */

import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Sparkles } from 'lucide-react'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { useMachinePhoto } from '../machine-photo/useMachinePhoto'
import type { DraftPhotoInput } from '@/domains/admin/services/exerciseDraftService'
import type { DraftStatus } from '@/domains/admin/services/exerciseDraftService'
import { DRAFT_PANEL_STRINGS as S, EXISTING_MATCH_SCORE_THRESHOLD } from './constants'

interface DraftPanelProps {
  status: DraftStatus | null
  error: string | null
  generating: boolean
  onGenerateDraft: (input: { name?: string; photo?: DraftPhotoInput }) => void
}

export function DraftPanel({ status, error, generating, onGenerateDraft }: DraftPanelProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState(false)
  const [overrideExisting, setOverrideExisting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photo = useMachinePhoto()

  const photoResult = photo.result
  const existingMatch = photoResult?.matches.find(
    (m) => m.score >= EXISTING_MATCH_SCORE_THRESHOLD
  )
  const blockedByExisting = Boolean(existingMatch) && !overrideExisting

  // Fill the (editable) name from labelText only when no strong existing match.
  const effectiveName =
    name || (photoResult && !blockedByExisting ? photoResult.labelText : '')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setOverrideExisting(false)
    void photo.identify(file)
  }

  const handleGenerate = () => {
    const trimmed = effectiveName.trim()
    if (!trimmed && !photoResult) {
      setNameError(true)
      return
    }
    setNameError(false)
    const photoInput: DraftPhotoInput | undefined =
      photoResult && photo.storagePath
        ? {
            storagePath: photo.storagePath,
            labelText: photoResult.labelText,
            machineType: photoResult.machineType,
            equipmentId: photoResult.equipmentId,
            confidence: photoResult.confidence,
          }
        : undefined
    onGenerateDraft({ name: trimmed || undefined, photo: photoInput })
  }

  const busy = generating || status === 'pending'

  return (
    <section className="card-neon mb-8" dir="rtl">
      <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary-400" />
        {S.panelTitle}
      </h2>

      <label className="block text-sm font-medium text-text-secondary mb-2">
        {S.nameLabel}
      </label>
      <input
        value={effectiveName}
        onChange={(e) => setName(e.target.value)}
        placeholder={S.namePlaceholder}
        className={`input-neon w-full mb-2 ${nameError ? 'border-red-500' : ''}`}
      />
      {nameError && <p className="text-red-400 text-sm mb-2">{S.errorNameRequired}</p>}

      <div className="flex flex-wrap gap-3 mt-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy || blockedByExisting}
          className="btn-neon min-h-[44px] flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <LoadingSpinner size="sm" /> : <Sparkles className="w-4 h-4" />}
          {S.generateDraft}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy || photo.loading}
          className="min-h-[44px] px-4 flex items-center gap-2 rounded-lg border border-dark-border text-text-secondary hover:text-text-primary hover:border-primary-500/50 transition-colors disabled:opacity-50"
        >
          <Camera className="w-4 h-4" />
          {S.uploadPhoto}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          aria-hidden="true"
        />
      </div>

      {photo.loading && (
        <p className="mt-3 text-sm text-on-surface-variant animate-pulse">{S.identifying}</p>
      )}
      {photo.error && <p className="mt-3 text-sm text-red-400">{photo.error}</p>}

      {photoResult && (
        <div className="mt-4 rounded-xl bg-dark-card border border-dark-border p-3">
          <p className="text-sm font-semibold text-text-primary">
            {S.identifiedPrefix} {photoResult.labelText} · {photoResult.machineType}
          </p>

          {existingMatch && !overrideExisting ? (
            <div className="mt-3">
              <p className="text-sm text-amber-400 font-semibold mb-2">{S.alreadyExists}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/admin/exercises/${existingMatch.id}/edit`}
                  className="min-h-[44px] px-4 flex items-center rounded-lg bg-primary-500/20 text-primary-400 font-semibold hover:bg-primary-500/30 transition-colors"
                >
                  {S.editExisting}: {existingMatch.nameHe}
                </Link>
                <button
                  type="button"
                  onClick={() => setOverrideExisting(true)}
                  className="min-h-[44px] px-4 rounded-lg border border-dark-border text-text-secondary hover:text-text-primary transition-colors"
                >
                  {S.createAnyway}
                </button>
              </div>
            </div>
          ) : (
            photoResult.matches.length > 0 && (
              <ul className="mt-2 space-y-1">
                {photoResult.matches.slice(0, 3).map((m) => (
                  <li key={m.id} className="text-xs text-on-surface-variant">
                    {m.nameHe}
                    {m.reasons.length > 0 ? ` — ${m.reasons.join(' · ')}` : ''}
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}

      {status === 'pending' && (
        <p className="mt-4 text-sm text-on-surface-variant animate-pulse">{S.draftPending}</p>
      )}
      {(status === 'draft_ready' || status === 'image_pending' || status === 'image_ready') && (
        <p className="mt-4 text-sm text-emerald-500 font-semibold">{S.draftReady}</p>
      )}
      {error && <p className="mt-4 text-sm text-red-400 font-semibold">{error}</p>}
    </section>
  )
}

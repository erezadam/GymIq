import { useState } from 'react'
import { X } from 'lucide-react'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'
import type { MachineLensResponse } from '@/domains/exercises/services/machineLensService'
import { MACHINE_LENS_STRINGS as S } from './constants'

interface MachineLensSheetProps {
  isOpen: boolean
  loading: boolean
  error: string | null
  result: MachineLensResponse | null
  onClose: () => void
  onSelectExercise: (exerciseId: string) => void
}

/**
 * Bottom sheet showing machine identification results.
 * Iron rules: dedicated 44x44 X button + backdrop click closes.
 */
export function MachineLensSheet({
  isOpen,
  loading,
  error,
  result,
  onClose,
  onSelectExercise,
}: MachineLensSheetProps) {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCopy = () => {
    if (result?.labelText) {
      void navigator.clipboard?.writeText(result.labelText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const headline = result
    ? result.labelText
      ? `${S.identifiedPrefix} ${result.labelText}`
      : result.machineType
    : ''

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
      data-testid="machine-lens-backdrop"
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-t-2xl bg-surface-container p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={S.sheetTitle}
      >
        {/* Header with dedicated X close button (44x44) */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">{S.sheetTitle}</h2>
          <button
            onClick={onClose}
            aria-label={S.close}
            className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading && (
          <div className="py-10 text-center text-on-surface-variant animate-pulse">
            {S.loading}
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center text-status-error font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && result && (
          <>
            {headline && (
              <p className="mb-1 text-base font-semibold text-white">{headline}</p>
            )}
            {result.labelText && result.machineType && (
              <p className="mb-3 text-sm text-on-surface-variant">{result.machineType}</p>
            )}

            {result.matches.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {result.matches.map((match) => (
                  <li key={match.id}>
                    <button
                      onClick={() => onSelectExercise(match.id)}
                      className="w-full min-h-[44px] flex items-center gap-3 rounded-xl bg-white/5 p-2 text-right hover:bg-white/10 transition-colors"
                    >
                      <ExerciseMedia
                        imageUrl={match.imageUrl}
                        exerciseName={match.name}
                        alt={match.nameHe}
                        variant="thumbnail"
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      />
                      <span className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-white truncate">
                          {match.nameHe}
                        </span>
                        {match.reasons.length > 0 && (
                          <span className="text-xs text-on-surface-variant truncate">
                            {match.reasons.join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-6 text-center">
                <p className="mb-2 text-on-surface-variant">{S.noMatches}</p>
                {result.labelText && (
                  <>
                    <p className="mb-3 text-white font-semibold">{result.labelText}</p>
                    <button
                      onClick={handleCopy}
                      className="min-h-[44px] px-5 rounded-xl bg-primary/20 text-primary font-semibold hover:bg-primary/30 transition-colors"
                    >
                      {copied ? S.copied : S.copyName}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

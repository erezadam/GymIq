/**
 * ImageGate — draft-mode image generation block inside the form's image section.
 * "Generate image" → generateExerciseImage → spinner (~1–2 min, live via
 * onSnapshot) → image_ready: preview + approve (fills imageUrl) / regenerate.
 */

import { ImagePlus, RefreshCw, Check } from 'lucide-react'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import type { DraftImage, DraftStatus } from '@/domains/admin/services/exerciseDraftService'
import { DRAFT_PANEL_STRINGS as S } from './constants'

interface ImageGateProps {
  status: DraftStatus | null
  image: DraftImage | null
  // True from the click until the callable resolves — covers the window
  // before onSnapshot flips the doc to image_pending (the 4x-click incident).
  imageGenerating: boolean
  // The form's imageUrl already holds the approved value.
  approved: boolean
  onGenerate: (regenerate?: boolean) => void
  onApprove: (url: string) => void
}

export function ImageGate({ status, image, imageGenerating, approved, onGenerate, onApprove }: ImageGateProps) {
  const pending = imageGenerating || status === 'image_pending'
  const ready = !pending && status === 'image_ready' && Boolean(image?.url)

  return (
    <div className="mb-6 rounded-xl bg-dark-card/50 border border-dark-border p-4" dir="rtl">
      <p className="text-sm font-medium text-text-secondary mb-3">{S.imageGateTitle}</p>

      {!pending && !ready && (
        <button
          type="button"
          onClick={() => onGenerate()}
          disabled={imageGenerating}
          className="min-h-[44px] px-4 flex items-center gap-2 rounded-lg bg-primary-500/20 text-primary-400 font-semibold hover:bg-primary-500/30 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          <ImagePlus className="w-4 h-4" />
          {S.generateImage}
        </button>
      )}

      {pending && (
        <div className="flex items-center gap-3 text-on-surface-variant">
          <LoadingSpinner size="sm" />
          <span className="text-sm animate-pulse">{S.imagePending}</span>
        </div>
      )}

      {ready && image && (
        <div>
          <img
            src={image.url}
            alt={S.imageGateTitle}
            className="w-full max-w-sm rounded-xl border border-dark-border mb-3"
          />
          <div className="flex flex-wrap gap-3">
            {approved ? (
              <span className="min-h-[44px] px-4 flex items-center gap-2 rounded-lg bg-green-500/20 text-green-400 font-semibold">
                <Check className="w-4 h-4" />
                {S.imageApproved}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onApprove(image.url)}
                className="btn-neon min-h-[44px] flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {S.approveImage}
              </button>
            )}
            <button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={imageGenerating}
              className="min-h-[44px] px-4 flex items-center gap-2 rounded-lg border border-dark-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <RefreshCw className="w-4 h-4" />
              {S.regenerateImage}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

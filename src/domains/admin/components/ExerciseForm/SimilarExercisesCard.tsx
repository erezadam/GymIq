/**
 * SimilarExercisesCard — up to 3 similar existing exercises from the draft,
 * each a link that opens the edit screen in a new tab.
 */

import { ExternalLink } from 'lucide-react'
import type { SimilarDraftMatch } from '@/domains/admin/services/exerciseDraftService'
import { DRAFT_PANEL_STRINGS as S } from './constants'

interface SimilarExercisesCardProps {
  similar: SimilarDraftMatch[]
}

export function SimilarExercisesCard({ similar }: SimilarExercisesCardProps) {
  if (similar.length === 0) return null

  return (
    <section className="card-neon" dir="rtl">
      <h2 className="text-lg font-semibold text-text-primary mb-4">{S.similarTitle}</h2>
      <ul className="space-y-2">
        {similar.slice(0, 3).map((match) => (
          <li key={match.id}>
            <a
              href={`/admin/exercises/${match.id}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              title={S.openInNewTab}
              className="min-h-[44px] flex items-center gap-3 rounded-xl bg-dark-card border border-dark-border p-3 hover:border-primary-500/50 transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-primary-400 flex-shrink-0" />
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-semibold text-text-primary truncate">
                  {match.nameHe} ({match.name})
                </span>
                {match.reasons.length > 0 && (
                  <span className="text-xs text-on-surface-variant truncate">
                    {match.reasons.join(' · ')}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
}

export function EmptyState({ title, description, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-container-low flex items-center justify-center mb-3">
        {icon ?? <Inbox className="w-6 h-6 text-on-surface-variant" />}
      </div>
      <p className="text-on-surface font-medium">{title}</p>
      {description && (
        <p className="text-base text-on-surface-variant mt-1 max-w-sm">{description}</p>
      )}
    </div>
  )
}

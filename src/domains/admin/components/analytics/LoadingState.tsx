interface LoadingStateProps {
  label?: string
  rows?: number
}

export function LoadingState({ label = 'טוען נתונים...', rows = 3 }: LoadingStateProps) {
  return (
    <div className="space-y-3">
      <p className="text-base text-on-surface-variant">{label}</p>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-surface-container-low animate-pulse"
          />
        ))}
      </div>
    </div>
  )
}

interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ fullScreen = false, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  }

  const spinner = (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-dark-border" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-blue animate-spin" />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-bg flex items-center justify-center z-50">
        <div className="flex flex-col items-center gap-4">
          {spinner}
          <span className="text-text-secondary animate-pulse">טוען...</span>
        </div>
      </div>
    )
  }

  return spinner
}

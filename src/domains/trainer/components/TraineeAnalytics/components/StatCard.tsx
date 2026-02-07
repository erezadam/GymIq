interface StatCardProps {
  value: string | number
  label: string
  trend?: string
  trendDirection?: 'up' | 'down' | 'neutral'
  variant?: 'default' | 'highlight' | 'warning' | 'success'
}

const variantClasses: Record<string, string> = {
  default: 'border-dark-border',
  highlight: 'border-primary-main/40 bg-gradient-to-br from-primary-main/10 to-primary-main/5',
  warning: 'border-accent-orange/40 bg-gradient-to-br from-accent-orange/10 to-accent-orange/5',
  success: 'border-status-success/40 bg-gradient-to-br from-status-success/10 to-status-success/5',
}

const valueColors: Record<string, string> = {
  default: 'text-primary-main',
  highlight: 'text-primary-main',
  warning: 'text-accent-orange',
  success: 'text-status-success',
}

const trendColors: Record<string, string> = {
  up: 'text-status-success',
  down: 'text-status-error',
  neutral: 'text-text-muted',
}

export function StatCard({ value, label, trend, trendDirection = 'neutral', variant = 'default' }: StatCardProps) {
  return (
    <div className={`bg-dark-card/80 border rounded-2xl p-4 text-center ${variantClasses[variant]}`}>
      <div className={`text-2xl font-extrabold mb-0.5 ${valueColors[variant]}`}>
        {value}
      </div>
      <p className="text-text-muted text-xs">{label}</p>
      {trend && (
        <p className={`text-[11px] mt-1.5 flex items-center justify-center gap-1 ${trendColors[trendDirection]}`}>
          {trend}
        </p>
      )}
    </div>
  )
}

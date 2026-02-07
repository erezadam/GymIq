import type { AIInsight } from '@/domains/trainer/hooks/useTraineeAnalytics'

interface AIInsightsProps {
  insights: AIInsight[]
}

export function AIInsights({ insights }: AIInsightsProps) {
  if (insights.length === 0) return null

  return (
    <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-2xl p-4 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-purple-700 flex items-center justify-center text-base">
          🤖
        </div>
        <span className="text-sm font-semibold text-accent-purple">תובנות AI למאמן</span>
      </div>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="bg-dark-card/80 rounded-xl p-3">
            <div className="text-[13px] font-semibold mb-1 flex items-center gap-1.5">
              <span>{insight.icon}</span>
              <span className="text-text-primary">{insight.title}</span>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

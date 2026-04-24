import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useEffectiveUser } from '@/domains/authentication/hooks/useEffectiveUser'
import { getUserWorkoutStats } from '@/lib/firebase/workoutHistory'
import { getExternalComparisonUrl } from '@/lib/firebase/appSettings'
import { useVersionCheck } from '@/shared/hooks/useVersionCheck'
import { colors, spacing, borderRadius, typography } from '@/styles/theme'
import AITrainerModal from '@/domains/workouts/components/ai-trainer/AITrainerModal'
import SelectTrainerPrompt from '@/domains/trainee-onboarding/components/SelectTrainerPrompt'

// Initial stats (will be replaced with Firebase data)
const defaultStats = {
  totalWorkouts: 0,
  thisWeek: 0,
  thisMonth: 0,
  currentStreak: 0,
}

// Card styles
const cardBase = {
  flex: 1,
  borderRadius: borderRadius.lg,
  padding: '14px 12px',
  textAlign: 'center' as const,
}

const statCardStyles = {
  streak: {
    background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.15) 0%, rgba(255, 107, 53, 0.05) 100%)',
    border: '1px solid rgba(255, 107, 53, 0.2)',
    valueColor: colors.accent.orange,
  },
  weekly: {
    background: 'linear-gradient(135deg, rgba(196, 160, 82, 0.15) 0%, rgba(196, 160, 82, 0.05) 100%)',
    border: '1px solid rgba(196, 160, 82, 0.2)',
    valueColor: colors.accent.gold,
  },
  total: {
    background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.15) 0%, rgba(45, 212, 191, 0.05) 100%)',
    border: '1px solid rgba(45, 212, 191, 0.2)',
    valueColor: colors.primary.main,
  },
}

const actionCardStyles = {
  primary: {
    background: `linear-gradient(135deg, ${colors.primary.main} 0%, ${colors.primary.dark} 100%)`,
    boxShadow: '0 4px 20px rgba(45, 212, 191, 0.3)',
    titleColor: colors.text.inverse,
    subtitleColor: 'rgba(10, 15, 20, 0.6)',
    iconBg: 'rgba(255, 255, 255, 0.2)',
  },
  secondary: {
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    titleColor: colors.accent.purple,
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(139, 92, 246, 0.2)',
  },
  trophy: {
    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
    border: '1px solid rgba(234, 179, 8, 0.2)',
    titleColor: '#EAB308',
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(234, 179, 8, 0.2)',
  },
  comparison: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    titleColor: '#3B82F6',
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(59, 130, 246, 0.2)',
  },
  aiTrainer: {
    background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(139, 92, 246, 0.15) 100%)',
    border: '1px solid rgba(236, 72, 153, 0.3)',
    titleColor: colors.accent.pink,
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(236, 72, 153, 0.2)',
    boxShadow: '0 4px 20px rgba(236, 72, 153, 0.2)',
  },
  trainerCube: {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    titleColor: '#3B82F6',
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(59, 130, 246, 0.2)',
  },
  recommendations: {
    background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
    border: '1px solid rgba(234, 179, 8, 0.2)',
    titleColor: '#EAB308',
    subtitleColor: colors.text.secondary,
    iconBg: 'rgba(234, 179, 8, 0.2)',
  },
}

// Get current week range (Sunday-Saturday) in D/M-D/M format
function getWeekRange(): string {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const sunday = new Date(now)
  sunday.setDate(now.getDate() - dayOfWeek)
  const saturday = new Date(sunday)
  saturday.setDate(sunday.getDate() + 6)
  return `${sunday.getDate()}/${sunday.getMonth() + 1}-${saturday.getDate()}/${saturday.getMonth() + 1}`
}

export default function UserDashboard() {
  const user = useEffectiveUser()
  const navigate = useNavigate()
  const weekRange = getWeekRange()
  const [userStats, setUserStats] = useState(defaultStats)
  const [isLoading, setIsLoading] = useState(true)
  const [externalUrl, setExternalUrl] = useState<string | null>(null)
  const { currentVersion, performUpdate } = useVersionCheck()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showAITrainerModal, setShowAITrainerModal] = useState(false)

  // Force refresh function
  const handleForceRefresh = async () => {
    setIsRefreshing(true)
    try {
      await performUpdate()
    } catch (error) {
      console.error('Failed to refresh:', error)
      setIsRefreshing(false)
    }
  }

  // Fetch user stats and external URL from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) {
        setIsLoading(false)
        return
      }

      try {
        // Fetch stats and external URL in parallel
        const [stats, url] = await Promise.all([
          getUserWorkoutStats(user.uid),
          getExternalComparisonUrl(),
        ])

        setUserStats({
          totalWorkouts: stats.totalWorkouts,
          thisWeek: stats.thisWeekWorkouts,
          thisMonth: stats.thisMonthWorkouts,
          currentStreak: stats.currentStreak,
        })
        setExternalUrl(url)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.uid])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: `0 ${spacing.lg}px`,
        direction: 'rtl',
      }}
    >
      {/* Trainer selection prompt (trainees without a trainer) */}
      <SelectTrainerPrompt />

      {/* Welcome Section */}
      <div
        style={{
          textAlign: 'center',
          paddingTop: spacing.lg,
          marginBottom: spacing.xl,
        }}
      >
        <h1
          style={{
            fontSize: typography.fontSize['2xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.text.primary,
            marginBottom: spacing.xs,
          }}
        >
          שלום, <span style={{ color: colors.primary.main }}>{user?.firstName || 'מתאמן'}</span>! 👋
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: typography.fontSize.base }}>
          מוכן לאימון מעולה?
        </p>
      </div>

      {/* Stats Row - 3 cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {/* Streak Card */}
        <div style={{ ...cardBase, ...statCardStyles.streak }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>🔥</div>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: statCardStyles.streak.valueColor,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? '-' : userStats.currentStreak}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
            ימי רצף
          </div>
        </div>

        {/* Weekly Card */}
        <div style={{ ...cardBase, ...statCardStyles.weekly }}>
          <div
            style={{
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: statCardStyles.weekly.valueColor,
              marginBottom: 4,
            }}
          >
            {weekRange}
          </div>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: statCardStyles.weekly.valueColor,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? '-' : userStats.thisWeek}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
            השבוע
          </div>
        </div>

        {/* Total Card */}
        <div style={{ ...cardBase, ...statCardStyles.total }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>💪</div>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: statCardStyles.total.valueColor,
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            {isLoading ? '-' : userStats.thisMonth}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
            אימונים חודש
          </div>
        </div>
      </div>

      {/* Action Cards Row - 3 cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {/* Primary CTA - Build Workout */}
        <Link to="/exercises" style={{ ...cardBase, ...actionCardStyles.primary, textDecoration: 'none' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.sm,
              background: actionCardStyles.primary.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: 18,
            }}
          >
            🏋️
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              color: actionCardStyles.primary.titleColor,
            }}
          >
            בנה אימון
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: actionCardStyles.primary.subtitleColor,
            }}
          >
            חופשי
          </div>
        </Link>

        {/* Secondary - Training Programs */}
        <Link to="/workout/history" style={{ ...cardBase, ...actionCardStyles.secondary, textDecoration: 'none' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.sm,
              background: actionCardStyles.secondary.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: 18,
            }}
          >
            📋
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              color: actionCardStyles.secondary.titleColor,
            }}
          >
            תוכניות
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: actionCardStyles.secondary.subtitleColor,
            }}
          >
            אימונים
          </div>
        </Link>

        {/* Trophy - Personal Records */}
        <Link to="/personal-records" style={{ ...cardBase, ...actionCardStyles.trophy, textDecoration: 'none' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.sm,
              background: actionCardStyles.trophy.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: 18,
            }}
          >
            🏆
          </div>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: actionCardStyles.trophy.titleColor,
            }}
          >
            Pr
          </div>
        </Link>
      </div>

      {/* Bottom Row - 3 cubes: AI Trainer, Trainer Interface, Recommendations */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        {/* AI Trainer Cube */}
        <button
          onClick={() => setShowAITrainerModal(true)}
          style={{
            ...cardBase,
            ...actionCardStyles.aiTrainer,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.sm,
              background: actionCardStyles.aiTrainer.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: 18,
            }}
          >
            🤖
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              color: actionCardStyles.aiTrainer.titleColor,
            }}
          >
            מאמן AI
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: actionCardStyles.aiTrainer.subtitleColor,
            }}
          >
            אימון מותאם
          </div>
        </button>

        {/* Trainer Interface Cube */}
        {(user?.role === 'trainer' || user?.role === 'admin') ? (
          <Link to="/trainer" style={{ ...cardBase, ...actionCardStyles.trainerCube, textDecoration: 'none' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: borderRadius.sm,
                background: actionCardStyles.trainerCube.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 18,
              }}
            >
              👥
            </div>
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                color: actionCardStyles.trainerCube.titleColor,
              }}
            >
              ממשק מאמן
            </div>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: actionCardStyles.trainerCube.subtitleColor,
              }}
            >
              ניהול מתאמנים
            </div>
          </Link>
        ) : (
          <div style={{ ...cardBase, ...actionCardStyles.trainerCube, opacity: 0.4 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: borderRadius.sm,
                background: actionCardStyles.trainerCube.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 18,
              }}
            >
              👥
            </div>
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                color: actionCardStyles.trainerCube.titleColor,
              }}
            >
              ממשק מאמן
            </div>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: actionCardStyles.trainerCube.subtitleColor,
              }}
            >
              למאמנים
            </div>
          </div>
        )}

        {/* Analysis Cube */}
        <button
          onClick={() => navigate('/analysis')}
          style={{
            ...cardBase,
            ...actionCardStyles.recommendations,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: borderRadius.sm,
              background: actionCardStyles.recommendations.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              fontSize: 18,
            }}
          >
            ⭐
          </div>
          <div
            style={{
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.bold,
              color: actionCardStyles.recommendations.titleColor,
            }}
          >
            ניתוח AI
          </div>
          <div
            style={{
              fontSize: typography.fontSize.xs,
              color: actionCardStyles.recommendations.subtitleColor,
            }}
          >
            תובנות אישיות
          </div>
        </button>
      </div>


      {/* International Comparison Card - Only shown if URL is configured */}
      {externalUrl && (
        <div style={{ display: 'flex', gap: 10 }}>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...cardBase,
              ...actionCardStyles.comparison,
              cursor: 'pointer',
              width: '100%',
              textDecoration: 'none',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: borderRadius.sm,
                background: actionCardStyles.comparison.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 18,
              }}
            >
              🌍
            </div>
            <div
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.bold,
                color: actionCardStyles.comparison.titleColor,
              }}
            >
              נתוני השוואה בין לאומית
            </div>
            <div
              style={{
                fontSize: typography.fontSize.xs,
                color: actionCardStyles.comparison.subtitleColor,
              }}
            >
              צפה בנתונים
            </div>
          </a>
        </div>
      )}

      {/* What's New link — always available, even after the auto-popup has been dismissed */}
      <Link
        to="/whats-new"
        className="mt-8 mx-auto flex items-center justify-center gap-2 w-full max-w-xs px-4 h-11 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors text-sm"
      >
        <span className="text-lg leading-none">🎁</span>
        <span>מה חדש באפליקציה?</span>
      </Link>

      {/* Version & Refresh Section */}
      <div
        style={{
          marginTop: spacing.xl,
          paddingBottom: spacing.lg,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: spacing.md,
        }}
      >
        <span style={{ fontSize: typography.fontSize.xs, color: colors.text.muted }}>
          גרסה {currentVersion || '...'}
        </span>
        <button
          onClick={handleForceRefresh}
          disabled={isRefreshing}
          style={{
            padding: `${spacing.xs}px ${spacing.md}px`,
            fontSize: typography.fontSize.xs,
            color: colors.primary.main,
            background: 'transparent',
            border: `1px solid ${colors.primary.main}`,
            borderRadius: borderRadius.sm,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            opacity: isRefreshing ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          {isRefreshing ? '⏳' : '🔄'} {isRefreshing ? 'מרענן...' : 'בדוק עדכונים'}
        </button>
      </div>

      {/* AI Trainer Modal */}
      <AITrainerModal
        isOpen={showAITrainerModal}
        onClose={() => setShowAITrainerModal(false)}
      />
    </div>
  )
}

import { Link } from 'react-router-dom'
import { useAuthStore } from '@/domains/authentication/store'
import { colors, spacing, borderRadius, typography } from '@/styles/theme'

// User stats - will be fetched from Firebase later
const userStats = {
  totalWorkouts: 47,
  thisWeek: 4,
  currentStreak: 12,
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
}

export default function UserDashboard() {
  const { user } = useAuthStore()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 'calc(100vh - 10rem)',
        padding: `0 ${spacing.lg}px`,
        direction: 'rtl',
      }}
    >
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
            }}
          >
            {userStats.currentStreak}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
            ימי רצף
          </div>
        </div>

        {/* Weekly Card */}
        <div style={{ ...cardBase, ...statCardStyles.weekly }}>
          <div style={{ fontSize: 20, marginBottom: 4 }}>📅</div>
          <div
            style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.bold,
              color: statCardStyles.weekly.valueColor,
            }}
          >
            {userStats.thisWeek}
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
            }}
          >
            {userStats.totalWorkouts}
          </div>
          <div style={{ fontSize: typography.fontSize.xs, color: colors.text.secondary }}>
            אימונים
          </div>
        </div>
      </div>

      {/* Action Cards Row - 2 cards, SAME SIZE as stats */}
      <div style={{ display: 'flex', gap: 10 }}>
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
      </div>
    </div>
  )
}

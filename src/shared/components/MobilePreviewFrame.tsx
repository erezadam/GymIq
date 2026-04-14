import { type ReactNode } from 'react'
import { useUIStore } from '@/shared/store/uiStore'
import { colors, spacing } from '@/styles/theme'

interface MobilePreviewFrameProps {
  children: ReactNode
}

/**
 * Wraps children in a phone-shaped frame (max-width 390px, rounded, shadow)
 * when the user has toggled "mobile preview" mode on. Otherwise passes
 * through transparently. Used across MainLayout, TrainerLayout, AdminLayout
 * so one toggle applies to every route.
 */
export function MobilePreviewFrame({ children }: MobilePreviewFrameProps) {
  const mobilePreview = useUIStore((s) => s.mobilePreview)
  if (!mobilePreview) return <>{children}</>

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: spacing.lg,
        background: colors.background.main,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 32,
          border: `1px solid ${colors.border.default}`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          background: colors.background.card,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}
